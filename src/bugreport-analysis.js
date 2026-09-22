const Bugreport = (() => {
  'use strict';
  const DURATION_FOOTER_RE = /^[\d.]+s was the duration of/i;

  const LOGCAT_LINE_RE = /^\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}/;
  const PROCESS_LINE_RE = /Process:\s*([\w.:]+)/;


  const FAULT_ADDR_RE = /fault addr\s+(0x[0-9a-fA-F]+)/;
  const ABORT_MSG_RE = /Abort message:\s*'([^']*)'/;
  // Captures path plus the rest of the line raw, rather than trying to bound
  // the symbol's own parentheses: C++ symbols routinely contain their own
  // "()" (e.g. "std::terminate()+80"), which breaks a naive [^)]* capture.
  const BACKTRACE_FRAME_RE = /^\s*#(\d+)\s+pc\s+([0-9a-fA-F]+)\s+(\S+)(.*)$/gm;
  // Best-effort: dumpsys usagestats event dumps vary by Android version, but
  // most print a quoted timestamp plus a type=/package= pair on the line.
  const USAGESTATS_EVENT_RE = /time="(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})"[^\n]*?type=(\S+)(?:[^\n]*?package=(\S+))?/g;

  // Processes where a native crash is more consequential than an ordinary
  // app crash: privileged core services, media/codec parsers (classic
  // exploitation targets), and messaging apps (common delivery vector).
  const SENSITIVE_PROCESS_PATTERNS = [
    { re: /^system_server$/i, label: "system_server (privileged core process)" },
    { re: /bluetooth/i, label: "Bluetooth stack" },
    { re: /(media|codec|omx|extractor|heic|heif)/i, label: "media/codec parsing process" },
    { re: /nfc/i, label: "NFC stack" },
    { re: /(telephony|rild|radio)/i, label: "telephony/radio stack" },
    { re: /(whatsapp|telegram|securesms|messenger|wechat|\bmms\b|\bsms\b|hangouts|viber)/i, label: "messaging app" },
  ];

  const WAKELOCK_RE = /^\s*(Kernel )?Wake\s*lock\s+(.+?):\s+((?:\d+(?:ms|h|m|s)\s*)+)\s*\((\d+) times?\)/gmi;
  const WAKELOCK_UID_TAG_RE = /^(u\d+_?a\d+|\d+)\s+(.*)$/;
  const DURATION_PART_RE = /(\d+)(ms|h|m|s)/g;

  const LOW_MEM_RE = /(Low on memory|lowmemorykiller.*\bkill(?:ing|ed)\b|Out of memory).*/gi;
  const BENIGN_MEM_RE = /enough memory|disable killing/i;

  const OOM_KILL_RE = /Kill(?:ing)? '([\w.:]+)'.*?to free.*/gi;
  const FRAME_DROP_RE = /Skipped (\d+) frames!\s*The application may be doing too much work/g;
  const TOTAL_BATTERY_RE = /^\s*Time on battery:\s*((?:\d+(?:ms|h|m|s)\s*)+)(?:\(|realtime|$)/mi;

  // Stalkerware / surveillance-app correlation

  const PKG_HEADER_RE = /^\s*Package \[([\w.]+)\]/;
  const REQ_PERMS_HEADER_RE = /requested permissions:/i;
  const RUNTIME_PERMS_HEADER_RE = /runtime permissions:/i;
  const CODEPATH_RE = /codePath=(\S+)/;
  const PKG_FLAGS_RE = /(?:pkgFlags|flags)=\[([^\]]*)\]/;
  const PERM_LINE_RE = /^\s*([\w.]+\.permission\.[A-Z0-9_]+)\s*(?::\s*granted=(true|false))?/;
  const COMPONENT_INFO_RE = /ComponentInfo\{([\w.]+)\/[\w.$]+\}/g;
  const ENABLED_A11Y_SETTING_RE = /enabled_accessibility_services\s*[:=]\s*([^\n]+)/i;
  const WHITELIST_PKG_LINE_RE = /^\s*(?:\d+:)?([a-zA-Z][\w]*(?:\.[\w]+){2,})\s*$/;

  // commercial "stalkerware" 
  const KNOWN_STALKERWARE_PATTERNS = [
    { re: /mspy/i, label: "mSpy-family" },
    { re: /flexispy/i, label: "FlexiSpy-family" },
    { re: /(thetruthspy|truthspy)/i, label: "TheTruthSpy-family" },
    { re: /(cocospy|spyic|spyzie)/i, label: "Cocospy/Spyic/Spyzie shared codebase" },
    { re: /xnspy/i, label: "XNSPY-family" },
    { re: /hoverwatch/i, label: "Hoverwatch-family" },
    { re: /highster/i, label: "Highster Mobile-family" },
    { re: /spybubble/i, label: "SpyBubble-family" },
    { re: /familyorbit/i, label: "Family Orbit-family" },
    { re: /\bcerberus\b/i, label: "Cerberus anti-theft/monitoring-family" },
    { re: /\beyezy\b/i, label: "Eyezy-family" },
    { re: /\bwebwatcher\b/i, label: "WebWatcher-family" },
    { re: /mobistealth/i, label: "mobistealth-family" },
    { re: /\bspyera\b/i, label: "Spyera-family" },
    { re: /kidsguard/i, label: "KidsGuard-family" },
    { re: /\bminspy\b/i, label: "Minspy-family" },
    { re: /letmespy/i, label: "LetMeSpy-family" },
  ];

  const SPECIAL_ACCESS_PERMISSIONS = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.PACKAGE_USAGE_STATS",
    "android.permission.WRITE_SECURE_SETTINGS",
    "android.permission.BIND_ACCESSIBILITY_SERVICE",
    "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
    "android.permission.BIND_DEVICE_ADMIN",
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
  ];

  // monitoring tool.
  const DANGEROUS_PERMISSION_GROUPS = {
    audio_visual: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
    location: ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"],
    messages_calls: ["android.permission.READ_SMS", "android.permission.RECEIVE_SMS", "android.permission.READ_CALL_LOG", "android.permission.PROCESS_OUTGOING_CALLS", "android.permission.ANSWER_PHONE_CALLS"],
    contacts: ["android.permission.READ_CONTACTS"],
  };

  // ---------------------------------------------------------------------
  // Section splitting
  // ---------------------------------------------------------------------
