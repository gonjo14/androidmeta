const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('worker reads the shared analyser, imports metadata, and reports malformed imports', async () => {
  const messages = [];
  const context = vm.createContext({TextDecoder,TextEncoder,Blob,File,URL,setTimeout,clearTimeout,postMessage: message => messages.push(message)});
  context.self = context;
  context.importScripts = filename => vm.runInContext(fs.readFileSync(path.join(root,filename.split('?')[0]),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'analysis-worker.js'),'utf8'),context);
  const inventory = [{name:'com.example.reader',files:[{path:'/data/app/base.apk'},{path:'/data/app/split_config.en.apk'}]}];
  await context.onmessage({data:{type:'open',tool:'packages',file:new File([JSON.stringify(inventory)],'packages.json')}});
  const report = messages.find(m=>m.type==='result')?.summary;
  assert.ok(report);
  assert.equal(report.counts.split_packages,1);
  await context.onmessage({data:{type:'package-metadata',summary:report,file:new File([JSON.stringify([{name:'com.example.reader',label:'Reader',versionName:'1.2',versionCode:'12'}])],'labels.json')}});
  const imported = messages.find(m=>m.type==='metadata-result')?.summary;
  assert.equal(imported.packages[0].display_name,'Reader');
  assert.equal(imported.packages[0].metadata.version_code.value,'12');
  await context.onmessage({data:{type:'package-metadata',summary:imported,file:new File(['[oops'],'bad.json')}});
  assert.match(messages.at(-1).message,/Invalid metadata JSON/);
  assert.equal(imported.packages[0].display_name,'Reader');
});

test('package view renders escaped names, versions and APK details, filters, and exports', () => {
  const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
  const viewStart = app.indexOf('const PackagesView = (() => {');
  const viewEnd = app.indexOf('\n})();',viewStart) + '\n})();'.length;
  const scope = vm.createContext({Intl,Blob});
  const escapeLine = app.split('\n').find(line=>line.trimStart().startsWith('const escapeHTML ='));
  vm.runInContext(app.slice(0,app.indexOf('// PackageAnalysis is loaded'))+'\n'+fs.readFileSync(path.join(root,'package-analysis.js'),'utf8')+'\n'+app.slice(viewStart,viewEnd)+'\n'+escapeLine+'\nglobalThis.api=PackageAnalysis;globalThis.view=PackagesView;globalThis.escapeHTML=escapeHTML;',scope);
  const summary=scope.api.analyse(JSON.stringify([
    {name:'com.example.reader',label:'<img src=x onerror=alert(1)>',versionName:'1.2',versionCode:12,files:[{path:'/data/app/base.apk'},{path:'/data/app/split_config.en.apk'}]},
    {name:'com.example.other',files:[{path:'/system/Other.apk'}]}
  ]),'packages.json');
  const elements=new Map();
  const $=id=> {
    if(!elements.has(id)) elements.set(id,{tagName:['package-type','package-disabled','package-installer','package-review','package-origin','package-layout'].includes(id)?'SELECT':'INPUT',value:'',handlers:{},addEventListener(name,handler){this.handlers[name]=handler;},showModal(){this.open=true;},focus(){},click(){}});
    return elements.get(id);
  };
  const escapeHTML=scope.escapeHTML;
  let exported;
  const helpers={$,escapeHTML,number:n=>String(n||0),stat:(a,b,c)=>`${a}: ${b} ${c}`,panel:(a,b,c)=>`<section><h2>${a}</h2>${b}${c}</section>`,table:(heads,rows)=>`<table><thead>${heads.join('|')}</thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`,notes:rows=>rows.join('\n'),download:blob=>{exported=blob;},importPackageMetadata:()=>{}};
  const state={filters:{},page:0};
  scope.view.render(summary,state,helpers);
  assert.equal($('package-count').textContent,'2 matching packages');
  assert.match($('package-list').innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch($('package-list').innerHTML,/<img src=x/);
  assert.match($('package-list').innerHTML,/1 base \+ 1 split/);
  assert.match($('package-list').innerHTML,/Language split/);
  assert.match($('package-list').innerHTML,/v1\.2/);
  $('package-layout').value='multiple'; $('package-layout').handlers.change();
  assert.equal($('package-count').textContent,'1 matching packages');
  assert.equal(($('package-list').innerHTML.match(/<tr>/g)||[]).length,1);
  $('package-export').onclick(); assert.ok(exported);
  scope.view.showDetails(summary,0,helpers);
  assert.match($('package-content').innerHTML,/One package, grouped APK files/);
  assert.match($('package-content').innerHTML,/\$\[0\]\.versionName/);
  assert.equal($('package-dialog').open,true);
  const markdown=scope.view.markdown(summary);
  assert.match(markdown,/1 base \+ 1 split/);
  assert.match(markdown,/version_name: 1\.2/);
});

test('HTML loads the shared analyser before the UI with matching asset versions',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sources=[...html.matchAll(/<script src="([^\"]+)"/g)].map(m=>m[1]);
  assert.equal(sources[0],'package-analysis.js?v=0.5.2');
  assert.equal(sources[1],'app.js?v=0.5.2');
  for(const src of sources) assert.ok(fs.existsSync(path.join(root,src.split('?')[0])));
  assert.match(fs.readFileSync(path.join(root,'analysis-worker.js'),'utf8'),/importScripts\('package-analysis.js\?v=0\.5\.2'\)/);
});
