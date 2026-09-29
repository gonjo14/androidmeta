// Local, bounded PCAP/PCAPNG decoding. No network lookups or decryption.
const PcapAnalysis = (() => {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024 * 1024, MAX_PACKETS = 200000;
  const links = {0:'BSD loopback',1:'Ethernet',101:'Raw IP',108:'OpenBSD loopback',113:'Linux cooked v1',228:'IPv4',229:'IPv6',276:'Linux cooked v2'};
  const protocols = {1:'ICMP',6:'TCP',17:'UDP',41:'IPv6',47:'GRE',50:'ESP',51:'AH',58:'ICMPv6',59:'No next header'};
  const dnsTypes = {1:'A',2:'NS',5:'CNAME',6:'SOA',12:'PTR',15:'MX',16:'TXT',28:'AAAA',33:'SRV',65:'HTTPS'};
  const u16 = (a,p) => (a[p] << 8) | a[p+1];
  const u32 = (a,p) => ((a[p]*0x1000000)+(a[p+1]<<16)+(a[p+2]<<8)+a[p+3]) >>> 0;
  const printable = a => Array.from(a, b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '\\x' + b.toString(16).padStart(2,'0')).join('');
  const ip4 = (a,p) => Array.from(a.subarray(p,p+4)).join('.');
  function ip6(a,p) {
    const words = Array.from({length:8}, (_,i) => u16(a,p+2*i).toString(16));
    let best=-1, length=1;
    for (let i=0;i<8;i++) if (words[i]==='0') { let j=i; while(j<8 && words[j]==='0') j++; if(j-i>length) {best=i;length=j-i;} i=j-1; }
    return best<0 ? words.join(':') : words.slice(0,best).join(':')+'::'+words.slice(best+length).join(':');
  }
  function addressScope(ip) {
    if (!ip) return 'Not decoded';
    if (ip.includes(':')) {
      if(ip==='::1') return 'Loopback';
      if(ip==='::') return 'Unspecified';
      if(/^f[cd]/i.test(ip)) return 'Unique local';
      if(/^fe[89ab]/i.test(ip)) return 'Link local';
      if(/^ff/i.test(ip)) return 'Multicast';
      if(ip.startsWith('2001:db8:')) return 'Documentation';
      return 'Other IPv6';
    }
    const [a,b,c] = ip.split('.').map(Number);
    if(a===10 || (a===172 && b>=16 && b<=31) || (a===192 && b===168)) return 'Private';
    if(a===100 && b>=64 && b<=127) return 'Shared address space';
    if(a===127) return 'Loopback';
    if(a===169 && b===254) return 'Link local';
    if(a>=224 && a<=239) return 'Multicast';
    if(a===0 || a>=240) return 'Special use';
    if((a===192 && b===0 && c===2)||(a===198 && b===51 && c===100)||(a===203 && b===0 && c===113)) return 'Documentation';
    return 'Other IPv4';
  }
  const endpoint = (ip,port) => !ip ? 'Not decoded' : port == null ? ip : (ip.includes(':') ? '['+ip+']' : ip)+':'+port;
  function dns(a) {
    if(a.length<12) throw new Error('Incomplete DNS header');
    function name(start) {
      let p=start, next=null, parts=[], seen=new Set(), size=0;
      for(let steps=0;steps<128;steps++) {
        if(p>=a.length || seen.has(p)) throw new Error('Invalid DNS name pointer');
        seen.add(p); const n=a[p++];
        if((n&192)===192) { if(p>=a.length) throw new Error('Incomplete DNS pointer'); if(next===null) next=p+1; p=((n&63)<<8)|a[p]; continue; }
        if(n&192 || n>63 || p+n>a.length) throw new Error('Invalid DNS label');
        if(!n) return {value:parts.join('.') || '.', next:next===null?p:next};
        size+=n+1; if(size>255) throw new Error('DNS name exceeds 255 bytes');
        parts.push(printable(a.subarray(p,p+n))); p+=n;
      }
      throw new Error('Too many DNS name pointers');
    }
    const counts=[u16(a,4),u16(a,6),u16(a,8),u16(a,10)];
    if(counts.reduce((x,y)=>x+y,0)>256) throw new Error('DNS record inspection limit (256)');
    const records=[], questions=[]; let p=12;
    for(let section=0;section<4;section++) for(let i=0;i<counts[section];i++) {
      const n=name(p); p=n.next;
      if(p+4>a.length) throw new Error('Incomplete DNS record');
      const type=u16(a,p), cls=u16(a,p+2);p+=4;
      if(section===0) {questions.push({name:n.value,type:dnsTypes[type]||String(type),class:cls});continue;}
      if(p+6>a.length) throw new Error('Incomplete DNS answer');
      const ttl=u32(a,p), length=u16(a,p+4); p+=6; const end=p+length;
      if(end>a.length) throw new Error('Incomplete DNS answer data');
      let value=null;
      if(type===1 && length===4) value=ip4(a,p);
      else if(type===28 && length===16) value=ip6(a,p);
      else if([2,5,12].includes(type)) { const decoded=name(p); if(decoded.next>end) throw new Error('Invalid DNS answer name'); value=decoded.value; }
      if(value!==null) records.push({name:n.value,type:dnsTypes[type],value,ttl,section:['question','answer','authority','additional'][section]});
      p=end;
    }
    return {id:u16(a,0),response:Boolean(a[2]&128),rcode:a[3]&15,truncated:Boolean(a[2]&2),questions,records};
  }
  function tls(a) {
    if(a.length<5 || a[0]!==22 || a[1]!==3) return null;
    const recordEnd=5+u16(a,3);
    if(recordEnd>a.length) return {incomplete:true};
    if(a[5]!==1) return {record:true};
    if(a.length<9) return {incomplete:true};
    const end=9+(a[6]<<16)+(a[7]<<8)+a[8];
    if(end>recordEnd || end<44) return {incomplete:true};
    let p=43;
    p+=1+a[p]; if(p+2>end) return {incomplete:true};
    p+=2+u16(a,p); if(p>=end) return {incomplete:true};
    p+=1+a[p]; if(p===end) return {record:true};
    if(p+2>end) return {incomplete:true};
    const exEnd=p+2+u16(a,p); p+=2;
    if(exEnd>end) return {incomplete:true};
    while(p+4<=exEnd) {
      const type=u16(a,p), len=u16(a,p+2);p+=4;const stop=p+len;
      if(stop>exEnd) return {incomplete:true};
      if(type===0 && len>=2) {
        const listEnd=p+2+u16(a,p); if(listEnd>stop) return {incomplete:true};
        let q=p+2;
        while(q+3<=listEnd) {const kind=a[q], length=u16(a,q+1);q+=3;if(q+length>listEnd)return {incomplete:true};if(kind===0 && length && length<=253) return {sni:printable(a.subarray(q,q+length))};q+=length;}
      }
      p=stop;
    }
    return {record:true};
  }
  function application(a,p) {
    if(!a.length) return;
    if(p.transport==='UDP' && [p.src_port,p.dst_port].some(n=>n===53||n===5353)) {
      try {p.dns=dns(a);p.application=[p.src_port,p.dst_port].includes(5353)?'mDNS':'DNS';p.info=(p.dns.response?'Response':'Query')+' '+p.dns.questions.map(q=>q.type+' '+q.name).join(', ');}
      catch(error) {p.notes.push(error.message);}
      return;
    }
    if(p.transport!=='TCP') return;
    if([p.src_port,p.dst_port].includes(53)) {
      if(a.length>=2 && u16(a,0)+2<=a.length) {try {p.dns=dns(a.subarray(2,2+u16(a,0)));p.application='DNS';p.info='DNS over TCP';} catch(error){p.notes.push(error.message);}}
      else p.notes.push('DNS over TCP message spans packets; not reassembled.');
      return;
    }
    if(a.length>=24) {
      const command=printable(a.subarray(0,4)), v=new DataView(a.buffer,a.byteOffset,a.byteLength);
      if(['CNXN','AUTH','OPEN','OKAY','CLSE','WRTE','SYNC','STLS'].includes(command) && v.getUint32(20,true)===(v.getUint32(0,true)^0xffffffff)>>>0) {
        p.application='ADB';p.adb={command,arg0:v.getUint32(4,true),arg1:v.getUint32(8,true),data_length:v.getUint32(12,true)};p.info='ADB '+command+' · '+p.adb.data_length+' declared data bytes';return;
      }
    }
    const hello=tls(a);
    if(hello) {p.application='TLS';if(hello.sni){p.tls_sni=hello.sni;p.info='ClientHello · '+hello.sni;}else if(hello.incomplete){p.notes.push('TLS handshake spans packets or is incomplete; SNI not decoded.');}return;}
    if(a.length>=5 && a[0]>=20 && a[0]<=23 && a[1]===3 && a[2]<=4 && u16(a,3)<=18432) {p.application='TLS';p.info='TLS record (payload not decrypted)';return;}
    const text=new TextDecoder('utf-8').decode(a.subarray(0,16384));
    if(/^(?:GET|POST|HEAD|PUT|DELETE|OPTIONS|PATCH|CONNECT|TRACE) [^\r\n]{1,4096} HTTP\/1\.[01]\r\n/.test(text) || /^HTTP\/1\.[01] \d{3}[^\r\n]*\r\n/.test(text)) {
      p.application='HTTP';p.info=text.split('\r\n')[0].slice(0,300);
      const host=text.match(/\r\nHost:[ \t]*([^\r\n]{1,300})\r\n/i);if(host)p.http_host=host[1].trim();
      if(!text.includes('\r\n\r\n'))p.notes.push('HTTP headers incomplete in this packet.');
    }
  }
  function decodePacket(a,meta) {
    const p={...meta,src:null,dst:null,src_port:null,dst_port:null,transport:'Other',application:null,info:'',notes:[],payload_bytes:0};
    let off=0,type=null;
    const requireBytes=(n,label)=>{if(off+n>a.length)throw new Error('Incomplete '+label);};
    try {
      if(meta.linktype===1) {requireBytes(14,'Ethernet header');type=u16(a,12);off=14;let vlans=0;while([0x8100,0x88a8,0x9100].includes(type)){requireBytes(4,'VLAN header');if(++vlans>4)throw new Error('Too many VLAN tags');type=u16(a,off+2);off+=4;}}
      else if(meta.linktype===113){requireBytes(16,'Linux cooked header');type=u16(a,14);off=16;}
      else if(meta.linktype===276){requireBytes(20,'Linux cooked v2 header');type=u16(a,0);off=20;}
      else if([0,108].includes(meta.linktype)) {requireBytes(4,'loopback header');const v=new DataView(a.buffer,a.byteOffset,4), family=v.getUint32(0,meta.linktype===0?meta.little_endian:false);off=4;type=family===2?0x800:[10,24,28,30].includes(family)?0x86dd:null;}
      else if([101,228,229].includes(meta.linktype)){requireBytes(1,'IP header');type=meta.linktype===228?0x800:meta.linktype===229?0x86dd:a[0]>>4===4?0x800:a[0]>>4===6?0x86dd:null;}
      else {p.unsupported=true;p.info='Unsupported link type '+meta.linktype;return p;}
      if(type===0x806){p.transport='ARP';p.info='Address Resolution Protocol';return p;}
      if(type!==0x800 && type!==0x86dd){p.unsupported=true;p.info='Link payload not decoded';return p;}
      let proto,end=a.length,fragment=false;
      if(type===0x800){
        requireBytes(20,'IPv4 header');if(a[off]>>4!==4)throw new Error('Invalid IPv4 version');
        const h=(a[off]&15)*4,total=u16(a,off+2);if(h<20||total<h)throw new Error('Invalid IPv4 length');requireBytes(h,'IPv4 options');
        p.src=ip4(a,off+12);p.dst=ip4(a,off+16);p.ip_version=4;proto=a[off+9];p.ttl=a[off+8];
        fragment=Boolean(u16(a,off+6)&0x3fff);if(off+total>a.length)p.notes.push('IP packet truncated in capture.');end=Math.min(a.length,off+total);off+=h;
      }else{
        requireBytes(40,'IPv6 header');if(a[off]>>4!==6)throw new Error('Invalid IPv6 version');
        p.src=ip6(a,off+8);p.dst=ip6(a,off+24);p.ip_version=6;p.ttl=a[off+7];proto=a[off+6];const len=u16(a,off+4);
        if(!len){p.unsupported=true;p.info='IPv6 empty payload or jumbogram not decoded';return p;}
        if(off+40+len>a.length)p.notes.push('IP packet truncated in capture.');end=Math.min(a.length,off+40+len);off+=40;
        let n=0;
        while([0,43,44,51,60].includes(proto)) {
          if(++n>16 || off+2>end)throw new Error('Invalid IPv6 extension chain');
          const next=a[off],size=proto===44?8:proto===51?(a[off+1]+2)*4:(a[off+1]+1)*8;
          if(off+size>end)throw new Error('Incomplete IPv6 extension');
          if(proto===44)fragment=Boolean(u16(a,off+2)&0xfff9);
          off+=size;proto=next;if(fragment)break;
        }
      }
      p.transport=protocols[proto]||'IP protocol '+proto;
      if(fragment){p.fragmented=true;p.info='IP fragment; transport payload not reassembled';return p;}
      if(proto===6){
        if(off+20>end)throw new Error('Incomplete TCP header');const size=(a[off+12]>>4)*4;
        if(size<20||off+size>end)throw new Error('Invalid TCP header length');
        p.src_port=u16(a,off);p.dst_port=u16(a,off+2);p.sequence=u32(a,off+4);p.acknowledgment=u32(a,off+8);p.window=u16(a,off+14);
        p.tcp_flags=a[off+13];p.flags=['FIN','SYN','RST','PSH','ACK','URG','ECE','CWR'].filter((name,i)=>p.tcp_flags&(1<<i));
        p.info=p.flags.join(', ');off+=size;
      }else if(proto===17){
        if(off+8>end)throw new Error('Incomplete UDP header');const len=u16(a,off+4);if(len<8)throw new Error('Invalid UDP length');
        if(off+len>end)p.notes.push('UDP data truncated in capture.');end=Math.min(end,off+len);p.src_port=u16(a,off);p.dst_port=u16(a,off+2);off+=8;
      }else {if([1,58].includes(proto)&&off+2<=end)p.info='Type '+a[off]+' · code '+a[off+1];return p;}
      p.payload_bytes=end-off;application(a.subarray(off,end),p);
    }catch(error){p.malformed=true;p.notes.push(error.message);}
    return p;
  }
  function analyse(input, sourceFile='capture.pcap', progress=()=>{}) {
    const a=input instanceof Uint8Array?input:new Uint8Array(input);
    if(a.byteLength>MAX_BYTES)throw new Error('Capture exceeds 100 MiB. Split it into smaller files.');
    if(a.length<4)throw new Error('This file is too short to contain a PCAP header.');
    const v=new DataView(a.buffer,a.byteOffset,a.byteLength), packets=[], interfaces=[], warnings=[], ignored={};
    let format,sections=0,little=true,at=0,skipped=0;
    const warning=(message)=>{if(warnings.length<50)warnings.push(message);};
    function add(offset,cap,wire,timestamp,iface,recordOffset) {
      if(packets.length>=MAX_PACKETS)throw new Error('Capture exceeds 200,000 packets. Split it into smaller files.');
      if(offset+cap>a.length)throw new Error('Packet extends beyond the capture at byte '+recordOffset+'.');
      const p=decodePacket(a.subarray(offset,offset+cap),{number:packets.length+1,offset,record_offset:recordOffset,captured_bytes:cap,original_bytes:wire,timestamp,interface_id:iface.id,linktype:iface.linktype,little_endian:little});
      if(cap>wire)p.notes.push('Captured length exceeds the original packet length.');
      if(iface.snaplen && cap>iface.snaplen)p.notes.push('Captured length exceeds the interface snapshot length.');
      if(cap<wire)p.capture_truncated=true;
      if(timestamp!==null && (!Number.isFinite(timestamp)||Math.abs(timestamp)>8640000000000000)){p.timestamp=null;p.notes.push('Timestamp outside supported date range.');}
      packets.push(p);if(packets.length%2000===0)progress(Math.min(99,Math.floor(offset/a.length*100)),packets.length);
    }
    if(v.getUint32(0,false)===0x0a0d0d0a){
      format='PCAPNG';let local=[];
      while(at<a.length){
        if(at+12>a.length)throw new Error('Incomplete PCAPNG block at byte '+at+'.');
        if(v.getUint32(at,false)===0x0a0d0d0a){
          if(at+28>a.length)throw new Error('Incomplete PCAPNG section header.');
          const magic=v.getUint32(at+8,true);if(![0x1a2b3c4d,0x4d3c2b1a].includes(magic))throw new Error('Invalid PCAPNG byte-order magic.');little=magic===0x1a2b3c4d;
        }
        const type=v.getUint32(at,little),len=v.getUint32(at+4,little);
        if(len<12||len%4||at+len>a.length||v.getUint32(at+len-4,little)!==len)throw new Error('Invalid PCAPNG block length at byte '+at+'.');
        if(type===0x0a0d0d0a){if(len<28||v.getUint16(at+12,little)!==1)throw new Error('Unsupported PCAPNG section version.');sections++;local=[];}
        else if(!sections)throw new Error('PCAPNG must start with a section header.');
        else if(type===1){
          if(len<20)throw new Error('Incomplete PCAPNG interface.');
          const iface={id:interfaces.length,section:sections,local_id:local.length,linktype:v.getUint16(at+8,little),snaplen:v.getUint32(at+12,little),resolution:1e-6,time_offset:0,name:'Interface '+local.length};
          for(let p=at+16;p+4<=at+len-4;){const code=v.getUint16(p,little),size=v.getUint16(p+2,little);p+=4;if(p+size>at+len-4)throw new Error('Invalid PCAPNG interface option.');if(!code)break;
            if(code===2)iface.name=new TextDecoder().decode(a.subarray(p,p+Math.min(size,256)));
            if(code===9&&size===1)iface.resolution=(a[p]&128)?Math.pow(2,-(a[p]&127)):Math.pow(10,-a[p]);
            if(code===14&&size===8)iface.time_offset=Number(v.getBigInt64(p,little));p+=Math.ceil(size/4)*4;}
          local.push(iface);interfaces.push(iface);
        }else if(type===6||type===2){
          if(len<32)throw new Error('Incomplete PCAPNG packet block.');const iface=local[type===6?v.getUint32(at+8,little):v.getUint16(at+8,little)];
          if(!iface)throw new Error('PCAPNG packet references an unknown interface.');
          const cap=v.getUint32(at+20,little),wire=v.getUint32(at+24,little);if(28+Math.ceil(cap/4)*4>len-4)throw new Error('PCAPNG packet data exceeds its block.');
          const ticks=v.getUint32(at+12,little)*4294967296+v.getUint32(at+16,little);add(at+28,cap,wire,(ticks*iface.resolution+iface.time_offset)*1000,iface,at);
        }else if(type===3){
          if(len<16||!local[0])throw new Error('Invalid PCAPNG simple packet block.');const wire=v.getUint32(at+8,little),cap=Math.min(wire,local[0].snaplen||wire);
          if(12+Math.ceil(cap/4)*4>len-4)throw new Error('Incomplete PCAPNG simple packet data.');add(at+12,cap,wire,null,local[0],at);
        }else {ignored[type]=(ignored[type]||0)+1;skipped++;}
        at+=len;
      }
    }else{
      format='PCAP';const magic=v.getUint32(0,false),known={2712847316:[false,1e-3],3569595041:[true,1e-3],2712812621:[false,1e-6],1295823521:[true,1e-6]};
      if(!known[magic])throw new Error('Unrecognised capture format. Choose an uncompressed PCAP or PCAPNG file.');
      if(a.length<24)throw new Error('Incomplete PCAP global header.');
      let scale;[little,scale]=known[magic];if(v.getUint16(4,little)!==2||v.getUint16(6,little)!==4)throw new Error('Unsupported PCAP version (expected 2.4).');
      const iface={id:0,section:1,local_id:0,name:'Capture interface',linktype:v.getUint32(20,little)&0xffff,snaplen:v.getUint32(16,little),resolution:scale/1000,time_offset:0};interfaces.push(iface);sections=1;at=24;
      while(at<a.length){if(at+16>a.length)throw new Error('Incomplete PCAP record header at byte '+at+'.');const sec=v.getUint32(at,little),fraction=v.getUint32(at+4,little),cap=v.getUint32(at+8,little),wire=v.getUint32(at+12,little);
        const invalidTime=fraction>=(scale===1e-3?1e6:1e9);if(invalidTime)warning('Out-of-range timestamp fraction at packet '+(packets.length+1)+'.');
        add(at+16,cap,wire,invalidTime?null:sec*1000+fraction*scale,iface,at);if(invalidTime)packets[packets.length-1].notes.push('Invalid timestamp fractional field.');at+=16+cap;}
    }
    interfaces.forEach(i=>{i.link_name=links[i.linktype]||'Unsupported link type '+i.linktype;});
    const connections=new Map(),hosts=new Map(),addresses=new Map(),transport=new Map(),applications=new Map();
    const counts={packets:packets.length,captured_bytes:0,original_bytes:0,tcp_payload_bytes:0,truncated_packets:0,malformed_packets:0,unsupported_packets:0,fragmented_packets:0,packets_with_notes:0,tcp_resets:0,tcp_syn:0,dns_messages:0,dns_error_responses:0,adb_headers:0,missing_timestamps:0};
    let start=null,end=null;
    function bump(map,key,n=1){map.set(key,(map.get(key)||0)+n);}
    function host(name,source,p,value=null){
      const key=name.toLowerCase();let h=hosts.get(key);if(!h){if(hosts.size>=20000)return;h={name,sources:[],packets:0,first_packet:p.number,answers:[]};hosts.set(key,h);}
      if(!h.sources.includes(source))h.sources.push(source);if(h.last_packet!==p.number){h.packets++;h.last_packet=p.number;}if(value&&!h.answers.includes(value)&&h.answers.length<32)h.answers.push(value);
      if(!p.names)p.names=[];if(!p.names.includes(name))p.names.push(name);
    }
    for(const p of packets){
      counts.captured_bytes+=p.captured_bytes;counts.original_bytes+=p.original_bytes;if(p.transport==='TCP')counts.tcp_payload_bytes+=p.payload_bytes;
      if(p.capture_truncated||p.notes.some(n=>n.includes('truncated in capture')))counts.truncated_packets++;
      if(p.malformed)counts.malformed_packets++;if(p.unsupported)counts.unsupported_packets++;if(p.fragmented)counts.fragmented_packets++;if(p.notes.length)counts.packets_with_notes++;
      if(p.tcp_flags&4)counts.tcp_resets++;if(p.tcp_flags&2)counts.tcp_syn++;
      if(p.timestamp===null)counts.missing_timestamps++;else {start=start===null?p.timestamp:Math.min(start,p.timestamp);end=end===null?p.timestamp:Math.max(end,p.timestamp);}
      bump(transport,p.transport);if(p.application)bump(applications,p.application);
      for(const ip of new Set([p.src,p.dst]))if(ip){let entry=addresses.get(ip);if(!entry){entry={address:ip,scope:addressScope(ip),packets:0};addresses.set(ip,entry);}entry.packets++;}
      if(p.dns){counts.dns_messages++;if(p.dns.response&&p.dns.rcode)counts.dns_error_responses++;for(const q of p.dns.questions)host(q.name,p.application+' question',p);for(const r of p.dns.records)host(r.name,p.application+' '+r.type,p,r.value);}
      if(p.tls_sni)host(p.tls_sni,'TLS SNI',p);if(p.http_host)host(p.http_host,'HTTP Host',p);if(p.adb)counts.adb_headers++;
      if(p.src&&p.dst){
        const ends=[endpoint(p.src,p.src_port),endpoint(p.dst,p.dst_port)].sort();const key=p.interface_id+'|'+p.transport+'|'+ends.join('|');
        let c=connections.get(key);if(!c){c={id:connections.size,interface_id:p.interface_id,transport:p.transport,a:ends[0],b:ends[1],packets:0,bytes:0,a_to_b:0,b_to_a:0,first_packet:p.number,first_time:null,last_time:null,names:[],applications:[],tcp_resets:0};connections.set(key,c);}
        p.connection=c.id;c.packets++;c.bytes+=p.captured_bytes;c[endpoint(p.src,p.src_port)===c.a?'a_to_b':'b_to_a']++;if(p.tcp_flags&4)c.tcp_resets++;
        if(p.timestamp!==null){c.first_time=c.first_time===null?p.timestamp:Math.min(c.first_time,p.timestamp);c.last_time=c.last_time===null?p.timestamp:Math.max(c.last_time,p.timestamp);}
        if(p.application&&!c.applications.includes(p.application))c.applications.push(p.application);
        for(const name of p.names||[])if(!c.names.includes(name)&&c.names.length<32)c.names.push(name);
      }
    }
    const notes=[
      'Conversation groups combine both directions for the same endpoints, transport and interface. Reused endpoint pairs can contain multiple sessions.',
      'Bytes are captured packet bytes, including protocol headers and retransmissions. They are not unique downloaded or uploaded content.',
      'DNS, HTTP Host and TLS SNI names are observed only in complete messages within individual packets. TCP streams and IP fragments are not reassembled; encrypted DNS, QUIC names and encrypted payloads are not decoded.',
      'A packet capture alone does not identify the Android app or UID that created each connection. Hostnames and IP addresses do not establish an app, owner, country or malicious behaviour.',
      'Checksums, retransmission analysis and packet-loss estimates are not evaluated. Raw packet bytes are available only while this capture is open.'
    ];
    if(!hosts.size)notes.unshift('No DNS, HTTP Host or TLS SNI names were decoded in this capture. This does not establish that no websites were used.');
    if(counts.adb_headers)notes.unshift('ADB message headers were detected by command and magic fields. This describes Android debugging protocol traffic; it does not establish who initiated it.');
    if(counts.unsupported_packets)warning(counts.unsupported_packets+' packets use link/network formats that were not decoded.');
    if(counts.missing_timestamps)warning(counts.missing_timestamps+' packets have no usable timestamp.');
    if(hosts.size>=20000)warning('Host list reached its 20,000-name limit.');
    const sorted=map=>Array.from(map,([name,packets])=>({name,packets})).sort((a,b)=>b.packets-a.packets);
    const summary={tool:'pcap',version:1,source_file:sourceFile,file_bytes:a.length,analyzed_at:new Date().toISOString(),format,sections,interfaces,counts,start_time:start,end_time:end,duration_seconds:start===null?null:(end-start)/1000,transports:sorted(transport),applications:sorted(applications),addresses:Array.from(addresses.values()).sort((a,b)=>b.packets-a.packets),connection_count:connections.size,host_count:hosts.size,ignored_blocks:ignored,skipped_blocks:skipped,warnings,notes};
    return {summary,packets,connections:Array.from(connections.values()).sort((a,b)=>b.bytes-a.bytes),hosts:Array.from(hosts.values()).sort((a,b)=>b.packets-a.packets),bytes:a};
  }
  function matches(row,kind,filters={}){
    if(filters.protocol && !(kind==='packets'?[row.transport,row.application]:[row.transport,...(row.applications||[])]).includes(filters.protocol))return false;
    if(filters.connection!==undefined && filters.connection!==null && kind==='packets' && row.connection!==Number(filters.connection))return false;
    if(filters.notes && kind==='packets' && !row.notes.length && !row.capture_truncated)return false;
    if(filters.reset && kind==='packets' && !(row.tcp_flags&4))return false;
    const q=String(filters.search||'').trim().toLowerCase();if(!q)return true;
    const fields=kind==='packets'?[row.number,row.src,row.dst,row.src_port,row.dst_port,row.transport,row.application,row.info,...(row.names||[])]:kind==='connections'?[row.a,row.b,row.transport,...row.applications,...row.names]:[row.name,...row.sources,...row.answers];
    return fields.join(' ').toLowerCase().includes(q);
  }
  function query(data,kind='packets',filters={},page=0,pageSize=100){
    if(!['packets','connections','hosts'].includes(kind))throw new Error('Unknown explorer view.');
    const rows=data[kind].filter(row=>matches(row,kind,filters));pageSize=Math.min(100,Math.max(1,Number(pageSize)||100));page=Math.min(Math.max(0,Math.floor(Number(page)||0)),Math.max(0,Math.ceil(rows.length/pageSize)-1));
    return {kind,total:rows.length,page,page_size:pageSize,rows:rows.slice(page*pageSize,(page+1)*pageSize)};
  }
  function inspect(data,number){const p=data.packets[Number(number)-1];if(!p)throw new Error('Packet not found.');return {packet:p,hex:Array.from(data.bytes.subarray(p.offset,p.offset+Math.min(p.captured_bytes,1024))),hex_limit:1024};}
  function report(data){return {...data.summary,connections:data.connections,hosts:data.hosts};}
  return Object.freeze({analyse,query,inspect,matches,report,addressScope,endpoint,MAX_BYTES,MAX_PACKETS});
})();
if(typeof module!=='undefined' && module.exports)module.exports=PcapAnalysis;
