const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const data = require('../data.js');
const root = path.resolve(__dirname,'..');
const gear = {id:'gear-1',tipo:'canna',nome:'Canna test',quantita:2,createdAt:'2026-09-01T10:00:00Z',favorito:true};
const empty = () => ({attrezzatura:[],spot:[],diario:[],catture:[]});
function storage() {
  const values = new Map();
  return {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,String(value)), removeItem:key => values.delete(key), values};
}
test('Legacy v3 backup retains IDs, references, dates, counts and photos', () => {
  const file = {...empty(),version:'3.0',attrezzatura:[gear],spot:[{id:'spot-1',nome:'Lago',lat:42.1,lng:11.7}],diario:[{id:'trip-1',data:'2026-09-02',attIds:['gear-1'],spotId:'spot-1'}],catture:[{id:'catch-1',data:'2026-09-02',specie:'Carpa',peso:'1.25',foto:'data:image/jpeg;base64,YWJj'}]};
  const clean=data.validateBackup(file);
  assert.equal(clean.attrezzatura[0].id,gear.id); assert.equal(clean.attrezzatura[0].quantita,2);
  assert.deepEqual(clean.diario[0].attIds,['gear-1']); assert.equal(clean.diario[0].spotId,'spot-1');
  assert.equal(clean.catture[0].foto,file.catture[0].foto);
});
test('Empty backup is restorable; missing collections cannot silently erase data', () => {
  assert.deepEqual(data.validateBackup(empty()).spot,[]);
  assert.throws(()=>data.validateBackup({spot:[]}),/backup/);
  assert.throws(()=>data.validateBackup({...empty(),diario:'bad'}));
});
test('Reject unsafe IDs, duplicate IDs, invalid coordinates and impossible dates', () => {
  assert.throws(()=>data.validateBackup({...empty(),attrezzatura:[{...gear,id:'" onmouseover="bad'}]}));
  assert.throws(()=>data.validateBackup({...empty(),attrezzatura:[gear,gear]}),/duplicati/);
  assert.throws(()=>data.validateBackup({...empty(),spot:[{id:'s',nome:'X',lat:91,lng:0}]}));
  assert.equal(data.date('2024-02-29'),true); assert.equal(data.date('2026-02-29'),false);
  assert.throws(()=>data.validateBackup({...empty(),diario:[{id:'d',data:'2026-02-31'}]}));
});
test('Photo URLs are restricted to supported inline image data, never remote or executable URLs', () => {
  for (const value of ['javascript:alert(1)','https://evil.invalid/photo','data:image/svg+xml;base64,YWJj','data:image/jpeg;base64,YWJj" onerror="bad']) assert.equal(data.photo(value),null);
  assert.equal(data.photo('data:image/png;base64,YWJj'),'data:image/png;base64,YWJj');
});
test('Merge is idempotent and imported IDs update existing records without duplicates', () => {
  const incoming=[{...gear,nome:'Updated'},{...gear,id:'gear-2'}];
  const merged=data.merge([gear],incoming); assert.equal(merged.length,2); assert.equal(merged[0].nome,'Updated');
  assert.deepEqual(data.merge(merged,incoming),merged);
});
test('Storage quota failure rolls back all collections, including missing keys', () => {
  const db=storage(); db.setItem('a','[1]'); let count=0;
  const write=db.setItem; db.setItem=(key,value)=>{ if (++count===2) throw new Error('QuotaExceededError'); write(key,value); };
  assert.throws(()=>data.writeAtomic(db,{a:[2],b:[3]}));
  assert.equal(db.getItem('a'),'[1]'); assert.equal(db.getItem('b'),null);
});
function app() {
  const db=storage(), elements=new Map();
  const element = id => { if(!elements.has(id)) elements.set(id,{value:'',dataset:{},textContent:'',classList:{add(){},remove(){},toggle(){}},style:{},querySelector(){return null;}}); return elements.get(id); };
  const window={addEventListener(){},matchMedia(){return {matches:false};}};
  const ctx=vm.createContext({window,document:{getElementById:element,addEventListener(){},querySelectorAll(){return [];},querySelector(){return null;}},localStorage:db,FIData:data,console,Date,setTimeout(){},clearTimeout(){},URL,Blob,navigator:{onLine:true},location:{hash:''}});
  vm.runInContext(fs.readFileSync(path.join(root,'script.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'upgrade.js'),'utf8'),ctx);
  vm.runInContext('refreshAll = () => {}; renderChecklist = () => {}; triggerAutosave = () => {}; showToast = () => {};',ctx);
  return {ctx,db,element};
}
test('Editing preserves original ID, creation date and favourite flag', () => {
  const {ctx,element}=app(); element('form-att').dataset.editId=gear.id;
  const list=[{...gear}], replacement={id:'new-id',nome:'Updated',quantita:3};
  ctx.upsertItem(list,replacement,'form-att');
  assert.equal(list.length,1); assert.equal(list[0].id,gear.id); assert.equal(list[0].createdAt,gear.createdAt); assert.equal(list[0].favorito,true); assert.equal(list[0].quantita,3);
});
test('Import merge preserves existing rows, replacement keeps a recovery snapshot', () => {
  const {ctx,db,element}=app(); db.setItem('fi_attrezzatura',JSON.stringify([gear]));
  element('import-mode').value='merge'; ctx.window._importData={att:[{...gear,id:'g2'}],spot:[],diario:[],catture:[]};
  ctx.applyImport(); assert.equal(JSON.parse(db.getItem('fi_attrezzatura')).length,2);
  assert.equal(JSON.parse(db.getItem('fi_pre_import')).attrezzatura[0].id,gear.id);
  element('import-mode').value='replace'; ctx.window._importData={att:[],spot:[],diario:[],catture:[]}; ctx.applyImport();
  assert.equal(JSON.parse(db.getItem('fi_attrezzatura')).length,0);
  assert.equal(JSON.parse(db.getItem('fi_pre_import')).attrezzatura.length,2);
});
test('Import stops before altering collections when recovery storage fails', () => {
  const {ctx,db,element}=app(); db.setItem('fi_attrezzatura',JSON.stringify([gear])); const write=db.setItem;
  db.setItem=(key,value)=>{ if(key==='fi_pre_import') throw new Error('Quota'); write(key,value); };
  element('import-mode').value='replace'; ctx.window._importData={att:[],spot:[],diario:[],catture:[]}; ctx.applyImport();
  assert.equal(JSON.parse(db.getItem('fi_attrezzatura'))[0].id,gear.id);
});
test('Delete/undo restores same ID and never duplicates recovered row', () => {
  const {ctx,db}=app(); db.setItem('fi_attrezzatura',JSON.stringify([gear]));
  ctx.softDelete('fi_attrezzatura',gear.id,'attrezzatura'); assert.deepEqual(JSON.parse(db.getItem('fi_attrezzatura')),[]);
  assert.equal(JSON.parse(db.getItem('fi_deleted')).item.id,gear.id);
  ctx.undoDelete(); ctx.undoDelete(); assert.equal(JSON.parse(db.getItem('fi_attrezzatura')).length,1); assert.equal(db.getItem('fi_deleted'),null);
});
test('Assistant has actionable guidance without sending network requests', () => {
  const {ctx}=app(); assert.equal(ctx.bussolaAnswer('Come salvo un backup?').action,'backup');
  assert.equal(ctx.bussolaAnswer('Prepara una sessione surfcasting').technique,'surfcasting');
  assert.equal(ctx.bussolaAnswer('Come funziona offline?').section,'spot');
  assert.match(ctx.bussolaAnswer('domanda sconosciuta').text,/guidate/);
});
function ads(host) {
  const scripts=[],listeners=[],classes=new Set();
  const doc={documentElement:{classList:{add:value=>classes.add(value),toggle:(value,enabled)=>enabled?classes.add(value):classes.delete(value)}},querySelectorAll:()=>[],addEventListener:(_,fn)=>listeners.push(fn),createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
  const window={}; const ctx=vm.createContext({window,document:doc,location:{hostname:host,reload(){}},setInterval(){return 1;},clearInterval(){},console,alert(){}});
  vm.runInContext(fs.readFileSync(path.join(root,'ads-config.js'),'utf8'),ctx); vm.runInContext(fs.readFileSync(path.join(root,'ads.js'),'utf8'),ctx);
  listeners.forEach(fn=>fn()); return {window,scripts};
}
test('Local preview never loads CMP or real ads',()=>{ const result=ads('127.0.0.1'); assert.equal(result.scripts.length,0); });
test('Production loads CMP, but no ad tag until valid explicit consent',()=>{
  const {window,scripts}=ads('fishing-inventory.it'); assert.equal(scripts.length,1); assert.match(scripts[0].src,/fundingchoicesmessages/);
  let callback; window.__tcfapi=(command,version,handler)=>{assert.equal(command,'addEventListener'); callback=handler;};
  window.googlefc.callbackQueue[0].CONSENT_API_READY();
  callback({cmpStatus:'loaded',eventStatus:'tcloaded',gdprApplies:true,purpose:{consents:{1:false}},vendor:{consents:{755:true}}},true); assert.equal(scripts.length,1);
  callback({cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,purpose:{consents:{1:true}},vendor:{consents:{755:true}}},true); assert.equal(scripts.length,2); assert.match(scripts[1].src,/adsbygoogle/);
  callback({cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,purpose:{consents:{1:true}},vendor:{consents:{755:true}}},true); assert.equal(scripts.length,2);
});
test('App shell, links and scripts reference existing local files',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) { const url=match[1]; if(/^https?:/.test(url)||url==='/') continue; assert.ok(fs.existsSync(path.join(root,url.replace(/^\//,''))),url); }
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const assets=sw.match(/const ASSETS = \[(.*?)\];/s)[1];
  for(const match of assets.matchAll(/'\.\/([^']*)'/g)) if(match[1]) assert.ok(fs.existsSync(path.join(root,match[1])),match[1]);
  assert.equal((html.match(/id="ad-/g)||[]).length,2);
  assert.ok(!html.includes('id="ad-anchor"')); assert.ok(!html.includes('id="splash-screen"'));
});
