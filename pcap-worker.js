'use strict';
importScripts('pcap-analysis.js?v=1.0.0');
let capture=null;
const send=message=>postMessage(message);
function csv(rows,kind){
  const fields=kind==='packets'?['number','timestamp','src','src_port','dst','dst_port','transport','application','captured_bytes','original_bytes','info']:kind==='connections'?['a','b','transport','applications','packets','bytes','names']:['name','sources','packets','answers','first_packet'];
  const cell=value=>{let s=Array.isArray(value)?value.join('; '):String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return fields.join(',')+'\r\n'+rows.map(row=>fields.map(key=>cell(row[key])).join(',')).join('\r\n');
}
function markdown(data){
  const s=data.summary, block=value=>String(value??'').split('\n').map(line=>'    '+line).join('\n');
  const lines=['# PCAP analysis','',block(s.source_file),'','Format: '+s.format,'','## Counts',''];
  for(const [key,value] of Object.entries(s.counts))lines.push('- '+key.replace(/_/g,' ')+': '+value);
  lines.push('','Duration: '+(s.duration_seconds===null?'Not recorded':s.duration_seconds.toFixed(3)+' seconds'),'','## Conversations','');
  for(const c of data.connections)lines.push(block(c.a+' ↔ '+c.b+' | '+c.transport+' | '+c.packets+' packets | '+c.bytes+' captured bytes'+(c.applications.length?' | '+c.applications.join(', '):'')),'');
  lines.push('## Observed names','');for(const h of data.hosts)lines.push(block(h.name+' | '+h.sources.join(', ')+' | first packet '+h.first_packet+' | '+h.answers.join(', ')),'');
  lines.push('## Notes','',...s.warnings.concat(s.notes).map(note=>'- '+note));return lines.join('\n');
}
onmessage=async ({data})=>{
  try{
    if(data.type==='open'){
      capture=null;const file=data.file;
      if(!file||typeof file.arrayBuffer!=='function')throw new Error('Choose a PCAP or PCAPNG file.');
      if(!file.size||file.size>PcapAnalysis.MAX_BYTES)throw new Error('Choose a non-empty capture up to 100 MiB.');
      send({type:'progress',message:'Reading capture locally…'});
      capture=PcapAnalysis.analyse(await file.arrayBuffer(),file.name,(percent,count)=>send({type:'progress',message:'Decoded '+count.toLocaleString()+' packets · '+percent+'%'}));
      send({type:'result',summary:capture.summary});return;
    }
    if(!capture)throw new Error('Open a capture first.');
    if(data.type==='query')send({type:'query',request_id:data.request_id,...PcapAnalysis.query(capture,data.kind,data.filters,data.page)});
    else if(data.type==='inspect')send({type:'inspect',request_id:data.request_id,...PcapAnalysis.inspect(capture,data.number)});
    else if(data.type==='export'){
      let output,mime,filename;
      if(data.kind==='report'){
        const md=data.format==='md';output=md?markdown(capture):JSON.stringify(PcapAnalysis.report(capture),null,2);mime=md?'text/markdown':'application/json';filename='pcap-analysis.'+(md?'md':'json');
      }else{
        if(!['packets','connections','hosts'].includes(data.kind))throw new Error('Unknown export view.');
        const rows=capture[data.kind].filter(row=>PcapAnalysis.matches(row,data.kind,data.filters));
        const isCSV=data.format==='csv';output=isCSV?csv(rows,data.kind):JSON.stringify({tool:'pcap-filtered',source_file:capture.summary.source_file,kind:data.kind,filters:data.filters||{},matching_records:rows.length,records:rows},null,2);mime=isCSV?'text/csv':'application/json';filename='pcap-'+data.kind+'.'+(isCSV?'csv':'json');
      }
      send({type:'export',blob:new Blob([output],{type:mime+';charset=utf-8'}),filename});
    }else throw new Error('Unknown capture operation.');
  }catch(error){send({type:'error',operation:data?.type,request_id:data?.request_id,message:error.message||'The capture could not be decoded.'});}
};
