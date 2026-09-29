const PcapTool = (() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=value=>Number(value||0).toLocaleString();
  const size=value=>value<1024?num(value)+' B':value<1048576?(value/1024).toFixed(1)+' KiB':(value/1048576).toFixed(2)+' MiB';
  const date=value=>value===null?'Not recorded':new Date(value).toISOString();
  const endpoint=(ip,port)=>!ip?'Not decoded':port==null?ip:(ip.includes(':')?'['+ip+']':ip)+':'+port;
  function table(headers,rows){return '<div class="table-wrap"><table class="pcap-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  const button=(action,label)=>'<button class="button small" data-pcap-action="'+action+'">'+label+'</button>';
  function mount(page){
    let worker=null,summary=null,tab='overview',filters={},pageNumber=0,queryId=0,inspectId=0,timer=null;
    const $=id=>document.getElementById('pcap-'+id);
    page.innerHTML=`<div class="page-heading"><div><div class="eyebrow">NETWORK CAPTURE</div><h1>PCAP Analyser</h1><p class="subtitle">Explore connections, observed names, and the packets behind them.</p></div></div>
      <div id="pcap-upload" class="upload-panel"><div class="upload-icon"><svg class="icon"><use href="#i-upload"/></svg></div><h2>Drop your packet capture here</h2><p>Open an uncompressed PCAP or PCAPNG file. Analysis stays in your browser.</p><div class="button-row"><button class="button primary" data-pcap-action="browse">Choose capture</button></div><p class="upload-hint">.PCAP · .PCAPNG · .CAP · UP TO 100 MiB / 200,000 PACKETS</p><input id="pcap-file" type="file" accept=".pcap,.pcapng,.cap" aria-label="Choose packet capture" hidden></div>
      <div id="pcap-error" class="notice error" role="alert" hidden></div>
      <div id="pcap-loading" class="loading" hidden><span class="spinner" aria-hidden="true"></span><span id="pcap-progress" role="status" aria-live="polite">Reading capture…</span>${button('cancel','Cancel')}</div>
      <div id="pcap-filebar" class="file-bar" hidden><div class="file-info"><div><span id="pcap-filename" class="filename"></span><span id="pcap-filemeta" class="file-meta"></span></div></div><div class="button-row report-actions">${button('json','JSON report')}${button('md','Report')}${button('reset','New capture')}</div></div>
      <div id="pcap-results" hidden></div>
      <div id="pcap-help" class="help-grid"><div class="help-card"><span class="step">01 / OPEN</span><h3>Read the capture</h3><p>Supports raw IP, Ethernet, Linux cooked and loopback captures, with IPv4 and IPv6.</p></div><div class="help-card"><span class="step">02 / EXPLORE</span><h3>Follow a connection</h3><p>Filter packets and conversations. Inspect DNS, visible HTTP hosts, TLS server names, and ADB headers.</p></div><div class="help-card"><span class="step">03 / EXPORT</span><h3>Keep the evidence</h3><p>Download a report or matching rows. Raw captures remain in this session and are not saved in browser history.</p></div></div>
      <dialog id="pcap-dialog" aria-labelledby="pcap-dialog-title"><div class="dialog-head"><div><div class="eyebrow">PACKET EVIDENCE</div><h2 id="pcap-dialog-title">Packet details</h2></div>${button('close','Close')}</div><div id="pcap-detail"></div></dialog>`;
    function error(message){$('error').textContent=message;$('error').hidden=false;}
    function busy(value){page.setAttribute('aria-busy',String(value));$('loading').hidden=!value;}
    function reset(){worker?.terminate();worker=null;summary=null;clearTimeout(timer);queryId++;inspectId++;filters={};tab='overview';pageNumber=0;busy(false);for(const name of ['filebar','results','error'])$(name).hidden=true;$('results').replaceChildren();$('upload').hidden=false;$('help').hidden=false;if($('dialog').open)$('dialog').close();}
    function send(message){if(worker)worker.postMessage(message);}
    function open(file){
      if(!file||!file.size||file.size>100*1024*1024){error('Choose a non-empty capture up to 100 MiB.');return;}
      if(!/\.(pcap|pcapng|cap)$/i.test(file.name)){error('Choose a .pcap, .pcapng or .cap file.');return;}
      reset();busy(true);$('upload').hidden=true;$('help').hidden=true;$('progress').textContent='Opening '+file.name+'…';
      let active;try{active=new Worker(new URL('pcap-worker.js?v=1.0.0',document.baseURI));}catch(_){busy(false);$('upload').hidden=false;error('The capture worker could not start. Serve the tool over HTTP or HTTPS with the PCAP files beside index.html.');return;}
      worker=active;
      active.onmessage=({data})=>{
        if(worker!==active)return;
        if(data.type==='progress')$('progress').textContent=data.message;
        if(data.type==='result'){summary=data.summary;busy(false);$('filebar').hidden=false;$('results').hidden=false;$('filename').textContent=summary.source_file;$('filemeta').textContent=summary.format+' · '+size(summary.file_bytes)+' · timestamps displayed in UTC';render();}
        if(data.type==='query'&&data.request_id===queryId)renderRows(data);
        if(data.type==='inspect'&&data.request_id===inspectId)showPacket(data);
        if(data.type==='export'){download(data.blob,data.filename);exportBusy(false);}
        if(data.type==='error'){
          if(data.operation==='query'&&data.request_id!==queryId)return;
          if(data.operation==='inspect'&&data.request_id!==inspectId)return;
          if(data.operation==='open'){worker.terminate();worker=null;busy(false);$('upload').hidden=false;$('help').hidden=false;}
          error(data.message);exportBusy(false);
        }
      };
      active.onerror=event=>{event.preventDefault();if(worker!==active)return;reset();error('The PCAP worker stopped. Check that pcap-worker.js and pcap-analysis.js are beside index.html, then reopen the file.');};
      active.onmessageerror=()=>{if(worker===active){reset();error('The capture result could not be received. Reopen the file.');}};
      try{active.postMessage({type:'open',file});}catch(_){reset();error('The file could not be passed to the local analyser.');}
    }
    function stat(label,value,note){return '<div class="stat"><div class="stat-label">'+esc(label)+'</div><div class="pcap-stat-value">'+esc(value)+'</div><div class="stat-note">'+esc(note)+'</div></div>';}
    function panel(title,body){return '<section class="panel"><h2>'+esc(title)+'</h2>'+body+'</section>';}
    function bars(rows){const max=Math.max(1,...rows.map(r=>r.packets));return '<div class="pcap-bars">'+rows.map(r=>'<div class="pcap-bar"><span>'+esc(r.name)+'</span><div class="pcap-bar-track"><span style="width:'+Math.max(1,r.packets/max*100)+'%"></span></div><span>'+num(r.packets)+'</span></div>').join('')+'</div>';}
    function render(){
      const s=summary,c=s.counts;const tabs=[['overview','Overview'],['connections','Connections'],['hosts','DNS & names'],['packets','Packets'],['capture','Capture details']];
      $('results').innerHTML='<div class="stats pcap-stats">'+stat('Packets',num(c.packets),size(c.captured_bytes)+' captured packet bytes')+stat('Duration',s.duration_seconds===null?'Unknown':s.duration_seconds.toFixed(2)+' s','Capture timestamps')+stat('Conversations',num(s.connection_count),num(s.addresses.length)+' distinct IP addresses')+stat('Observed names',num(s.host_count),'DNS · HTTP Host · TLS SNI')+'</div><div class="tabs" aria-label="PCAP views">'+tabs.map(([key,label])=>'<button class="tab '+(tab===key?'active':'')+'" data-pcap-tab="'+key+'" aria-pressed="'+(tab===key)+'">'+label+'</button>').join('')+'</div><div id="pcap-content"></div>';
      if(tab==='overview'){
        const findings=[];
        if(c.adb_headers)findings.push('<strong>'+num(c.adb_headers)+' ADB message headers detected.</strong><p>These packets contain Android debugging protocol headers. Inspect the packet evidence or filter by ADB.</p>');
        if(!s.host_count)findings.push('<strong>No website names decoded.</strong><p>No complete DNS names, HTTP Host fields or TLS SNI names were found. The capture may contain other traffic or encrypted names.</p>');
        $('content').innerHTML=findings.map(body=>'<div class="notice">'+body+'</div>').join('')+'<div class="split">'+panel('Transport protocols',bars(s.transports))+panel('Recognised application headers',s.applications.length?bars(s.applications):'<p class="pcap-help">No supported application headers were decoded.</p>')+'</div>'+panel('Addresses in this capture',table(['IP address','Address scope','Packets'],s.addresses.slice(0,30).map(r=>['<span class="pcap-endpoint">'+esc(r.address)+'</span>',esc(r.scope),num(r.packets)]))+(s.addresses.length>30?'<p class="hint">Showing 30 addresses. The JSON report includes all addresses.</p>':''))+'<div class="split">'+panel('TCP and capture checks',table(['Observation','Packets'],[['TCP reset flag',num(c.tcp_resets)],['Truncated packets',num(c.truncated_packets)],['Malformed headers',num(c.malformed_packets)],['Unsupported formats',num(c.unsupported_packets)],['IP fragments',num(c.fragmented_packets)]])) + panel('How to read this', '<p class="pcap-help">Counts describe the capture, not whether traffic is safe or malicious. TCP resets can occur during normal connection teardown.</p><p class="pcap-help">App identity and UID are not present in ordinary PCAP records. Encrypted payloads are not decrypted.</p>')+'</div>';
      }else if(tab==='capture'){
        $('content').innerHTML=panel('Capture metadata','<dl class="pcap-meta">'+[['File',s.source_file],['Format',s.format],['File size',size(s.file_bytes)],['First timestamp',date(s.start_time)],['Last timestamp',date(s.end_time)],['Analysed at',s.analyzed_at],['Sections',s.sections],['Ignored non-packet blocks',s.skipped_blocks]].map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>')+panel('Capture interfaces',table(['Interface','Link type','Snapshot length','Timestamp resolution'],s.interfaces.map(i=>[esc(i.name)+'<br><span class="tiny">Section '+i.section+' · ID '+i.local_id+'</span>',esc(i.link_name)+' ('+i.linktype+')',i.snaplen?num(i.snaplen)+' bytes':'Unlimited',esc(i.resolution)+' seconds'])))+panel('Coverage and limitations','<ul class="notes">'+s.warnings.concat(s.notes).map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul>');
      }else{
        const kinds={connections:'Conversations',hosts:'Observed names',packets:'Packets'},protocols=Array.from(new Set([...s.transports,...s.applications].map(r=>r.name))).sort();
        const hint=tab==='connections'?'Both directions are grouped by endpoints, transport, and capture interface. Reused endpoint pairs may contain multiple sessions.':tab==='hosts'?'Names are taken from packet evidence. DNS answers show recorded addresses or aliases; they are not ownership or app attribution.':'Times are relative to the earliest usable capture timestamp. Open Inspect for headers, capture offsets and packet bytes.';
        $('content').innerHTML='<section class="panel"><h2>'+kinds[tab]+'</h2><p class="hint">'+hint+'</p>'+(filters.connection!==undefined?'<div class="notice">Showing packets in conversation '+filters.connection+'. '+button('clear','Show all packets')+'</div>':'')+'<div class="pcap-filters"><label>Search<input id="pcap-search" type="search" placeholder="'+(tab==='hosts'?'Name or answer…':'IP, port, protocol or text…')+'" value="'+esc(filters.search||'')+'"></label>'+(tab!=='hosts'?'<label>Protocol<select id="pcap-protocol"><option value="">All protocols</option>'+protocols.map(name=>'<option value="'+esc(name)+'"'+(filters.protocol===name?' selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>':'')+(tab==='packets'?'<label class="pcap-checkbox"><input id="pcap-notes" type="checkbox"'+(filters.notes?' checked':'')+'> Capture notes only</label>':'')+'</div><div class="filter-footer"><span id="pcap-count" role="status">Loading…</span><div class="button-row">'+button('clear','Clear filters')+button('export-json','Export matching JSON')+button('export-csv','CSV')+'</div></div><div id="pcap-list"></div><div class="pagination"><span id="pcap-page"></span><div class="button-row">'+button('prev','Previous')+button('next','Next')+'</div></div></section>';
        $('search').addEventListener('input',()=>{filters.search=$('search').value;pageNumber=0;queryId++;clearTimeout(timer);timer=setTimeout(query,160);});
        if($('protocol'))$('protocol').addEventListener('change',()=>{filters.protocol=$('protocol').value;pageNumber=0;query();});
        if($('notes'))$('notes').addEventListener('change',()=>{filters.notes=$('notes').checked;pageNumber=0;query();});query();
      }
    }
    function query(){if(!summary||!['connections','hosts','packets'].includes(tab))return;send({type:'query',kind:tab,filters,page:pageNumber,request_id:++queryId});}
    function renderRows(data){
      if(data.kind!==tab||!$('list'))return;pageNumber=data.page;$('count').textContent=num(data.total)+' matching '+(tab==='connections'?'conversations':tab==='hosts'?'names':'packets');
      if(!data.rows.length)$('list').innerHTML='<div class="pcap-empty">'+(tab==='hosts'&&!summary.host_count?'No names were decoded in this capture. Encrypted or incomplete name data is not resolved.':'No records match these filters.')+'</div>';
      else if(tab==='packets')$('list').innerHTML=table(['Packet / time','Source','Destination','Protocol','Bytes','Evidence'],data.rows.map(p=>['<strong>#'+p.number+'</strong><br><span class="tiny">'+(p.timestamp===null?'Time unknown':((p.timestamp-summary.start_time)/1000).toFixed(6)+' s')+'</span>','<span class="pcap-endpoint">'+esc(endpoint(p.src,p.src_port))+'</span>','<span class="pcap-endpoint">'+esc(endpoint(p.dst,p.dst_port))+'</span>','<strong>'+esc(p.application||p.transport)+'</strong><br><span class="tiny">'+esc(p.info.slice(0,140))+'</span>',num(p.captured_bytes)+(p.notes.length||p.capture_truncated?'<br><span class="tiny">Capture note</span>':''),'<button class="button small" data-pcap-packet="'+p.number+'">Inspect</button>']));
      else if(tab==='connections')$('list').innerHTML=table(['Endpoints','Protocol / names','Packets','Captured bytes','Evidence'],data.rows.map(c=>['<span class="pcap-endpoint">'+esc(c.a)+'<br>↔ '+esc(c.b)+'</span>',esc([c.transport,...c.applications].join(' · '))+'<br><span class="tiny">'+esc(c.names.join(', '))+'</span>',num(c.packets)+'<br><span class="tiny">A→B '+num(c.a_to_b)+' · B→A '+num(c.b_to_a)+'</span>',size(c.bytes),'<button class="button small" data-pcap-connection="'+c.id+'">Show packets</button>']));
      else $('list').innerHTML=table(['Observed name','Evidence type','Packets','Recorded answers','Evidence'],data.rows.map(h=>[esc(h.name),esc(h.sources.join(', ')),num(h.packets),esc(h.answers.join(', ')||'No decoded answer'),'<button class="button small" data-pcap-packet="'+h.first_packet+'">Packet '+h.first_packet+'</button>']));
      const pages=Math.max(1,Math.ceil(data.total/data.page_size));$('page').textContent='Page '+(data.page+1)+' of '+pages;page.querySelector('[data-pcap-action="prev"]').disabled=data.page===0;page.querySelector('[data-pcap-action="next"]').disabled=data.page+1>=pages;
    }
    function showPacket(data){
      const p=data.packet;$('dialog-title').textContent='Packet #'+p.number;
      const fields=[['Timestamp (UTC)',date(p.timestamp)],['Source',endpoint(p.src,p.src_port)],['Destination',endpoint(p.dst,p.dst_port)],['Transport / application',[p.transport,p.application].filter(Boolean).join(' · ')],['Capture interface',p.interface_id],['Record / packet file offset',p.record_offset+' / '+p.offset+' bytes'],['Captured / original length',p.captured_bytes+' / '+p.original_bytes+' bytes'],['Decoded transport payload',p.payload_bytes+' bytes'],['Flags',(p.flags||[]).join(', ')||'Not applicable']];
      if(p.sequence!==undefined)fields.push(['TCP sequence / acknowledgment',p.sequence+' / '+p.acknowledgment],['TCP window',p.window]);
      let hex='';for(let i=0;i<data.hex.length;i+=16){const chunk=data.hex.slice(i,i+16);hex+=i.toString(16).padStart(6,'0')+'  '+chunk.map(b=>b.toString(16).padStart(2,'0')).join(' ').padEnd(47,' ')+'  '+chunk.map(b=>b>=32&&b<=126?String.fromCharCode(b):'.').join('')+'\n';}
      $('detail').innerHTML='<dl class="pcap-meta">'+fields.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'+(p.capture_truncated?'<p class="notice">Only part of the original packet was captured.</p>':'')+(p.notes.length?'<ul class="notes">'+p.notes.map(n=>'<li>'+esc(n)+'</li>').join(''):'')+((p.dns||p.adb||p.tls_sni||p.http_host)?'<h3>Decoded application evidence</h3><pre>'+esc(JSON.stringify(p.dns||p.adb||{tls_sni:p.tls_sni,http_host:p.http_host},null,2))+'</pre>':'')+'<h3>Captured bytes</h3><p class="hint">Offsets below are relative to the packet. Showing '+data.hex.length+' of '+p.captured_bytes+' captured bytes; preview limit '+data.hex_limit+'.</p><pre>'+esc(hex)+'</pre>';
      if(!$('dialog').open)$('dialog').showModal();
    }
    function exportBusy(value){page.querySelectorAll('[data-pcap-action="json"],[data-pcap-action="md"],[data-pcap-action="export-json"],[data-pcap-action="export-csv"]').forEach(b=>b.disabled=value);}
    page.addEventListener('click',event=>{
      const target=event.target.closest('button');if(!target||target.disabled)return;const d=target.dataset;
      if(d.pcapTab){clearTimeout(timer);queryId++;tab=d.pcapTab;filters={};pageNumber=0;render();page.querySelector('.tab.active')?.focus({preventScroll:true});}
      if(d.pcapPacket!==undefined)send({type:'inspect',number:Number(d.pcapPacket),request_id:++inspectId});
      if(d.pcapConnection!==undefined){tab='packets';filters={connection:Number(d.pcapConnection)};pageNumber=0;render();}
      const action=d.pcapAction;
      if(action==='browse')$('file').click();
      if(action==='close'){$('dialog').close();inspectId++;}
      if(action==='cancel'||action==='reset')reset();
      if(action==='clear'){filters={};pageNumber=0;render();}
      if(action==='prev'){pageNumber=Math.max(0,pageNumber-1);query();}
      if(action==='next'){pageNumber++;query();}
      if(['json','md','export-json','export-csv'].includes(action)){exportBusy(true);send({type:'export',kind:action.startsWith('export-')?tab:'report',format:action.replace('export-',''),filters});}
    });
    $('file').addEventListener('change',event=>{if(event.target.files[0])open(event.target.files[0]);event.target.value='';});
    const drop=$('upload');for(const name of ['dragenter','dragover'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('dragging');});
    drop.addEventListener('dragleave',event=>{if(!drop.contains(event.relatedTarget))drop.classList.remove('dragging');});
    drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('dragging');const files=event.dataTransfer.files;if(files.length!==1){error('Choose one packet capture at a time.');return;}open(files[0]);});
    window.addEventListener('hashchange',()=>{if(location.hash!=='#pcap'&&$('dialog').open)$('dialog').close();});
    window.addEventListener('beforeunload',()=>worker?.terminate());
  }
  return Object.freeze({mount});
})();