function splitSections(text) {
  const matches = [...text.matchAll(/^-{6}\s+(.+?)\s+-{6}(?:[^\n]*)/gm)]
    .filter(m => !DURATION_FOOTER_RE.test(m[1]));
  const sections = Object.create(null);
  if (!matches.length) { sections.FULL_TEXT = text; return sections; }
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i], name = m[1].trim();
    sections[name] = (sections[name] || '') + text.slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length);
  }
  return sections;
}


  function getSectionsByFragment(sections, fragments) {
    const out = [];
    for (const name of Object.keys(sections)) {
      const lname = name.toLowerCase();
      if (fragments.some((f) => lname.includes(f.toLowerCase()))) {
        out.push([name, sections[name]]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Raw-text Java crash and ANR evidence with original source positions
  // ---------------------------------------------------------------------
  function findJavaCrashes(lines, candidates) {
    const results = [];
    for (const candidate of candidates) {
      const i = candidate.line - 1;
      if (/\bFATAL EXCEPTION\s*:/.test(lines[i])) {
        const block = [lines[i]];
        let j = i + 1;
        // Stay in the original source: filtering and joining lines can join
        // unrelated blocks and destroys source locations.
        while (j < Math.min(lines.length, i + 60)) {
          const ln = lines[j];
          if (/\bFATAL EXCEPTION\s*:/.test(ln) || Logcat.parseLine(ln)) break;
          if (/^\s*(?:Process:|Caused by:|Suppressed:|at\s+|\.\.\. \d+ more|[\w.$]+(?:Exception|Error)(?::|$))/.test(ln)) {
            block.push(ln);
            j++;
          } else {
            break;
          }
        }
        const blockText = block.join("\n");
        const procM = PROCESS_LINE_RE.exec(blockText);
        const reason = [...blockText.matchAll(/Caused by:\s*([^\n]+)/g)].pop()?.[1]
          || /([\w.$]+(?:Exception|Error):[^\n]*)/.exec(blockText)?.[1]
          || lines[i].trim();
        results.push({
          process: procM ? procM[1] : "unknown",
          summary: reason.slice(0, 600),
          detail: blockText.slice(0, 16000),
          line: i + 1,
          endLine: j,
        });
      }
    }
    return results;
  }

  function findAnrs(lines, candidates) {
    const out = [];
    for (const candidate of candidates) {
      const text = lines[candidate.line - 1];
      const match = /\bANR in\s+([^\s(]+)/.exec(text);
      if (match) out.push({ process: match[1], line: candidate.line, detail: text.slice(0, 16000) });
    }
    return out;
  }

  // Native crash / tombstone analysis

  function parseTombstoneTimestamp(ts) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(ts || "");
    if (!m) return null;
    return {
      month: parseInt(m[2], 10), day: parseInt(m[3], 10),
      hour: parseInt(m[4], 10), min: parseInt(m[5], 10), sec: parseInt(m[6], 10),
    };
  }

  function parseLogcatTimestamp(line) {
    const m = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(line);
    if (!m) return null;
    return {
      month: parseInt(m[1], 10), day: parseInt(m[2], 10),
      hour: parseInt(m[3], 10), min: parseInt(m[4], 10), sec: parseInt(m[5], 10),
    };
  }

  function toDaySeconds(t) {
    return Date.UTC(2000, t.month - 1, t.day, t.hour, t.min, t.sec) / 1000;
  }

  function addrValue(hex) {
    if (!hex) return null;
    const v = parseInt(hex, 16);
    return Number.isNaN(v) ? null : v;
  }

  function parseFrameOffset(rest) {
    if (!rest) return null;
    // The offset is almost always immediately followed by the frame's own
    // closing paren, even when the symbol itself contains parens (as with
    // "std::terminate()+80)"), so search for "+NUM)" rather than trying to
    // bound the whole symbol first.
    const m = /\+(0x[0-9a-fA-F]+|\d+)\)/.exec(rest);
    if (!m) return null;
    return /^0x/i.test(m[1]) ? parseInt(m[1], 16) : parseInt(m[1], 10);
  }

  function matchSensitiveProcess(cmdline) {
    if (!cmdline) return null;
    for (const { re, label } of SENSITIVE_PROCESS_PATTERNS) {
      if (re.test(cmdline)) return label;
    }
    return null;
  }

  function parseBacktrace(chunk) {
    const frames = [];
    BACKTRACE_FRAME_RE.lastIndex = 0;
    let fm;
    while ((fm = BACKTRACE_FRAME_RE.exec(chunk)) !== null) {
      const rest = (fm[4] || "").trim();
      frames.push({ frame: fm[1], pc: fm[2], path: fm[3], symbol: rest || null, offset: parseFrameOffset(rest) });
    }
    return frames;
  }

  // A single time-ordered index of logcat lines and (best-effort) usagestats
  // events, built once so each tombstone can be cross-referenced against
  // "what was happening at that moment" without re-scanning the full report.
  function buildTimelineIndex(fullText) {
    const index = [];
    const lines = fullText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (LOGCAT_LINE_RE.test(line)) {
        const t = parseLogcatTimestamp(line);
        if (t) index.push({ t, text: line.trim().slice(0, 300), source: "logcat" });
      }
    }
    USAGESTATS_EVENT_RE.lastIndex = 0;
    let um;
    while ((um = USAGESTATS_EVENT_RE.exec(fullText)) !== null) {
      const t = parseTombstoneTimestamp(um[1]);
      if (t) {
        index.push({ t, text: `type=${um[2]}${um[3] ? " package=" + um[3] : ""}`, source: "usagestats" });
      }
    }
    return index;
  }

  function nearbyTimelineEvents(index, tsObj, windowSeconds, maxLines) {
    if (!tsObj || !index || !index.length) return [];
    const target = toDaySeconds(tsObj);
    const matches = [];
    for (const entry of index) {
      const diff = toDaySeconds(entry.t) - target;
      if (Math.abs(diff) <= windowSeconds) matches.push({ text: entry.text, source: entry.source, diff_seconds: diff });
    }
    matches.sort((a, b) => Math.abs(a.diff_seconds) - Math.abs(b.diff_seconds));
    return matches.slice(0, maxLines);
  }

function findNativeCrashes(fullText, logSignals) {
  const original = fullText.split(/\r?\n/);
  const lines = original.map(line => Logcat.parseLine(line)?.message ?? line);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const pid = /^pid:\s*(\d+),?\s*tid:/.exec(lines[i].trim());
    if (!pid) continue;
    let end = Math.min(i + 180, lines.length);
    for (let j = i + 1; j < end; j++) {
      if (/^pid:\s*\d+,?\s*tid:|^\*\*\* \*\*\*|^-{6} /.test(lines[j])) { end = j; break; }
    }
    const opening = lines.slice(i, Math.min(i + 8, end)).join('\n');
    const signal = /^\s*signal\s+\d+\s*\((SIG[A-Z0-9]+)\)/m.exec(opening);
    if (!signal) continue; // Stack captures without a fatal signal are not crashes.
    const chunk = lines.slice(i, end).join('\n');
    const before = lines.slice(Math.max(0, i - 10), i).join('\n');
    const cmdline = [...before.matchAll(/Cmdline:\s*([^\n]+)/g)].pop()?.[1]?.trim()
      || />>>\s*(.*?)\s*<<</.exec(lines[i])?.[1] || 'unknown';
    const timestamp = [...before.matchAll(/Timestamp:\s*([^\n]+)/g)].pop()?.[1]?.trim()
      || Logcat.parseLine(original[i])?.timestamp || null;
    out.push({
      pid: pid[1], signal: signal[1], cmdline, timestamp, line: i + 1,
      timestamp_parsed: parseTombstoneTimestamp(timestamp) || parseLogcatTimestamp(timestamp || ''),
      fault_code: /code\s+-?\d+\s*\(([A-Z_]+)\)/.exec(opening)?.[1] || null,
      fault_addr: FAULT_ADDR_RE.exec(opening)?.[1] || null,
      abort_message: ABORT_MSG_RE.exec(chunk)?.[1]?.slice(0, 1200) || null,
      backtrace: parseBacktrace(chunk).slice(0, 40), _chunk_length: chunk.length, source: 'tombstone'
    });
  }
  for (const marker of logSignals?.nativeCrashes || []) {
    const parsed = parseTombstoneTimestamp(marker.timestamp) || parseLogcatTimestamp(marker.timestamp || '');
    const duplicate = out.some(c => c.pid === marker.pid && c.signal === marker.signal &&
      (parsed && c.timestamp_parsed ? Math.abs(toDaySeconds(parsed) - toDaySeconds(c.timestamp_parsed)) <= 10 : Math.abs(c.line - marker.line) < 200));
    if (!duplicate) out.push({ ...marker, timestamp_parsed: parsed, backtrace: [], _chunk_length: 0, source: 'fatal signal marker', fault_code: null, fault_addr: null, abort_message: null });
  }
  return out;
}


  // Scores one tombstone against the exploitation signifiers. Returns
  // {flags, score, severity}; flags is an array of {flag, detail}.
function classifyNativeCrash(crash) {
  const flags = [];
  let score = 0;
  if (crash.signal === 'SIGABRT') flags.push({ flag: 'process-abort', detail: 'The process aborted. Review its abort message and preceding errors.' });
  if (crash.signal === 'SIGSEGV') flags.push({ flag: 'invalid-memory-access', detail: 'The process accessed invalid memory. Inspect the fault address and symbolicated stack.' });
  if (crash.fault_code) flags.push({ flag: crash.fault_code, detail: 'Signal code reported by the tombstone.' });
  if (crash.fault_addr && addrValue(crash.fault_addr) < 4096) flags.push({ flag: 'low-fault-address', detail: 'A null or low-address access is consistent with a pointer bug; the stack is needed to diagnose it.' });
  if (crash.abort_message) {
    const sanitizer = /addresssanitizer|hwasan|heap-buffer-overflow|stack-buffer-overflow|use-after-free|tag.?mismatch/i.test(crash.abort_message);
    flags.push({ flag: sanitizer ? 'sanitizer-report' : 'abort-message', detail: crash.abort_message });
    score += sanitizer ? 30 : 10;
  }
  if (!crash.backtrace?.length) flags.push({ flag: 'stack-not-included', detail: 'No backtrace was captured in this excerpt. Obtain the matching tombstone for root-cause analysis.' });
  const sensitive = matchSensitiveProcess(crash.cmdline);
  if (sensitive) { flags.push({ flag: 'core-or-sensitive-process', detail: `Process context: ${sensitive}. Review user-visible impact.` }); score += 10; }
  return { flags, score, severity: score >= 30 ? 'high' : score >= 10 ? 'moderate' : 'low' };
}


  // Aggregates classified tombstones: repeat/clustering by process, overall
  // severity, top-scored contributors, and nearby logcat/usagestats context
  // for each (the doc's "cross reference... to see what was happening").
  function buildCrashDiagnosis(nativeCrashes, timelineIndex) {
    const diagnosis = {
      severity: "normal",
      headline: nativeCrashes.length ? "Native crashes are available for review." : "No native crashes were found.",
      contributors: [],
    };

    if (!nativeCrashes || nativeCrashes.length === 0) {
      return diagnosis;
    }

    const byProcess = new Map();
    for (const c of nativeCrashes) {
      const key = c.cmdline || "unknown";
      if (!byProcess.has(key)) byProcess.set(key, []);
      byProcess.get(key).push(c);
    }

    const scored = nativeCrashes.map((c) => {
      const classification = classifyNativeCrash(c);
      const flags = classification.flags.slice();
      let score = classification.score;

      const group = byProcess.get(c.cmdline || "unknown") || [];
      if (group.length > 1) {
        const withTs = group.filter((g) => g.timestamp_parsed);
        const dayBuckets = withTs.map((g) => toDaySeconds(g.timestamp_parsed) - (g.timestamp_parsed.hour * 3600 + g.timestamp_parsed.min * 60 + g.timestamp_parsed.sec));
        const clustered = dayBuckets.length > 1 && (dayBuckets.reduce((a, b) => Math.max(a, b), -Infinity) - dayBuckets.reduce((a, b) => Math.min(a, b), Infinity)) <= 86400;
        flags.push({
          flag: clustered ? "repeated-crashes-clustered" : "repeated-crashes",
          detail: `${group.length} crash records for ${c.cmdline}${clustered ? ", clustered within about a day — worth reviewing together." : "."}`,
        });
        score += clustered ? 15 : 8;
      }

      const nearby_events = c.timestamp_parsed ? nearbyTimelineEvents(timelineIndex, c.timestamp_parsed, 10, 8) : [];

      return { ...c, flags, diagnostic_score: Math.round(score * 10) / 10, nearby_events };
    });

    scored.sort((a, b) => b.diagnostic_score - a.diagnostic_score);
    diagnosis.contributors = scored.slice(0, 10);

    const top = diagnosis.contributors[0];
    const highCount = scored.filter((c) => c.diagnostic_score >= 40).length;
    const moderateCount = scored.filter((c) => c.diagnostic_score >= 20 && c.diagnostic_score < 40).length;

    if (highCount > 0) diagnosis.severity = "high";
    else if (moderateCount > 0) diagnosis.severity = "moderate";

    if (top && top.diagnostic_score > 0) {
      const flagNames = top.flags.map((f) => f.flag).join(", ");
      diagnosis.headline = `${top.cmdline} (pid ${top.pid}, ${top.signal}) is the highest-priority native crash for review — flags: ${flagNames}.`;
    }

    return diagnosis;
  }

  function durationToSeconds(durStr) {
    let total = 0;
    DURATION_PART_RE.lastIndex = 0;
    let m;
    while ((m = DURATION_PART_RE.exec(durStr)) !== null) {
      const value = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === "h") total += value * 3600;
      else if (unit === "m") total += value * 60;
      else if (unit === "s") total += value;
      else if (unit === "ms") total += value / 1000;
    }
    return total;
  }

  function classifyWakelock(lock) {
    const name = (lock.name || "").toLowerCase();
    const uid = (lock.uid || "").toLowerCase();

    // System aggregates / accounting entries.
    if (
      name.includes("powermanagerservice.wakelocks") ||
      name.includes("powermanagerservice.display") ||
      name.includes("suspendlockout")
    ) {
      return {
        category: "system-accounting",
        relevance: "low",
        reason: "System power-management accounting; not direct app attribution."
      };
    }

    // Wi-Fi / networking.
    if (
      name.includes("wlan") ||
      name.includes("wifi") ||
      name.includes("netlink")
    ) {
      return {
        category: "network",
        relevance: "high",
        reason: "Network/Wi-Fi activity can keep the device CPU/radio active."
      };
    }

    // Cellular modem.
    if (
      name.includes("ccmni") ||
      name.includes("ccci") ||
      name.includes("ril") ||
      name.includes("modem")
    ) {
      return {
        category: "cellular",
        relevance: "high",
        reason: "Cellular/modem activity can contribute to idle battery drain."
      };
    }

    // Jobs / WorkManager / JobScheduler.
    if (
      name.includes("*job*") ||
      name.includes("systemjobservice") ||
      name.includes("workmanager")
    ) {
      return {
        category: "background-job",
        relevance: "high",
        reason: "Background job execution attributed to an app."
      };
    }

    // Audio.
    if (
      name.includes("audio") ||
      name.includes("voiceservice")
    ) {
      return {
        category: "audio",
        relevance: "context-dependent",
        reason: "Expected during calls/media, suspicious if active while idle."
      };
    }

    // Display / graphics.
    if (
      name.includes("crtc") ||
      name.includes("cmdq") ||
      name.includes("display")
    ) {
      return {
        category: "display-gpu",
        relevance: "context-dependent",
        reason: "Display/GPU activity; important mainly if the screen should be off."
      };
    }

    // Serial / kernel interfaces.
    if (
      name.includes("tty") ||
      lock.type === "kernel"
    ) {
      return {
        category: "kernel",
        relevance: "context-dependent",
        reason: "Kernel-level wakelock; usually requires vendor/kernel investigation."
      };
    }

    return {
      category: lock.type === "app" ? "app" : "kernel",
      relevance: lock.type === "app" ? "medium" : "context-dependent",
      reason: lock.type === "app"
        ? "Application-attributed wakelock."
        : "Kernel wakelock."
    };
  }


  function extractPackageFromWakelock(name) {
    if (!name) return null;
    const prefixM = name.match(/^\*[^*]+\*\/(.+)$/);
    if (prefixM) {
      const parts = prefixM[1].split("/").filter(Boolean);
      let candidate = null;
      if (parts.length >= 3) candidate = parts[1];
      else if (parts.length >= 1) candidate = parts[0];
      if (candidate) {
        candidate = candidate.split(":")[0]; // strip trailing ':android' / ':accountname' suffix
        if (/^[a-zA-Z][\w]*(\.[a-zA-Z0-9_]+)+$/.test(candidate)) return candidate;
      }
    }

    // Fallback: any reverse-domain-looking substring elsewhere in the name.
    const pkg = name.match(
      /\b([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+){2,})\b/
    );

    return pkg ? pkg[1] : null;
  }


  function findWakelocks(sections, fullText) {
    const searchSpaces = [];

    for (const [, content] of getSectionsByFragment(
      sections,
      ["batterystats", "battery"]
    )) {
      searchSpaces.push(content);
    }

    const markerRe = /^DUMP OF SERVICE batterystats:/gm;
    let mk;

    while ((mk = markerRe.exec(fullText)) !== null) {
      const start = mk.index + mk[0].length;
      const rest = fullText.slice(start);
      const nextService = /\nDUMP OF SERVICE /.exec(rest);
      const end = nextService
        ? start + nextService.index
        : fullText.length;

      searchSpaces.push(fullText.slice(start, end));
    }

    const locks = [];

    for (const content of searchSpaces) {
      WAKELOCK_RE.lastIndex = 0;

      let m;

      while ((m = WAKELOCK_RE.exec(content)) !== null) {
        const isKernel = !!m[1];
        const rawName = m[2].trim();
        const durationStr = m[3].trim();
        const times = parseInt(m[4], 10);

        let uid = null;
        let tag = rawName;

        if (!isKernel) {
          const uidM = WAKELOCK_UID_TAG_RE.exec(rawName);

          if (uidM) {
            uid = uidM[1];
            tag = uidM[2];
          }
        }

        const seconds = durationToSeconds(durationStr);

        const lock = {
          type: isKernel ? "kernel" : "app",
          uid,
          name: tag,
          realtime: durationStr,
          times,

          // Useful numeric fields.
          seconds,
          average_seconds: times > 0 ? seconds / times : seconds,

          // Package attribution where possible.
          package: isKernel ? null : extractPackageFromWakelock(tag)
        };

        const classification = classifyWakelock(lock);

        lock.category = classification.category;
        lock.relevance = classification.relevance;
        lock.reason = classification.reason;

        // Flags that are useful for the battery report.
        lock.flags = [];

        if (times > 1000) {
          lock.flags.push("very-frequent");
        }

        if (seconds >= 1800) {
          lock.flags.push("long-held");
        }

        if (times > 0 && seconds / times < 1) {
          lock.flags.push("short-frequent");
        }

        if (
          lock.type === "app" &&
          lock.category === "background-job" &&
          seconds >= 600
        ) {
          lock.flags.push("background-job-heavy");
        }

        if (
          lock.category === "network" &&
          seconds >= 600
        ) {
          lock.flags.push("network-heavy");
        }

        locks.push(lock);
      }
    }

    /*
     * Deduplicate the same wakelock.
     *
     * Instead of throwing away the other occurrence, aggregate it.
     */
    const dedup = new Map();

    for (const l of locks) {
      const key = [
        l.type,
        l.uid,
        l.name
      ].join("|");

      const existing = dedup.get(key);

      if (!existing) {
        dedup.set(key, { ...l });
        continue;
      }

      // Keep one coherent record; never sum the same report repeated in two sections.
      if (l.seconds > existing.seconds || (l.seconds === existing.seconds && l.times > existing.times)) dedup.set(key, { ...l });
    }

    const ranked = Array.from(dedup.values())
      .sort((a, b) => b.seconds - a.seconds);

    return ranked;
  }

  function findTotalBatterySeconds(fullText) {
    const m = TOTAL_BATTERY_RE.exec(fullText);
    if (!m) return null;
    const seconds = durationToSeconds(m[1]);
    return seconds > 0 ? seconds : null;
  }

  function buildBatteryDiagnosis(wakelocks, totalBatterySeconds) {
    const diagnosis = {
      severity: "normal",
      headline: "No major wakelock contributor identified.",
      contributors: [],
      categories: {},
      total_battery_seconds: totalBatterySeconds || null,
      totals: {
        app_seconds: 0,
        kernel_seconds: 0,
        network_seconds: 0,
        cellular_seconds: 0,
        background_job_seconds: 0,
        system_accounting_seconds: 0,
      }
    };

    if (!wakelocks || wakelocks.length === 0) {
      diagnosis.headline = "No wakelock data was found.";
      return diagnosis;
    }

    for (const w of wakelocks) {
      const s = w.seconds || 0;

      if (w.type === "app") {
        diagnosis.totals.app_seconds += s;
      } else {
        diagnosis.totals.kernel_seconds += s;
      }

      if (w.category === "network") {
        diagnosis.totals.network_seconds += s;
      }

      if (w.category === "cellular") {
        diagnosis.totals.cellular_seconds += s;
      }

      if (w.category === "background-job") {
        diagnosis.totals.background_job_seconds += s;
      }

      if (w.category === "system-accounting") {
        diagnosis.totals.system_accounting_seconds += s;
      }

      diagnosis.categories[w.category] =
        (diagnosis.categories[w.category] || 0) + s;
    }

    /*
     * System accounting entries should not be treated as a direct
     * battery culprit.
     */
    const actionable = wakelocks.filter(
      w => w.category !== "system-accounting"
    );

    /*
     * Score contributors using:
     * - total held time
     * - frequency
     * - app attribution
     * - category
     *
     * This is NOT battery percentage. It is simply a diagnostic priority.
     */
    const scored = actionable.map(w => {
      const pct = totalBatterySeconds ? (w.seconds / totalBatterySeconds) * 100 : null;
      let score = Math.log10(1 + w.seconds) * 10;

      if (w.type === "app") {
        score += 15;
      }

      if (w.category === "background-job") {
        score += 20;
      }

      if (w.category === "network") {
        score += 15;
      }

      if (w.category === "cellular") {
        score += 12;
      }

      if (w.times > 5000) {
        score += 10;
      }

      if (w.times > 1000) {
        score += 5;
      }
      if (pct !== null) {
        if (pct >= 3) score += 15;
        else if (pct >= 1) score += 7;
      } else if (w.seconds > 1800) {
        score += 10;
      }

      return {
        ...w,
        pct_of_battery_time: pct === null ? null : Math.round(pct * 100) / 100,
        diagnostic_score: Math.round(score * 10) / 10
      };
    });

    scored.sort(
      (a, b) => b.diagnostic_score - a.diagnostic_score
    );

    diagnosis.contributors = scored.slice(0, 10);

    /*
     * Determine severity from actual actionable evidence. Normalized by
     * share of on-battery time when we know the total; otherwise fall back
     * to the raw-duration heuristic (30+ min held = notable).
     */
    const isHeavy = (w) =>
      totalBatterySeconds
        ? (w.seconds / totalBatterySeconds) * 100 >= 3
        : w.seconds >= 1800;

    const isModerate = (w) =>
      totalBatterySeconds
        ? (w.seconds / totalBatterySeconds) * 100 >= 1
        : w.seconds >= 600;

    const appHeavy = actionable.some(
      w => w.type === "app" && isHeavy(w)
    );

    const networkHeavy = actionable.some(
      w => w.category === "network" && isHeavy(w)
    );

    const jobHeavy = actionable.some(
      w => w.category === "background-job" && isHeavy(w)
    );

    const frequent = actionable.some(
      w => w.times >= 5000
    );

    if (jobHeavy || appHeavy || networkHeavy) {
      diagnosis.severity = "high";
    } else if (frequent || actionable.some(isModerate)) {
      diagnosis.severity = "moderate";
    }

    const top = diagnosis.contributors[0];

    if (top) {
      const pctStr = top.pct_of_battery_time !== null
        ? `, ${top.pct_of_battery_time}% of on-battery time`
        : "";
      if (top.type === "app") {
        diagnosis.headline =
          `${top.name} is the strongest app-attributed wakelock contributor ` +
          `(${top.realtime}${pctStr}, ${top.times} acquisitions).`;
      } else {
        diagnosis.headline =
          `${top.name} is the largest non-app/kernel contributor ` +
          `(${top.realtime}${pctStr}, ${top.times} acquisitions).`;
      }
    }

    return diagnosis;
  }


  // ---------------------------------------------------------------------
  // Stalkerware / surveillance-app correlation
  // ---------------------------------------------------------------------

  function sectionContentByMarker(fullText, markerRe) {
    const out = [];
    const re = new RegExp(markerRe.source, markerRe.flags.includes("g") ? markerRe.flags : markerRe.flags + "g");
    let mk;
    while ((mk = re.exec(fullText)) !== null) {
      const start = mk.index + mk[0].length;
      const rest = fullText.slice(start);
      const nextService = /\nDUMP OF SERVICE /.exec(rest);
      out.push(nextService ? rest.slice(0, nextService.index) : rest);
    }
    return out;
  }
  function findPackageInfo(fullText) {
    const packages = new Map();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE package:/)) {
      let current = null;
      let mode = null;
      for (const line of content.split("\n")) {
        const pkgM = PKG_HEADER_RE.exec(line);
        if (pkgM) {
          current = pkgM[1];
          if (!packages.has(current)) {
            packages.set(current, { requested: new Set(), grantedRuntime: new Set(), codePath: null, isSystem: null });
          }
          mode = null;
          continue;
        }
        if (!current) continue;
        const pkgData = packages.get(current);

        if (pkgData.codePath === null) {
          const cpM = CODEPATH_RE.exec(line);
          if (cpM) pkgData.codePath = cpM[1];
        }
        if (pkgData.isSystem === null) {
          const flagsM = PKG_FLAGS_RE.exec(line);
          if (flagsM) pkgData.isSystem = /\bSYSTEM\b/.test(flagsM[1]);
        }

        if (REQ_PERMS_HEADER_RE.test(line)) { mode = "requested"; continue; }
        if (RUNTIME_PERMS_HEADER_RE.test(line)) { mode = "runtime"; continue; }

        if (mode) {
          const permM = PERM_LINE_RE.exec(line);
          if (permM) {
            if (mode === "requested") pkgData.requested.add(permM[1]);
            if (mode === "runtime" && permM[2] === "true") pkgData.grantedRuntime.add(permM[1]);
          }
        }
      }
    }
    return packages;
  }

  // Packages with an enabled Accessibility Service 
  function findAccessibilityServicePackages(fullText) {
    const pkgs = new Set();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE accessibility:/)) {
      COMPONENT_INFO_RE.lastIndex = 0;
      let m;
      while ((m = COMPONENT_INFO_RE.exec(content)) !== null) pkgs.add(m[1]);
    }
    const settingM = ENABLED_A11Y_SETTING_RE.exec(fullText);
    if (settingM) {
      for (const entry of settingM[1].split(":")) {
        const pkg = entry.split("/")[0].trim();
        if (/^[\w.]+$/.test(pkg)) pkgs.add(pkg);
      }
    }
    return pkgs;
  }

  function findDeviceAdminPackages(fullText) {
    const pkgs = new Set();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE device_policy:/)) {
      COMPONENT_INFO_RE.lastIndex = 0;
      let m;
      while ((m = COMPONENT_INFO_RE.exec(content)) !== null) pkgs.add(m[1]);
    }
    return pkgs;
  }

  // Packages exempted from battery optimization/Doze
  function findBatteryOptimizationExemptPackages(fullText) {
    const pkgs = new Set();
    for (const content of sectionContentByMarker(fullText, /DUMP OF SERVICE deviceidle:/)) {
      for (const line of content.split("\n")) {
        const m = WHITELIST_PKG_LINE_RE.exec(line);
        if (m) pkgs.add(m[1]);
      }
    }
    return pkgs;
  }

  function isUserInstalledPackage(info) {
    if (info.isSystem === true) return false;
    if (info.isSystem === false) return true;
    if (info.codePath) return !/^\/(system|vendor|product|apex|system_ext)\//.test(info.codePath);
    return null; // unknown either way
  }

  function matchKnownStalkerwarePattern(pkgName) {
    for (const { re, label } of KNOWN_STALKERWARE_PATTERNS) {
      if (re.test(pkgName)) return label;
    }
    return null;
  }

  function looksLikeSystemNameMimicry(pkgName) {
    return /(system|android|google|service|sync|update)/i.test(pkgName) && !/^com\.(google|android)\./i.test(pkgName);
  }

  // Scores one package against the correlated indicators. Every flag here is
  // individually explainable by a legitimate app (MDM, parental controls,
  // "Find My Device", accessibility tools for users with disabilities) —
  // the point is that several clustering on one app is what's worth a closer
  // look, mirroring the native-crash classifier's "one signal proves
  // nothing, several together do" approach.
  function classifyPackageIndicators(pkgName, info, context) {
    const flags = [];
    let score = 0;
    const userInstalled = isUserInstalledPackage(info);

    const knownMatch = matchKnownStalkerwarePattern(pkgName);
    if (knownMatch) {
      flags.push({ flag: "known-stalkerware-name-pattern", detail: `Package name matches a publicly documented ${knownMatch} naming pattern.` });
      score += 50;
    }

    const hasA11y = context.accessibilitySet.has(pkgName);
    const hasAdmin = context.deviceAdminSet.has(pkgName);
    const hasBatteryExempt = context.batteryExemptSet.has(pkgName);

    if (hasA11y) {
      if (userInstalled) {
        flags.push({ flag: "accessibility-service-enabled", detail: "Has an enabled Accessibility Service — the most common technique stalkerware uses to read on-screen content." });
        score += 25;
      } else {
        flags.push({ flag: "accessibility-service-enabled-system", detail: "Has an enabled Accessibility Service (appears to be a system/pre-installed app)." });
        score += 5;
      }
    }

    if (hasAdmin) {
      flags.push({
        flag: "device-admin-enabled",
        detail: userInstalled
          ? "Registered as a Device Administrator — can restrict uninstall, wipe data, lock the screen, etc."
          : "Registered as a Device Administrator (appears to be a system/pre-installed app).",
      });
      score += userInstalled ? 20 : 5;
    }

    if (hasBatteryExempt && userInstalled) {
      flags.push({ flag: "battery-optimization-exempt", detail: "Exempted from battery optimization/Doze, letting it keep running in the background. Weak alone — many legitimate apps request this too." });
      score += 8;
    }

    const specialPresent = SPECIAL_ACCESS_PERMISSIONS.filter((p) => info.requested.has(p));
    if (specialPresent.length > 0) {
      flags.push({
        flag: "special-access-permissions",
        detail: `Requests special-access permissions: ${specialPresent.map((p) => p.replace("android.permission.", "")).join(", ")}.`,
      });
      score += Math.min(3, specialPresent.length) * 6;
    }

    const grantedGroups = Object.entries(DANGEROUS_PERMISSION_GROUPS).filter(([, perms]) => perms.some((p) => info.grantedRuntime.has(p)));
    if (grantedGroups.length > 0) {
      flags.push({
        flag: "sensitive-permissions-granted",
        detail: `Granted sensitive permission categories: ${grantedGroups.map(([g]) => g.replace("_", " ")).join(", ")}.`,
      });
      score += Math.min(4, grantedGroups.length) * 5;
    }
    if (grantedGroups.length >= 3 && userInstalled) {
      flags.push({
        flag: "surveillance-permission-cluster",
        detail: "Holds three or more distinct sensitive-data permission categories at once (audio/visual, location, messages/calls, contacts) — an unusual combination outside dedicated monitoring tools.",
      });
      score += 25;
    }

    if (userInstalled && looksLikeSystemNameMimicry(pkgName)) {
      flags.push({ flag: "system-name-mimicry", detail: "Package name imitates system/service naming while being user-installed. Weak signal alone — many legitimate apps use generic names too." });
      score += 8;
    }

    if (context.batteryPackages.has(pkgName) && userInstalled) {
      flags.push({ flag: "background-wakelock-holder", detail: "Also appears as a significant background wakelock/battery contributor elsewhere in this report." });
      score += 10;
    }

    score = Math.min(100, score);
    let severity = "low";
    if (score >= 50) severity = "high";
    else if (score >= 25) severity = "moderate";

    return { flags, score: Math.round(score * 10) / 10, severity, userInstalled };
  }

  // Aggregates per-package classification into a report-level correlation,
  // ranked by score, in the same shape as buildBatteryDiagnosis/
  // buildCrashDiagnosis.
  function buildStalkerwareCorrelation(fullText, batteryDiagnosis) {
    const result = {
      severity: "normal",
      headline: "No correlated surveillance-app indicators found.",
      contributors: [],
      note:
        "Heuristic correlation of publicly documented indicators (accessibility-service abuse, device-admin registration, " +
        "battery-optimization exemption, sensitive-permission clusters, and known package-name patterns). This is not proof " +
        "of stalkerware: legitimate MDM, parental-control, and accessibility tools trigger the same technical signals. If you " +
        "believe you're being monitored without consent, consider consulting a resource like the Coalition Against " +
        "Stalkerware (stopstalkerware.org) before uninstalling anything, since removal can alert whoever is monitoring the device.",
    };

    const packageInfo = findPackageInfo(fullText);
    const accessibilitySet = findAccessibilityServicePackages(fullText);
    const deviceAdminSet = findDeviceAdminPackages(fullText);
    const batteryExemptSet = findBatteryOptimizationExemptPackages(fullText);
    const batteryPackages = new Set(
      ((batteryDiagnosis && batteryDiagnosis.contributors) || []).map((w) => w.package).filter(Boolean)
    );

    // Union of every package we have any signal about, so one that only
    // shows up in accessibility/admin/whitelist dumps (and wasn't fully
    // captured by the package-permissions parse) still gets considered.
    const allPkgNames = new Set([
      ...packageInfo.keys(),
      ...accessibilitySet,
      ...deviceAdminSet,
      ...batteryExemptSet,
    ]);

    if (allPkgNames.size === 0) {
      result.headline = "No package/permission data was found to correlate (this bugreport may not include a full dumpsys package section).";
      return result;
    }

    const context = { accessibilitySet, deviceAdminSet, batteryExemptSet, batteryPackages };
    const scored = [];
    for (const pkgName of allPkgNames) {
      const info = packageInfo.get(pkgName) || { requested: new Set(), grantedRuntime: new Set(), codePath: null, isSystem: null };
      const classification = classifyPackageIndicators(pkgName, info, context);
      if (classification.score > 0) {
        scored.push({
          package: pkgName,
          user_installed: classification.userInstalled,
          requested_permissions: Array.from(info.requested),
          granted_permissions: Array.from(info.grantedRuntime),
          flags: classification.flags,
          diagnostic_score: classification.score,
        });
      }
    }

    scored.sort((a, b) => b.diagnostic_score - a.diagnostic_score);
    result.contributors = scored.slice(0, 10);

    const highCount = scored.filter((c) => c.diagnostic_score >= 50).length;
    const moderateCount = scored.filter((c) => c.diagnostic_score >= 25 && c.diagnostic_score < 50).length;
    if (highCount > 0) result.severity = "high";
    else if (moderateCount > 0) result.severity = "moderate";

    const top = result.contributors[0];
    if (top) {
      const flagNames = top.flags.map((f) => f.flag).join(", ");
      result.headline = `${top.package} has the strongest correlated indicators (score ${top.diagnostic_score}) — flags: ${flagNames}.`;
    }

    return result;
  }


  function findLowMemoryEvents(fullText) {
    const events = [];
    LOW_MEM_RE.lastIndex = 0;
    let m;
    while ((m = LOW_MEM_RE.exec(fullText)) !== null) {
      const line = m[0].slice(0, 200);
      if (BENIGN_MEM_RE.test(line)) continue;
      events.push(line);
  
    }
    return events;
  }

  function findOomKills(fullText) {
    const out = [];
    OOM_KILL_RE.lastIndex = 0;
    let m;
    while ((m = OOM_KILL_RE.exec(fullText)) !== null) {
      out.push({ process: m[1] });
  
    }
    return out;
  }

  function findFrameDrops(fullText) {
    const drops = [];
    FRAME_DROP_RE.lastIndex = 0;
    let m;
    while ((m = FRAME_DROP_RE.exec(fullText)) !== null) {
      drops.push(parseInt(m[1], 10));
    }
    if (drops.length === 0) return { count: 0, max_skipped: 0, total_skipped: 0 };
    return {
      count: drops.length,
      max_skipped: drops.reduce((max, n) => Math.max(max, n), 0),
      total_skipped: drops.reduce((a, b) => a + b, 0),
    };
  }

  function topOffendingProcesses(javaCrashes, anrs, nativeCrashes) {
    const counter = new Map();
    const bump = (k) => counter.set(k, (counter.get(k) || 0) + 1);
    javaCrashes.forEach((c) => bump(c.process));
    anrs.forEach((a) => bump(a.process));
    nativeCrashes.forEach((n) => bump(n.cmdline));
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  // ---------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------
  function analyze(fullText, sourceName, logData, logSignals) {
    const sections = splitSections(fullText);
    const unparsedRecords = logData.records.filter(record => record.level === '?');
    const javaCrashes = [...logSignals.javaCrashes, ...findJavaCrashes(logData.lines, unparsedRecords)];
    const anrs = [...logSignals.anrs, ...findAnrs(logData.lines, unparsedRecords)];
    const nativeCrashes = findNativeCrashes(fullText, logSignals);
    const wakelocks = findWakelocks(sections, fullText);
    const totalBatterySeconds = findTotalBatterySeconds(fullText);
    const batteryDiagnosis = buildBatteryDiagnosis(wakelocks, totalBatterySeconds);
    const lowMem = findLowMemoryEvents(fullText);
    const oomKills = findOomKills(fullText);
    const frameDrops = findFrameDrops(fullText);
    const topOffenders = topOffendingProcesses(javaCrashes, anrs, nativeCrashes);

    // Native-crash exploitation-signal triage, cross-referenced against a
    // logcat/usagestats timeline built once for the whole report.
    const timelineIndex = buildTimelineIndex(fullText);
    const crashDiagnosis = buildCrashDiagnosis(nativeCrashes, timelineIndex);
    const stripInternal = ({ _chunk_length, timestamp_parsed, ...rest }) => rest;
    const cleanNativeCrashes = nativeCrashes.map(stripInternal);
    const cleanCrashDiagnosis = {
      ...crashDiagnosis,
      contributors: crashDiagnosis.contributors.map(stripInternal),
    };

    // Stalkerware / surveillance-app correlation across package permissions,
    // accessibility services, device admins, and battery-exemption lists.
    const stalkerwareIndicators = buildStalkerwareCorrelation(fullText, batteryDiagnosis);

    return {
      source_file: sourceName,
      analyzed_at: new Date().toISOString(),
      section_count: Object.keys(sections).length,
      sections_found: Object.keys(sections).sort().slice(0, 100),

      counts: {
        java_crashes: javaCrashes.length,
        anrs: anrs.length,
        native_crashes: nativeCrashes.length,
        wakelocks_reported: wakelocks.length,
        low_memory_events: lowMem.length,
        oom_kills: oomKills.length,
        frame_drop_events: frameDrops.count,
        correlated_surveillance_indicators: stalkerwareIndicators.contributors.length,
      },

      top_offending_processes: topOffenders,

      java_crashes: javaCrashes.slice(0, 50),
      anrs: anrs.slice(0, 50),
      native_crashes: cleanNativeCrashes.slice(0, 50),

      wakelocks: wakelocks.slice(0, 100),

      battery_diagnosis: batteryDiagnosis,

      crash_diagnosis: cleanCrashDiagnosis,

      stalkerware_indicators: stalkerwareIndicators,

      low_memory_events: lowMem.slice(0, 20),
      oom_kills: oomKills.slice(0, 20),
      frame_drops: frameDrops,
    };

  }


function bugReportDetails(text, result, logData) {
  const property = name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\[${escaped}\\]:\\s*\\[([^\\]]*)\\]`).exec(text)?.[1] || '';
  };
  result.tool = 'bugreport'; result.version = 2;
  result.device = {
    manufacturer: property('ro.product.manufacturer'), model: property('ro.product.model'),
    android: property('ro.build.version.release'), sdk: property('ro.build.version.sdk'),
    build: property('ro.build.fingerprint') || /Build fingerprint:\s*'([^']+)'/.exec(text)?.[1] || ''
  };
  result.coverage = {
    physical_lines: logData.lines.length, log_records: logData.parsed,
    battery: /^(?:DUMP OF SERVICE batterystats:|------ [^\n]*(?:BATTERY STATS|batterystats)[^\n]* ------|\s{0,4}Battery History\s*\()/mi.test(text),
    packages: /^(?:DUMP OF SERVICE package:|Packages:\s*$)/m.test(text),
    sectioned: !(result.section_count === 1 && result.sections_found[0] === 'FULL_TEXT')
  };
  result.notes = [
    'Findings describe the supplied capture. Missing sections cannot establish that an issue is absent.',
    'Wakelock times may overlap and do not measure energy consumption. Scores prioritise review; they are not probabilities.',
    'Native crash and package-access signals do not establish exploitation or malware.'
  ];
  if (!result.coverage.sectioned) result.notes.unshift('No standard bugreport section headers found. For a standalone logcat file, use Log Analyser for detailed filtering.');
  if (!result.coverage.battery) result.battery_diagnosis.headline = 'Battery statistics were not found in this capture.';
  result.stalkerware_indicators.note = 'Review the observed grants and enabled services in context. Legitimate accessibility, management, and parental-control apps can have the same access. Package names alone do not identify an app reliably.';
  result.limits = { java_crashes: 50, anrs: 50, native_crashes: 50, low_memory_examples: 20, oom_examples: 20, wakelocks: 100 };
  return result;
}

  return { analyze, details: bugReportDetails };
})();
