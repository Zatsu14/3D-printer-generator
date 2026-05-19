/* ══════════════════════════════════════════════
   FORM — AI 3D Generator · App principal
   ══════════════════════════════════════════════ */
const q=id=>document.getElementById(id);

/* ══════════════════════════════════════════════
   UNDO / REDO — stack d'opérations reversibles
   ══════════════════════════════════════════════ */
const undoStack=[];const redoStack=[];const UNDO_MAX=30;
function pushUndo(op){
  // op = {label, undo:fn, redo:fn}
  undoStack.push(op);if(undoStack.length>UNDO_MAX)undoStack.shift();
  redoStack.length=0;updateUndoUI();
}
function undo(){
  const op=undoStack.pop();if(!op){toast('Rien à annuler');return}
  op.undo();redoStack.push(op);updateUndoUI();
  toast('↶ '+op.label);
}
function redoAction(){
  const op=redoStack.pop();if(!op){toast('Rien à refaire');return}
  op.redo();undoStack.push(op);updateUndoUI();
  toast('↷ '+op.label);
}
function updateUndoUI(){
  const u=q('b-undo'),r=q('b-redo');
  if(u)u.disabled=undoStack.length===0;
  if(r)r.disabled=redoStack.length===0;
}

/* Snapshot des vertex colors de chaque mesh (clone Float32Array) */
function _snapshotColors(){
  if(!mesh)return null;
  const snaps=[];
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry?.attributes?.color)return;
    snaps.push({obj:n,arr:new Float32Array(n.geometry.attributes.color.array)});
  });
  return snaps.length?snaps:null;
}
/* Restore depuis un snapshot */
function _restoreColors(snaps){
  if(!snaps)return;
  snaps.forEach(s=>{
    const col=s.obj.geometry?.attributes?.color;
    if(!col)return;
    col.array.set(s.arr);col.needsUpdate=true;
  });
}

/* Snapshot rotation+position+scale du mesh */
function _snapshotTransform(){
  if(!mesh)return null;
  return{
    rot:mesh.rotation.toArray(),
    pos:mesh.position.toArray(),
    scl:mesh.scale.toArray(),
    rxv:rx,ryv:ry,panXv:panX,panYv:panY,modelScaleV:modelScale,
  };
}
function _restoreTransform(t){
  if(!mesh||!t)return;
  mesh.rotation.fromArray(t.rot);
  mesh.position.fromArray(t.pos);
  mesh.scale.fromArray(t.scl);
  rx=t.rxv;ry=t.ryv;panX=t.panXv;panY=t.panYv;modelScale=t.modelScaleV;
  const sl=q('scale-sl');if(sl)sl.value=Math.round(modelScale*100);
  const ll=q('scale-lbl');if(ll)ll.textContent=Math.round(modelScale*100)+'%';
}

/* ══════════════════════════════════════════════
   COMMAND PALETTE — Ctrl/Cmd + K
   ══════════════════════════════════════════════ */
const COMMANDS=[
  {label:'Générer un modèle',ico:'⚡',key:'Ctrl+Enter',action:()=>generate(),tags:'gen create new model'},
  {label:'Basculer sur Tripo3D',ico:'☁',action:()=>setBackend('tripo'),tags:'tripo backend cloud'},
  {label:'Basculer sur TRELLIS Local',ico:'🟣',action:()=>setBackend('trellis'),tags:'trellis local backend'},
  {label:'Mode Texte',ico:'📝',action:()=>setMode('text'),tags:'mode text'},
  {label:'Mode Image',ico:'🖼',action:()=>setMode('image'),tags:'mode image upload'},
  {label:'Mode Multi-view',ico:'📐',action:()=>setMode('multiview'),tags:'mode multiview 4 angles'},
  {label:'Mode Hybride',ico:'🔀',action:()=>setMode('hybrid'),tags:'mode hybrid hybride'},
  {label:'Importer un modèle 3D',ico:'📥',action:()=>q('import-file')?.click(),tags:'import glb stl obj 3mf load file'},
  {label:'Enrichir le prompt',ico:'✨',action:()=>enhancePrompt(),tags:'enhance prompt magic enrich'},
  {label:'Auto-orientation',ico:'🎯',action:()=>autoOrient(),tags:'orient rotate auto print'},
  {label:'Outils de mesure',ico:'📏',action:()=>toggleMeasure(),tags:'measure distance angle ruler'},
  {label:'Section transversale',ico:'✂',action:()=>toggleSection(),tags:'section cross cut slice'},
  {label:'Hollowing estimator',ico:'⊙',action:()=>toggleHollowPanel(),tags:'hollow hollowing evider creux'},
  {label:'Éclairage du viewer',ico:'💡',action:()=>toggleLightPanel(),tags:'light lighting eclairage'},
  {label:'Peindre le mesh',ico:'🎨',action:()=>togglePaint(),tags:'paint color brush colorize'},
  {label:'Coloriser depuis image',ico:'🖼',action:()=>openColorize(),tags:'colorize image projection texture'},
  {label:'Export GLB',ico:'📦',action:()=>doE('glb'),tags:'export glb gratuit'},
  {label:'Export STL local (gratuit)',ico:'🆓',action:()=>exportSTLLocal(),tags:'export stl local free'},
  {label:'Export OBJ local (gratuit)',ico:'🆓',action:()=>exportOBJLocal(),tags:'export obj local free'},
  {label:'Export 3MF avec couleurs',ico:'🌈',action:()=>export3MFWithColors(),tags:'export 3mf color ams'},
  {label:'Mode focus (cacher panels)',ico:'🔍',action:()=>toggleFocusMode(),tags:'focus fullscreen viewer only'},
  {label:'Reset vue 3D',ico:'↻',action:()=>rstC(),tags:'reset view camera'},
  {label:'Wireframe ON/OFF',ico:'⬡',action:()=>togW(),tags:'wireframe wire'},
  {label:'Effacer historique',ico:'🗑',action:()=>clearHist(),tags:'clear history delete'},
  {label:'Ouvrir le Guide',ico:'📖',key:'?',action:()=>openModal('modal-guide'),tags:'help guide documentation'},
  {label:'Annuler dernière action',ico:'↶',key:'Ctrl+Z',action:()=>undo(),tags:'undo'},
  {label:'Refaire',ico:'↷',key:'Ctrl+Shift+Z',action:()=>redoAction(),tags:'redo'},
];

function openCmdPalette(){
  q('cmd-palette')?.classList.add('on');
  setTimeout(()=>{const inp=q('cmd-input');if(inp){inp.value='';inp.focus();renderCmdResults('')}},20);
}
function closeCmdPalette(){q('cmd-palette')?.classList.remove('on')}
function renderCmdResults(filter){
  const f=filter.toLowerCase().trim();
  const matched=f?COMMANDS.filter(c=>c.label.toLowerCase().includes(f)||(c.tags||'').toLowerCase().includes(f)):COMMANDS;
  const el=q('cmd-results');if(!el)return;
  if(!matched.length){el.innerHTML='<div class="cmd-empty">Aucune commande</div>';return}
  el.innerHTML=matched.slice(0,12).map((c,i)=>`<div class="cmd-row${i===0?' on':''}" data-cmd="${COMMANDS.indexOf(c)}" onclick="runCmd(${COMMANDS.indexOf(c)})"><span class="cmd-ico">${c.ico}</span><span class="cmd-lbl">${c.label}</span>${c.key?`<span class="cmd-key">${c.key}</span>`:''}</div>`).join('');
}
function runCmd(idx){
  const c=COMMANDS[idx];if(!c)return;
  closeCmdPalette();
  try{c.action()}catch(e){console.error(e);toast('Erreur : '+e.message.slice(0,50),true)}
}
function _cmdKeyNav(e){
  if(!q('cmd-palette')?.classList.contains('on'))return;
  const rows=Array.from(document.querySelectorAll('.cmd-row'));
  const cur=rows.findIndex(r=>r.classList.contains('on'));
  if(e.key==='ArrowDown'){e.preventDefault();if(cur<rows.length-1){rows[cur]?.classList.remove('on');rows[cur+1]?.classList.add('on')}}
  else if(e.key==='ArrowUp'){e.preventDefault();if(cur>0){rows[cur]?.classList.remove('on');rows[cur-1]?.classList.add('on')}}
  else if(e.key==='Enter'){e.preventDefault();const sel=rows[Math.max(0,cur)];if(sel)runCmd(+sel.dataset.cmd)}
  else if(e.key==='Escape'){e.preventDefault();closeCmdPalette()}
}

/* ══════════════════════════════════════════════
   FOCUS MODE — cache panneaux gauche/droite
   ══════════════════════════════════════════════ */
let focusMode=false;
function toggleFocusMode(){
  focusMode=!focusMode;
  document.body.classList.toggle('focus-mode',focusMode);
  toast(focusMode?'🔍 Mode focus (F pour quitter)':'Mode normal');
  // Resize renderer
  setTimeout(()=>{if(renderer){const cv=q('cv');const p=cv.parentElement;renderer.setSize(p.clientWidth,p.clientHeight);camera.aspect=p.clientWidth/p.clientHeight;camera.updateProjectionMatrix()}},250);
}

/* ══════════════════════════════════════════════
   KEYBOARD SHORTCUTS GLOBAUX
   ══════════════════════════════════════════════ */
function initShortcuts(){
  document.addEventListener('keydown',e=>{
    // Si on est dans la palette, laisse _cmdKeyNav gerer
    if(q('cmd-palette')?.classList.contains('on')){_cmdKeyNav(e);return}
    // Ne pas trigger si on tape dans un input/textarea
    const tag=e.target?.tagName;
    const inField=tag==='INPUT'||tag==='TEXTAREA'||e.target?.isContentEditable;
    // Ctrl/Cmd+K toujours actif meme dans un champ
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openCmdPalette();return}
    if(inField)return;
    // Ctrl+Enter -> generer (depuis le textarea aussi)
    // (geré sépcifique pour les textareas via le bloc suivant)
    if(e.key==='?'||(e.shiftKey&&e.key==='/'))  {e.preventDefault();openModal('modal-guide');return}
    if(e.key==='Escape'){
      // Ferme HUDs prioritairement
      ['cmd-palette','modal-guide','modal-retex','modal-anim','meas-hud','sec-hud','hollow-hud','light-hud','paint-hud','enh-pop'].forEach(id=>{const el=q(id);if(el?.classList.contains('on')){el.classList.remove('on');e.preventDefault()}});
      return;
    }
    if(e.key==='f'||e.key==='F'){e.preventDefault();toggleFocusMode();return}
    if(e.key==='r'||e.key==='R')if(!e.ctrlKey){e.preventDefault();rstC();return}
    if(e.key==='1'){e.preventDefault();setMode('text');return}
    if(e.key==='2'){e.preventDefault();setMode('image');return}
    if(e.key==='3'){e.preventDefault();setMode('multiview');return}
    if(e.key==='4'){e.preventDefault();setMode('hybrid');return}
    if(e.key==='t'||e.key==='T')if(!e.ctrlKey){e.preventDefault();setBackend('tripo');return}
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==='z'){e.preventDefault();undo();return}
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==='Z'){e.preventDefault();redoAction();return}
  });
  // Ctrl+Enter dans les textarea
  ['prompt','prompt2'].forEach(id=>{
    const el=q(id);if(!el)return;
    el.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();generate()}
    });
  });
}

/* ══════════════════════════════════════════════
   AUTOSAVE DRAFTS — sauve prompts en cours
   ══════════════════════════════════════════════ */
function initAutosave(){
  ['prompt','prompt2','neg'].forEach(id=>{
    const el=q(id);if(!el)return;
    const saved=localStorage.getItem('form3d_draft_'+id);if(saved)el.value=saved;
    if(id==='prompt'&&q('cr'))q('cr').textContent=el.value.length;
    if(id==='prompt2'&&q('cr2'))q('cr2').textContent=el.value.length;
    el.addEventListener('input',()=>{localStorage.setItem('form3d_draft_'+id,el.value)});
  });
}

/* ══════════════════════════════════════════════
   SUCCESS ANIMATION — pulse + particules
   ══════════════════════════════════════════════ */
function fireSuccessFX(){
  const ov=q('success-fx');if(!ov)return;
  ov.classList.remove('on');void ov.offsetWidth; // reflow
  ov.classList.add('on');
  setTimeout(()=>ov.classList.remove('on'),1800);
}

/* ══════════════════════════════════════════════
   LAYOUT REDIMENSIONNABLE — drag handles entre panels
   ══════════════════════════════════════════════ */
function initResizers(){
  const lW=localStorage.getItem('form3d_lw');
  const rW=localStorage.getItem('form3d_rw');
  if(lW)document.documentElement.style.setProperty('--lw',lW+'px');
  if(rW)document.documentElement.style.setProperty('--rw',rW+'px');
  _initResizer('resize-l','--lw',true);
  _initResizer('resize-r','--rw',false);
}
function _initResizer(id,cssVar,left){
  const el=q(id);if(!el)return;
  let dragging=false,startX=0,startW=0;
  el.addEventListener('mousedown',e=>{
    dragging=true;startX=e.clientX;
    const cs=getComputedStyle(document.documentElement);
    startW=parseInt(cs.getPropertyValue(cssVar))||(left?320:280);
    document.body.style.cursor='ew-resize';e.preventDefault();
  });
  window.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const dx=e.clientX-startX;
    const newW=Math.max(220,Math.min(500,left?startW+dx:startW-dx));
    document.documentElement.style.setProperty(cssVar,newW+'px');
  });
  window.addEventListener('mouseup',()=>{
    if(!dragging)return;
    dragging=false;document.body.style.cursor='';
    localStorage.setItem(left?'form3d_lw':'form3d_rw',parseInt(getComputedStyle(document.documentElement).getPropertyValue(cssVar)));
    // Resize renderer
    if(renderer){const cv=q('cv');const p=cv.parentElement;renderer.setSize(p.clientWidth,p.clientHeight);camera.aspect=p.clientWidth/p.clientHeight;camera.updateProjectionMatrix()}
  });
}

/* ══════════════════════════════════════════════
   SEARCH HISTORY
   ══════════════════════════════════════════════ */
let histFilter='';
function setHistFilter(v){histFilter=v.toLowerCase().trim();rH()}

/* ══════════════════════════════════════════════
   PROGRESS DETAILLEE — sublabels enrichis dans setPg
   (Note : on enrichit les appels setPg existants avec emojis d'etape)
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   ONGLETS PANNEAU GAUCHE
   Filtre les sections selon : Tout / Sujet / Style / API
   ══════════════════════════════════════════════ */
let currentLeftTab='all';
function setLeftTab(t){
  currentLeftTab=t;
  document.querySelectorAll('.l-tab').forEach(el=>el.classList.toggle('on',el.dataset.lt===t));
  document.body.classList.remove('l-tab-all','l-tab-sujet','l-tab-style','l-tab-api','l-tab-trellis');
  document.body.classList.add('l-tab-'+t);
}
function initLeftTabs(){
  // Tabs deja en HTML, juste assurer le state initial
  setLeftTab('all');
}

/* Specs sections collapsibles */
function toggleSpecSec(headerEl){
  const sec=headerEl.parentNode;
  sec.classList.toggle('collapsed');
}


const PROXY='https://form-3d-proxy.antho14j.workers.dev/proxy';
const HIST_KEY='form3d_hist_v2';

let mode='text',quality='hd';
let imgs={1:[],2:[],3:[]};
let curId=null,poll=null,mUrls={},ppTaskId=null;
let scene,camera,renderer,mesh,wire=false,col=true;
let drag=false,mbtn=-1,lx=0,ly=0,rx=0,ry=0,dist=4,panX=0,panY=0;
let hist=[];
let selectedAnims=new Set(['preset:idle','preset:walk']);
let currentSpecs=null;
let currentMat='PLA',matPrice=25,modelScale=1;
let origUrl=null,origThumb=null,compareMode=false;
let batchN=1,batchResults=[];
let genStartTime=0;
const STATS_KEY='form3d_stats_v1';
let stats={gens:0,creds:0,totalMs:0,t0:Date.now()};
/* Matériaux : densité + presets températures Bambu */
const MATS={
  PLA:    {density:1.24,label:'PLA',     nozzle:220,bed:65, speed:1.0, fanMin:80,fanMax:100,retract:0.8,zHop:0.4,supportInterface:'PLA Support', cooling:'Always on',  desc:'Polyvalent · idéal débutant'},
  'PLA+': {density:1.24,label:'PLA+',    nozzle:225,bed:65, speed:0.9, fanMin:80,fanMax:100,retract:0.8,zHop:0.4,supportInterface:'PLA Support', cooling:'Always on',  desc:'Renforcé · meilleur tenue mécanique'},
  PETG:   {density:1.27,label:'PETG',    nozzle:240,bed:80, speed:0.85,fanMin:30,fanMax:50, retract:1.0,zHop:0.4,supportInterface:'PETG/Support W',cooling:'Reduced',    desc:'Résistant chocs + chaleur · transparent OK'},
  TPU:    {density:1.21,label:'TPU 95A', nozzle:230,bed:50, speed:0.4, fanMin:30,fanMax:50, retract:0.4,zHop:0.2,supportInterface:'Aucun (collant)', cooling:'Light',     desc:'Flexible · soft-touch · joints'},
  ABS:    {density:1.04,label:'ABS',     nozzle:265,bed:95, speed:0.85,fanMin:0, fanMax:30, retract:1.2,zHop:0.4,supportInterface:'ABS Support',  cooling:'Minimal',    desc:'Résistant chaleur · enceinte recommandée'},
  ASA:    {density:1.07,label:'ASA',     nozzle:260,bed:95, speed:0.85,fanMin:0, fanMax:30, retract:1.0,zHop:0.4,supportInterface:'ASA Support',  cooling:'Minimal',    desc:'UV-stable · usage extérieur'},
  PC:     {density:1.20,label:'PC',      nozzle:280,bed:100,speed:0.7, fanMin:0, fanMax:20, retract:1.0,zHop:0.4,supportInterface:'PC Support',   cooling:'Off',        desc:'Très solide · enceinte obligatoire'},
  'PA-CF':{density:1.20,label:'PA-CF',   nozzle:290,bed:90, speed:0.75,fanMin:0, fanMax:30, retract:1.0,zHop:0.4,supportInterface:'PA-CF Support',cooling:'Off',        desc:'Nylon fibre carbone · pro · buse acier'},
};

/* Profils imprimantes Bambu Lab */
const PRINTERS={
  'X2D':     {label:'X2D',         plate:[350,350,300],speed:600, accel:20000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:110,hotendMax:320,enclosed:true, multicolor:16,brand:'Bambu Lab',profileName:'Bambu Lab X2D 0.4 nozzle',desc:'Flagship multicolor CMYK · 4 AMS · recommandé'},
  'H2D':     {label:'H2D',         plate:[350,320,325],speed:1000,accel:20000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:120,hotendMax:350,enclosed:true, multicolor:16,brand:'Bambu Lab',profileName:'Bambu Lab H2D 0.4 nozzle',desc:'Double tête · ultra-rapide · matériaux pro'},
  'X1C':     {label:'X1 Carbon',   plate:[256,256,256],speed:500, accel:20000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:110,hotendMax:300,enclosed:true, multicolor:16,brand:'Bambu Lab',profileName:'Bambu Lab X1 Carbon 0.4 nozzle',desc:'Polyvalent enclosure · AMS'},
  'X1E':     {label:'X1E',         plate:[256,256,256],speed:500, accel:20000,nozzleDef:0.4,nozzles:[0.4,0.6,0.8],     bedMax:120,hotendMax:320,enclosed:true, multicolor:16,brand:'Bambu Lab',profileName:'Bambu Lab X1E 0.4 nozzle',desc:'Engineering · PA/PC/PEEK'},
  'P1S':     {label:'P1S',         plate:[256,256,256],speed:500, accel:20000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:100,hotendMax:300,enclosed:true, multicolor:16,brand:'Bambu Lab',profileName:'Bambu Lab P1S 0.4 nozzle',desc:'Enclosed · bon rapport qualité/prix'},
  'P1P':     {label:'P1P',         plate:[256,256,256],speed:500, accel:20000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:100,hotendMax:300,enclosed:false,multicolor:16,brand:'Bambu Lab',profileName:'Bambu Lab P1P 0.4 nozzle',desc:'Ouvert · PLA/PETG/TPU'},
  'A1':      {label:'A1',          plate:[256,256,256],speed:500, accel:10000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:100,hotendMax:300,enclosed:false,multicolor:4, brand:'Bambu Lab',profileName:'Bambu Lab A1 0.4 nozzle',desc:'AMS Lite 4 couleurs · CoreXY bedslinger'},
  'A1 mini': {label:'A1 mini',     plate:[180,180,180],speed:500, accel:10000,nozzleDef:0.4,nozzles:[0.2,0.4,0.6,0.8],bedMax:80, hotendMax:300,enclosed:false,multicolor:4, brand:'Bambu Lab',profileName:'Bambu Lab A1 mini 0.4 nozzle',desc:'Compact · idéal petits modèles'},
};
let selectedPrinter='X2D';
let nozzleSize=0.4;
let autoRotate=true;
let baseGroup=null; // socle eventuel (THREE.Group ajoute au mesh)
let baseConfig={type:'disc',thicknessMm:3,diameterMm:0,marginPct:20}; // diameterMm=0 -> auto

/* ── TRELLIS ── */
let backend='tripo'; // 'tripo'|'trellis'
let trellisOk=false;
let trellisRes=1024;      // 512 | 1024 | 1536
let trellisSsSteps=20;    // ss_sampling_steps (1-50) — structure sparse
let trellisSlatSteps=20;  // slat_sampling_steps (1-50) — surface SLAT
let trellisGuidance=7.5;  // guidance_scale (1-10)
let trellisTexSize=2048;  // texture_size (512/1024/2048/4096)
let trellisFaceLimit=50;  // mesh_simplify int (5-100), ×1000 = faces
let trellisPoll=null;
let trellisAbortCtrl=null;
let histSelIdx=-1;        // index de l'item historique sélectionné
const TRELLIS_URL='http://127.0.0.1:7960';

const QCFG={
  turbo:{model:'Turbo-v1.0-20250506',geo:'standard',texQ:'standard',cost:{text:10,image:20,multi:20}},
  standard:{model:'v3.1-20260211',geo:'standard',texQ:'standard',cost:{text:20,image:30,multi:30}},
  hd:{model:'v3.1-20260211',geo:'detailed',texQ:'detailed',cost:{text:40,image:50,multi:50}},
};

/* ══════════════════════════════════════════════
   IndexedDB — stockage GLB persistant
   Tripo URLs expirent après 60s, blob URLs perdues au refresh.
   On stocke le binaire GLB ici pour pouvoir recharger depuis l'historique.
   ══════════════════════════════════════════════ */
const IDB_NAME='form3d_v1',IDB_STORE='glbs';
let _idbPromise=null;
function idbOpen(){
  if(_idbPromise)return _idbPromise;
  _idbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(IDB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE)};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return _idbPromise;
}
async function idbPut(id,buf){
  try{const db=await idbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(buf,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
  catch(e){console.warn('idbPut failed:',e);return null}
}
async function idbGet(id){
  try{const db=await idbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readonly');const req=tx.objectStore(IDB_STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
  catch(e){return null}
}
async function idbDel(id){try{const db=await idbOpen();return new Promise(r=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(id);tx.oncomplete=()=>r()})}catch(e){}}
async function idbKeys(){try{const db=await idbOpen();return new Promise(r=>{const tx=db.transaction(IDB_STORE,'readonly');const req=tx.objectStore(IDB_STORE).getAllKeys();req.onsuccess=()=>r(req.result||[])})}catch(e){return[]}}
// Nettoyage : supprime les GLB qui ne sont plus dans l'historique
async function idbPrune(){
  try{
    const keys=await idbKeys();const ids=new Set(hist.map(h=>h.id));
    for(const k of keys){if(!ids.has(k))await idbDel(k)}
  }catch(e){}
}

/* ── Capture thumbnail depuis le canvas 3D ── */
// Re-render puis convertit en data URL (200x200 JPEG ~10-30kb)
function captureCanvasThumb(){
  if(!renderer||!scene||!camera)return null;
  try{
    renderer.render(scene,camera);
    const cv=q('cv');if(!cv)return null;
    const tw=200,th=200;
    const tc=document.createElement('canvas');tc.width=tw;tc.height=th;
    const ctx=tc.getContext('2d');
    // Centre l'image dans le carré
    const sw=cv.width,sh=cv.height;const ratio=sw/sh;
    let dx=0,dy=0,dw=tw,dh=th;
    if(ratio>1){dh=th/ratio;dy=(th-dh)/2}else{dw=tw*ratio;dx=(tw-dw)/2}
    ctx.fillStyle='#080809';ctx.fillRect(0,0,tw,th);
    ctx.drawImage(cv,dx,dy,dw,dh);
    return tc.toDataURL('image/jpeg',0.78);
  }catch(e){console.warn('captureCanvasThumb:',e);return null}
}

// Helper : télécharge un GLB Tripo via le proxy et le stocke en IDB
async function persistGlb(id,url){
  try{
    const isLocal=url.startsWith('http://localhost')||url.startsWith('http://127.0.0.1')||url.startsWith('blob:');
    const resp=isLocal?await fetch(url):await fetch(PROXY+'/model?url='+encodeURIComponent(url));
    if(!resp.ok)return null;
    const buf=await resp.arrayBuffer();
    await idbPut(id,buf);
    return buf;
  }catch(e){console.warn('persistGlb:',e);return null}
}

function setQ(el,q2){quality=q2;document.querySelectorAll('.q-card').forEach(c=>c.classList.remove('on'));el.classList.add('on');updateCost()}
function setMode(m){
  // Bloque le switch vers un mode incompatible en TRELLIS
  if(backend==='trellis'&&['text','multiview'].includes(m)){
    toast('TRELLIS ne supporte que Image / Hybride',true);
    return;
  }
  mode=m;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.m===m));
  ['text','image','multiview','hybrid'].forEach(p=>{const el=q('pane-'+p);if(el)el.classList.toggle('on',p===m)});
  updateCost();
}
function setRTab(t){document.querySelectorAll('.r-tab').forEach(el=>el.classList.toggle('on',el.dataset.rt===t));document.querySelectorAll('.r-pane').forEach(el=>el.classList.toggle('on',el.id==='rpane-'+t))}
function updateCost(){
  if(backend==='trellis'){const cv=q('cost-val');if(cv)cv.textContent='Gratuit (local)';return}
  const cfg=QCFG[quality];const k=mode==='text'?'text':mode==='multiview'?'multi':'image';let cr=cfg.cost[k];if(quality==='hd')cr+=20;const tot=cr*batchN;q('cost-val').textContent='~'+tot+' crédits'+(batchN>1?' (×'+batchN+')':'');
}

function ckK(){const v=q('akey').value.trim();q('kok').classList.toggle('on',v.startsWith('tsk_'));if(v)localStorage.setItem('form3d_key',v);if(v.startsWith('tsk_'))fetchBalance(v)}
async function fetchBalance(key){try{const r=await fetch(PROXY+'/user/balance',{headers:{'Authorization':'Bearer '+key}});const d=await r.json();if(d.code===0)q('crd-val').textContent=Math.round(d.data.balance)+' crédits'}catch(e){}}

function dov(e,el){e.preventDefault();el.classList.add('drag')}
function dlv(el){el.classList.remove('drag')}
function ddr(e,s,max){e.preventDefault();q('drop'+s).classList.remove('drag');addFilesArr(Array.from(e.dataTransfer.files),s,max)}
function addF(e,s,max){addFilesArr(Array.from(e.target.files),s,max)}
function addFilesArr(files,s,max){files.forEach(f=>{if(imgs[s].length>=max){toast('Max '+max+' image'+(max>1?'s':''));return}const r=new FileReader();r.onload=ev=>{imgs[s].push({b64:ev.target.result.split(',')[1],url:ev.target.result,type:f.type,name:f.name});renderGrid(s,max)};r.readAsDataURL(f)})}
function rmI(i,s,max,e){e.stopPropagation();imgs[s].splice(i,1);renderGrid(s,max)}
function renderGrid(s,max){const arr=imgs[s],g=q('ig'+s),dr=q('drop'+s);if(dr)dr.style.display=arr.length?'none':'';if(!g)return;g.innerHTML='';arr.forEach((img,i)=>{const d=document.createElement('div');d.className='ith';d.innerHTML=`<img src="${img.url}"/><button class="itd" onclick="rmI(${i},${s},${max},event)">✕</button>`;g.appendChild(d)});if(arr.length<max){const a=document.createElement('div');a.className='ita';a.textContent='+';a.onclick=()=>q('fi'+s).click();g.appendChild(a)}}

async function uploadImg(key,img){const blob=await(await fetch(`data:${img.type||'image/jpeg'};base64,${img.b64}`)).blob();const fd=new FormData();fd.append('file',blob,img.name||'image.jpg');const r=await fetch(PROXY+'/upload/sts',{method:'POST',headers:{'Authorization':'Bearer '+key},body:fd});const d=await r.json();if(!r.ok)throw new Error(d.message||'Upload échoué');return d.data.image_token}

async function autoMultiview(){
  const key=q('akey').value.trim();if(!key){toast('Clé API manquante',true);return}
  if(!imgs[2].length){toast('Upload une image d\'abord',true);return}
  toast('Génération des 4 vues…');
  try{
    const tok=await uploadImg(key,imgs[2][0]);
    const res=await fetch(PROXY+'/task',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'generate_multiview_image',file:{type:imgs[2][0].type?.split('/')[1]||'jpeg',file_token:tok}})});
    const d=await res.json();if(!res.ok)throw new Error(d.message);
    const mvId=d.data.task_id;
    const pint=setInterval(async()=>{
      const r2=await fetch(PROXY+'/task/'+mvId,{headers:{'Authorization':'Bearer '+key}});const d2=await r2.json();
      if(d2.data?.status==='success'){
        clearInterval(pint);const out=d2.data.output?.generate_multiview_image;
        if(out){imgs[2]=[];const views=[out.front_view_url,out.left_view_url,out.back_view_url,out.right_view_url];
          await Promise.all(views.map(async(url,i)=>{const resp=await fetch(PROXY+'/model?url='+encodeURIComponent(url));const blob2=await resp.blob();return new Promise(res2=>{const fr=new FileReader();fr.onload=ev=>{imgs[2].push({b64:ev.target.result.split(',')[1],url:ev.target.result,type:'image/png',name:`view_${i}.png`});res2()};fr.readAsDataURL(blob2)})}));
          renderGrid(2,4);toast('✓ 4 vues générées !','ok')}
      }else if(d2.data?.status==='failed'){clearInterval(pint);toast('Erreur vues',true)}
    },3000);
  }catch(e){toast(e.message.slice(0,60),true)}
}

async function buildBody(key,cfg){
  const p=mode==='hybrid'?q('prompt2').value.trim():q('prompt').value.trim();
  const imgArr=mode==='hybrid'?imgs[3]:mode==='image'?imgs[1]:imgs[2];
  const pbr=q('opt-pbr').checked,autofix=q('opt-autofix').checked;
  let body;
  if(mode==='text'){
    body={type:'text_to_model',prompt:p,negative_prompt:q('neg').value.trim()||undefined,model_version:cfg.model,pbr,texture_quality:cfg.texQ,geometry_quality:cfg.geo};
  }else if(mode==='image'){
    const tok=await uploadImg(key,imgArr[0]);
    body={type:'image_to_model',file:{type:imgArr[0].type?.split('/')[1]||'jpeg',file_token:tok},model_version:cfg.model,pbr,texture_quality:cfg.texQ,geometry_quality:cfg.geo,enable_image_autofix:autofix};
    if(q('opt-orient').checked)body.orientation='align_image';
  }else if(mode==='multiview'){
    const toks=await Promise.all(imgArr.map(i=>uploadImg(key,i)));
    const files=Array.from({length:4},(_,i)=>toks[i]?{type:imgArr[i].type?.split('/')[1]||'jpeg',file_token:toks[i]}:{});
    body={type:'multiview_to_model',files,model_version:cfg.model,pbr,texture_quality:cfg.texQ,geometry_quality:cfg.geo};
    if(q('opt-orient').checked)body.orientation='align_image';
  }else{
    const tok=imgArr.length?await uploadImg(key,imgArr[0]):null;
    body={type:'image_to_model',file:tok?{type:imgArr[0].type?.split('/')[1]||'jpeg',file_token:tok}:undefined,model_version:cfg.model,pbr,texture_quality:cfg.texQ,geometry_quality:cfg.geo,enable_image_autofix:autofix};
    if(p)body.prompt=p;
  }
  return body;
}

async function generate(){
  if(backend==='trellis'){generateTrellis();return}
  const key=q('akey').value.trim();if(!key){toast('Clé API manquante',true);return}
  const p=mode==='hybrid'?q('prompt2').value.trim():q('prompt').value.trim();
  const imgArr=mode==='hybrid'?imgs[3]:mode==='image'?imgs[1]:imgs[2];
  if(mode==='text'&&!p){toast('Entre une description',true);return}
  if((mode==='image'||mode==='multiview')&&!imgArr.length){toast('Upload une image',true);return}
  if(!scene)init3();
  clrP();setG(true);setPg(0,'Connexion…','TRIPO');
  mUrls={};curId=null;ppTaskId=null;origUrl=null;origThumb=null;compareMode=false;
  q('cmp-overlay').classList.remove('on');q('bcmp').disabled=true;
  q('cv').style.display='block';q('emp').style.display='none';q('pp-bar').classList.remove('on');
  if(mesh){scene.remove(mesh);mesh=null}
  document.querySelectorAll('.pp-btn').forEach(b=>b.classList.remove('pp-done','pp-loading'));
  genStartTime=Date.now();
  const cfg=QCFG[quality];
  const hdrs={'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  try{
    if(batchN>1){
      setPg(15,'Upload…','TRIPO');
      const body=await buildBody(key,cfg);
      setPg(20,'Lancement batch…','TRIPO');
      await batchGenerate(key,body,hdrs,p,imgArr);
      return;
    }
    setPg(8,'Upload…','TRIPO');
    const body=await buildBody(key,cfg);
    setPg(15,'Envoi…','API');
    const res=await fetch(PROXY+'/task',{method:'POST',headers:hdrs,body:JSON.stringify(body)});
    const data=await res.json();if(!res.ok)throw new Error(data.message||JSON.stringify(data));
    curId=data.data.task_id;
    addH({id:curId,prompt:p||(imgArr[0]?.name||'Image'),mode,status:'loading',quality});
    setStage('Génération '+quality.toUpperCase()+'…',false);pollT(key,curId);
  }catch(e){setG(false);hidP();toast(e.message.slice(0,70),true)}
}

async function batchGenerate(key,body,hdrs,p,imgArr){
  const tray=q('batch-tray');tray.classList.add('on');batchResults=Array(batchN).fill(null);
  tray.innerHTML=Array.from({length:batchN},(_,i)=>`<div class="batch-item" id="bi-${i}"><span class="spin">⟳</span><div class="batch-item-lbl">V${i+1}</div></div>`).join('');
  const promises=Array.from({length:batchN},async(_,idx)=>{
    try{
      const res=await fetch(PROXY+'/task',{method:'POST',headers:hdrs,body:JSON.stringify(body)});
      const data=await res.json();if(!res.ok)throw new Error(data.message);
      const taskId=data.data.task_id;
      if(idx===0){curId=taskId;addH({id:taskId,prompt:p||(imgArr[0]?.name||'Image'),mode,status:'loading',quality});setStage('Batch '+quality.toUpperCase()+'…',false)}
      return await pollOneTask(key,taskId);
    }catch(e){const bi=q('bi-'+idx);if(bi){bi.innerHTML=`<div class="batch-item-lbl">V${idx+1} ✗</div>`;bi.style.borderColor='var(--red)'}throw e}
  });
  Promise.allSettled(promises).then(results=>{
    setG(false);hidP();
    results.forEach((r,i)=>{
      const bi=q('bi-'+i);if(!bi)return;
      if(r.status==='fulfilled'&&r.value){
        batchResults[i]=r.value;
        bi.innerHTML=r.value.thumb?`<img src="${r.value.thumb}"><div class="batch-item-lbl">V${i+1}</div>`:`<span style="font-size:16px">✓</span><div class="batch-item-lbl">V${i+1}</div>`;
        bi.onclick=()=>selectBatch(i);
        if(i===0)selectBatch(0);
      }
    });
    updateStats();
  });
}

async function pollOneTask(key,taskId){
  return new Promise((resolve,reject)=>{
    const pint=setInterval(async()=>{
      try{
        const r=await fetch(PROXY+'/task/'+taskId,{headers:{'Authorization':'Bearer '+key}});
        const d=await r.json();const task=d.data;
        if(task.status==='success'){
          clearInterval(pint);const out=task.output||{};
          resolve({glb:out.pbr_model||out.model||out.base_model,thumb:out.rendered_image,taskId});
        }else if(['failed','cancelled','banned','expired'].includes(task.status)){
          clearInterval(pint);reject(new Error('Tâche échouée'));
        }
      }catch(e){clearInterval(pint);reject(e)}
    },3000);
  });
}

async function selectBatch(i){
  const r=batchResults[i];if(!r)return;
  document.querySelectorAll('.batch-item').forEach((b,j)=>b.classList.toggle('on',j===i));
  mUrls={glb:r.glb,_taskId:r.taskId,thumb:r.thumb};ppTaskId=r.taskId;
  origUrl=r.glb;origThumb=r.thumb||null;
  if(r.glb)await loadM(r.glb);
  ['glb','stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.remove('dis'));
  q('ex-bambu')?.classList.remove('dis');
  q('br').disabled=false;q('bw').disabled=false;q('bc').disabled=false;q('bcmp').disabled=false;
  q('pp-bar').classList.add('on');q('hb').classList.add('on');
  // Persist GLB to IDB + capture thumbnail
  if(r.glb)persistGlb(r.taskId,r.glb);
  setTimeout(()=>{const th=captureCanvasThumb();updH(r.taskId,'done',th||r.thumb||null,r.glb||null,true)},800);
  setStage('Prêt · '+quality.toUpperCase(),true);
  setTimeout(()=>{const key=q('akey').value.trim();if(key)fetchBalance(key);showSpecs(hist[0]);showFils()},1500);
}

function pollT(key,id){
  poll=setInterval(async()=>{
    try{
      const r=await fetch(PROXY+'/task/'+id,{headers:{'Authorization':'Bearer '+key}});
      const d=await r.json();const task=d.data;const pct=task.progress||0;
      if(task.status==='success'){
        clrP();const out=task.output||{};
        mUrls={glb:out.pbr_model||out.model||out.base_model,_taskId:id};
        if(out.rendered_image)mUrls.thumb=out.rendered_image;
        ppTaskId=id;origUrl=mUrls.glb;origThumb=mUrls.thumb||null;
        setPg(100,'Modèle prêt ✓','TRIPO v3.1');setG(false);fireSuccessFX();
        ['glb','stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.remove('dis'));
        q('ex-bambu')?.classList.remove('dis');
        setStage('Prêt · '+quality.toUpperCase(),true);
        q('br').disabled=false;q('bw').disabled=false;q('bc').disabled=false;q('bcmp').disabled=false;
        q('hb').classList.add('on');q('pp-bar').classList.add('on');
        setTimeout(hidP,1500);
        if(mUrls.glb)await loadM(mUrls.glb);
        // Persist GLB binary in IDB + capture thumbnail (canvas après render)
        if(mUrls.glb)persistGlb(id,mUrls.glb);
        setTimeout(()=>{const th=captureCanvasThumb();updH(id,'done',th||mUrls.thumb||null,mUrls.glb||null,true)},800);
        const cfg2=QCFG[quality];const ck=mode==='text'?'text':mode==='multiview'?'multi':'image';
        const cr=(cfg2.cost[ck]||0)+(quality==='hd'?20:0);
        stats.gens++;stats.creds+=cr;stats.totalMs+=Date.now()-genStartTime;saveStats();updateStats();
        setTimeout(()=>{fetchBalance(key);showSpecs(hist[0]);showFils()},1500);
      }else if(['failed','cancelled','banned','expired'].includes(task.status)){
        clrP();setG(false);hidP();updH(id,'error',null);toast('Génération échouée'+(task.error_msg?' : '+task.error_msg:''),true);
      }else{
        const lbl=pct<20?'[1/4] Analyse de la prompt…':pct<50?'[2/4] Construction du mesh…':pct<80?'[3/4] Textures PBR…':'[4/4] Finalisation…';
        setPg(Math.max(18,pct),lbl,'TRIPO v3.1 · '+quality.toUpperCase());
      }
    }catch(e){}
  },3000);
}

async function ppAction(action){
  const key=q('akey').value.trim();if(!ppTaskId||!key){toast('Génère d\'abord un modèle',true);return}
  const btn=q('pp-'+action);if(btn.classList.contains('pp-loading'))return;
  btn.classList.add('pp-loading');
  try{
    if(action==='texture'){openModal('modal-retex');btn.classList.remove('pp-loading');return}
    if(action==='rig'){buildAnimGrid();openModal('modal-anim');btn.classList.remove('pp-loading');return}
    let body;
    if(action==='refine')body={type:'refine_model',original_model_task_id:ppTaskId,texture_quality:'detailed',pbr:true};
    else if(action==='lowpoly')body={type:'highpoly_to_lowpoly',original_model_task_id:ppTaskId,quad:false,face_limit:10000};
    else if(action==='segment')body={type:'mesh_segmentation',original_model_task_id:ppTaskId};
    else body={type:'stylize_model',style:action,original_model_task_id:ppTaskId};
    toast(action==='refine'?'Raffinage HD en cours (~3-5 min)…':action+' en cours…');
    const res=await fetch(PROXY+'/task',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await res.json();if(!res.ok)throw new Error(d.message);
    const ppId=d.data.task_id;
    const pint=setInterval(async()=>{
      const r2=await fetch(PROXY+'/task/'+ppId,{headers:{'Authorization':'Bearer '+key}});const d2=await r2.json();
      if(d2.data?.status==='success'){clearInterval(pint);btn.classList.remove('pp-loading');btn.classList.add('pp-done');const u=d2.data.output?.model;if(u){ppTaskId=ppId;mUrls.glb=u;loadM(u)}toast(action==='refine'?'✓ Modèle raffiné HD !':'✓ '+action+' appliqué','ok')}
      else if(['failed','cancelled'].includes(d2.data?.status)){clearInterval(pint);btn.classList.remove('pp-loading');toast(action+' échoué',true)}
    },3000);
  }catch(e){btn.classList.remove('pp-loading');toast(e.message.slice(0,60),true)}
}

async function doRetexture(){
  const key=q('akey').value.trim();const prompt=q('retex-prompt').value.trim();
  if(!prompt){toast('Entre un prompt de texture',true);return}
  closeModal('modal-retex');const btn=q('pp-texture');btn.classList.add('pp-loading');
  try{
    const res=await fetch(PROXY+'/task',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'texture_model',original_model_task_id:ppTaskId,texture_prompt:{text:prompt},pbr:true,texture_quality:'detailed'})});
    const d=await res.json();if(!res.ok)throw new Error(d.message);
    toast('Retexturing…');const ppId=d.data.task_id;
    const pint=setInterval(async()=>{const r2=await fetch(PROXY+'/task/'+ppId,{headers:{'Authorization':'Bearer '+key}});const d2=await r2.json();if(d2.data?.status==='success'){clearInterval(pint);btn.classList.remove('pp-loading');btn.classList.add('pp-done');const u=d2.data.output?.pbr_model||d2.data.output?.model;if(u){ppTaskId=ppId;mUrls.glb=u;loadM(u)}toast('✓ Texture appliquée','ok')}else if(['failed','cancelled'].includes(d2.data?.status)){clearInterval(pint);btn.classList.remove('pp-loading');toast('Retexture échoué',true)}},3000);
  }catch(e){btn.classList.remove('pp-loading');toast(e.message.slice(0,60),true)}
}

const ANIM_LIST=[{id:'preset:idle',label:'Idle',ico:'💤'},{id:'preset:walk',label:'Walk',ico:'🚶'},{id:'preset:run',label:'Run',ico:'🏃'},{id:'preset:jump',label:'Jump',ico:'⬆️'},{id:'preset:slash',label:'Slash',ico:'⚔️'},{id:'preset:shoot',label:'Shoot',ico:'🎯'},{id:'preset:hurt',label:'Hurt',ico:'💥'},{id:'preset:fall',label:'Fall',ico:'⬇️'}];
function buildAnimGrid(){q('anim-grid').innerHTML=ANIM_LIST.map(a=>`<div onclick="toggleAnim('${a.id}',this)" style="padding:8px;border-radius:8px;border:1.5px solid ${selectedAnims.has(a.id)?'var(--ac)':'var(--b2)'};background:${selectedAnims.has(a.id)?'var(--ac3)':'var(--bg3)'};cursor:pointer;text-align:center;transition:all .15s" data-anim="${a.id}"><div style="font-size:16px">${a.ico}</div><div style="font-family:var(--mono);font-size:16px;color:var(--t2);margin-top:3px">${a.label}</div></div>`).join('')}
function toggleAnim(id,el){if(selectedAnims.has(id)){selectedAnims.delete(id);el.style.borderColor='var(--b2)';el.style.background='var(--bg3)'}else{selectedAnims.add(id);el.style.borderColor='var(--ac)';el.style.background='var(--ac3)'}}
async function doAnimate(){
  const key=q('akey').value.trim();if(!ppTaskId||!key)return;closeModal('modal-anim');
  const btn=q('pp-rig');btn.classList.add('pp-loading');toast('Rigging…');
  try{
    const r1=await fetch(PROXY+'/task',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'animate_rig',original_model_task_id:ppTaskId,out_format:'glb'})});
    const d1=await r1.json();if(!r1.ok)throw new Error(d1.message);
    await waitTask(key,d1.data.task_id,'Rigging…');
    toast('Application animations…');
    const r2=await fetch(PROXY+'/task',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'animate_retarget',original_model_task_id:d1.data.task_id,animations:[...selectedAnims],out_format:'glb'})});
    const d2=await r2.json();if(!r2.ok)throw new Error(d2.message);
    const out=await waitTask(key,d2.data.task_id,'Animation…');
    btn.classList.remove('pp-loading');btn.classList.add('pp-done');
    if(out?.output?.model){mUrls.glb=out.output.model;loadM(out.output.model)}
    toast('✓ Animation prête — export GLB','ok');
  }catch(e){btn.classList.remove('pp-loading');toast(e.message.slice(0,60),true)}
}
async function waitTask(key,id){return new Promise((res,rej)=>{const pint=setInterval(async()=>{try{const r=await fetch(PROXY+'/task/'+id,{headers:{'Authorization':'Bearer '+key}});const d=await r.json();if(d.data?.status==='success'){clearInterval(pint);res(d.data)}else if(['failed','cancelled'].includes(d.data?.status)){clearInterval(pint);rej(new Error('Tâche échouée'))}}catch(e){clearInterval(pint);rej(e)}},3000)})}

/* Détecte si le mesh a des textures (couleur) */
function meshHasTextures(){
  if(!mesh)return false;
  let has=false;
  mesh.traverse(n=>{if(n.isMesh&&n.material&&(n.material.map||n.userData?.om))has=true});
  return has;
}

/* ══════════════════════════════════════════════
   PROMPT ENHANCER — templates locaux, gratuits
   Enrichit un prompt court avec modificateurs de style + qualité
   et auto-traduit FR -> EN (mots-clés) pour optimiser Tripo
   ══════════════════════════════════════════════ */

/* Dictionnaire FR -> EN (mots-clés courants pour Tripo) */
const FR_EN={
  // Objets
  'épée':'sword','couteau':'knife','arme':'weapon','dague':'dagger','hache':'axe','arc':'bow','flèche':'arrow','bouclier':'shield','armure':'armor','casque':'helmet','figurine':'figurine','statue':'statue','vase':'vase','tasse':'cup','assiette':'plate','bol':'bowl','théière':'teapot','lampe':'lamp','bougie':'candle','chandelier':'candelabra','horloge':'clock','montre':'watch','clé':'key','serrure':'lock','coffre':'chest','livre':'book','rouleau':'scroll','parchemin':'parchment','potion':'potion','flacon':'flask','baguette':'wand','bâton':'staff','sceptre':'scepter','couronne':'crown','bijou':'jewel','collier':'necklace','bague':'ring','anneau':'ring','pendentif':'pendant','médaille':'medal','trophée':'trophy','masque':'mask',
  // Créatures
  'dragon':'dragon','chevalier':'knight','samouraï':'samurai','ninja':'ninja','sorcier':'wizard','mage':'mage','elfe':'elf','nain':'dwarf','orc':'orc','gobelin':'goblin','squelette':'skeleton','zombie':'zombie','vampire':'vampire','loup':'wolf','ours':'bear','lion':'lion','tigre':'tiger','aigle':'eagle','dauphin':'dolphin','requin':'shark','poulpe':'octopus','araignée':'spider','scarabée':'beetle','phénix':'phoenix','licorne':'unicorn','sirène':'mermaid','centaure':'centaur',
  // Mécanique / véhicules
  'voiture':'car','moto':'motorcycle','vélo':'bicycle','vaisseau':'spaceship','fusée':'rocket','robot':'robot','drone':'drone','mecha':'mecha','char':'tank','avion':'airplane','hélicoptère':'helicopter','bateau':'boat','sous-marin':'submarine','train':'train','engrenage':'gear','rouage':'cog','piston':'piston','clé à molette':'wrench','tournevis':'screwdriver','marteau':'hammer',
  // Mobilier
  'chaise':'chair','table':'table','fauteuil':'armchair','canapé':'couch','lit':'bed','étagère':'shelf','armoire':'cabinet','tabouret':'stool','bureau':'desk','miroir':'mirror','cadre':'frame',
  // Nature
  'arbre':'tree','fleur':'flower','rose':'rose','champignon':'mushroom','feuille':'leaf','pierre':'rock','cristal':'crystal','roche':'stone','coquillage':'seashell','plante':'plant','cactus':'cactus','fougère':'fern','racine':'root',
  // Bâtiments
  'maison':'house','château':'castle','tour':'tower','donjon':'dungeon','pont':'bridge','temple':'temple','église':'church','phare':'lighthouse','moulin':'windmill','cabane':'hut','tente':'tent','igloo':'igloo','pyramide':'pyramid','obélisque':'obelisk',
  // Matériaux
  'or':'gold','argent':'silver','bronze':'bronze','cuivre':'copper','fer':'iron','acier':'steel','platine':'platinum','bois':'wood','pierre':'stone','marbre':'marble','jade':'jade','rubis':'ruby','émeraude':'emerald','saphir':'sapphire','diamant':'diamond','obsidienne':'obsidian','cuir':'leather','tissu':'fabric','soie':'silk','verre':'glass','cristal':'crystal',
  // Couleurs
  'rouge':'red','bleu':'blue','vert':'green','jaune':'yellow','noir':'black','blanc':'white','gris':'gray','orange':'orange','violet':'purple','rose':'pink','marron':'brown','doré':'golden','argenté':'silver',
  // Adjectifs
  'médiéval':'medieval','futuriste':'futuristic','antique':'ancient','moderne':'modern','baroque':'baroque','art nouveau':'art nouveau','art déco':'art deco','steampunk':'steampunk','cyberpunk':'cyberpunk','gothique':'gothic','viking':'viking','japonais':'japanese','chinois':'chinese','egyptien':'egyptian','grec':'greek','romain':'roman','ornementé':'ornate','sculpté':'carved','gravé':'engraved','poli':'polished','rouillé':'rusted','vieilli':'weathered','brillant':'shiny','mat':'matte','transparent':'transparent','translucide':'translucent',
};

/* Modificateurs de style à ajouter */
const PROMPT_STYLES={
  realistic:{label:'Réaliste',mods:['highly detailed','realistic','photorealistic','intricate details','high quality','8K','professional 3D model','PBR materials']},
  stylized:{label:'Stylisé',mods:['stylized','clean topology','game-ready','detailed textures','vibrant colors','illustrated','character design']},
  lowpoly:{label:'Low-poly',mods:['low-poly','flat shading','clean geometry','game asset','minimalist','geometric','crisp edges']},
  cartoon:{label:'Cartoon',mods:['cartoon style','exaggerated proportions','bold colors','toon shading','animated','playful']},
  cinematic:{label:'Cinématique',mods:['cinematic','dramatic lighting','moody atmosphere','volumetric','ultra detailed','epic','film quality']},
  fantasy:{label:'Fantasy',mods:['fantasy','magical','ornate details','rune-engraved','glowing accents','medieval-inspired','enchanted']},
  scifi:{label:'Sci-Fi',mods:['sci-fi','futuristic','high-tech','sleek','neon accents','holographic details','advanced materials']},
  steampunk:{label:'Steampunk',mods:['steampunk','brass and copper','intricate gears','victorian','industrial','bronze patina','exposed mechanisms']},
};

function _detectFrench(text){
  return /[éèêëàâäîïôöùûüç]|\b(le|la|les|un|une|des|du|de|et|avec|pour|sur|sous|dans)\b/i.test(text);
}

function _translateFR2EN(text){
  let out=text;
  // Tri par longueur décroissante pour éviter de matcher des sous-mots
  const keys=Object.keys(FR_EN).sort((a,b)=>b.length-a.length);
  keys.forEach(fr=>{
    const en=FR_EN[fr];
    const re=new RegExp('\\b'+fr.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi');
    out=out.replace(re,en);
  });
  return out;
}

function enhancePrompt(){
  // Trouve quelle textarea utiliser selon le mode actif
  const ta=mode==='hybrid'?q('prompt2'):q('prompt');
  if(!ta){toast('Aucune zone prompt active',true);return}
  const raw=ta.value.trim();
  if(!raw){toast('Écris d\'abord un prompt court',true);return}
  // Détection et traduction si FR
  const wasFrench=_detectFrench(raw);
  let base=wasFrench?_translateFR2EN(raw):raw;
  base=base.replace(/\s+/g,' ').trim();
  // Style sélectionné dans le picker
  const style=PROMPT_STYLES[currentEnhanceStyle]||PROMPT_STYLES.realistic;
  const mods=style.mods.slice();
  // Si manque de matière/éclairage explicite, en ajouter
  if(!/(metal|wood|plastic|glass|fabric|leather|stone|gold|silver|bronze|cyber)/i.test(base))mods.push('professional materials');
  if(!/(light|glow|shine|reflect|cinematic|dramatic)/i.test(base))mods.push('soft studio lighting');
  // Assemble
  const enhanced=base+', '+mods.join(', ');
  ta.value=enhanced;
  // Trigger oninput pour le compteur de caracteres
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  toast('✨ Prompt enrichi'+(wasFrench?' + traduit EN':'')+' (style : '+style.label+')','ok');
  // Animation flash
  ta.classList.add('prompt-flash');setTimeout(()=>ta.classList.remove('prompt-flash'),800);
}

let currentEnhanceStyle='realistic';
function setEnhanceStyle(s){
  currentEnhanceStyle=s;
  document.querySelectorAll('.enh-style').forEach(el=>el.classList.toggle('on',el.dataset.style===s));
}

function toggleEnhancerPanel(){
  q('enh-pop')?.classList.toggle('on');
}
function renderEnhancerStyles(){
  const el=q('enh-styles');if(!el)return;
  el.innerHTML=Object.entries(PROMPT_STYLES).map(([k,p])=>`<div class="enh-style${k===currentEnhanceStyle?' on':''}" data-style="${k}" onclick="setEnhanceStyle('${k}')">${p.label}</div>`).join('');
}

/* ══════════════════════════════════════════════
   IMPORT MODÈLES EXTERNES  (GLB / STL / OBJ / 3MF)
   100% client-side, aucun appel API.
   ══════════════════════════════════════════════ */
async function importModel(e){
  const file=e?.target?.files?.[0]||e;
  if(!file)return;
  await _importFile(file);
  if(e?.target)e.target.value=''; // reset pour réimporter le même
}

async function _importFile(file){
  const name=file.name||'imported';
  const ext=name.toLowerCase().split('.').pop();
  if(!['glb','gltf','stl','obj','3mf'].includes(ext)){
    toast('Format non supporté : '+ext,true);return;
  }
  if(!scene)init3();
  toast('Import '+name+'…');
  try{
    const buf=await file.arrayBuffer();
    if(mesh){scene.remove(mesh);mesh=null}
    if(ext==='glb'||ext==='gltf')await loadGLB(buf);
    else if(ext==='stl')loadSTL(buf);
    else if(ext==='obj')_loadOBJ(new TextDecoder().decode(buf));
    else if(ext==='3mf')await _load3MF(buf);
    if(!mesh){toast('Échec import — fichier invalide',true);return}
    // Affichage viewer + activation UI
    q('cv').style.display='block';q('emp').style.display='none';
    const impId='imp_'+Date.now().toString(36);
    const blob=new Blob([buf],{type:'application/octet-stream'});
    const blobUrl=URL.createObjectURL(blob);
    mUrls={glb:blobUrl,_taskId:impId,_imported:true,_importedName:name};
    origUrl=blobUrl;origThumb=null;ppTaskId=null;
    q('br').disabled=false;q('bw').disabled=false;q('bc').disabled=false;
    q('ex-glb')?.classList.remove('dis');q('ex-bambu')?.classList.remove('dis');
    q('hb').classList.add('on');
    setStage('Modèle importé · '+name,true);
    // Add to history
    addH({id:impId,prompt:'📦 Import : '+name,mode:'import',status:'done',quality:'imported',glb:blobUrl});
    // Stocke en IDB pour persistance
    await idbPut(impId,buf);
    setTimeout(()=>{const th=captureCanvasThumb();updH(impId,'done',th||null,blobUrl,true);showSpecs(hist[0]);showFils()},800);
    toast('✓ '+name+' importé','ok');
  }catch(err){console.error(err);toast('Erreur import : '+err.message.slice(0,50),true)}
}

/* Parser OBJ simplifié (v / vn / vt / f) */
function _loadOBJ(txt){
  const positions=[],normals=[],uvs=[];
  const finalPos=[],finalNorm=[],finalUV=[];
  txt.split('\n').forEach(line=>{
    const parts=line.trim().split(/\s+/);
    const cmd=parts[0];
    if(cmd==='v')positions.push([+parts[1],+parts[2],+parts[3]]);
    else if(cmd==='vn')normals.push([+parts[1],+parts[2],+parts[3]]);
    else if(cmd==='vt')uvs.push([+parts[1],+parts[2]]);
    else if(cmd==='f'){
      // f v/vt/vn  (triangulate if quad+)
      const verts=parts.slice(1).map(p=>p.split('/').map(x=>parseInt(x)||0));
      for(let i=1;i<verts.length-1;i++){
        [verts[0],verts[i],verts[i+1]].forEach(v=>{
          const p=positions[v[0]-1];if(p)finalPos.push(...p);
          const t=uvs[v[1]-1];if(t)finalUV.push(...t);
          const n=normals[v[2]-1];if(n)finalNorm.push(...n);
        });
      }
    }
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(finalPos),3));
  if(finalNorm.length===finalPos.length)g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(finalNorm),3));
  else g.computeVertexNormals();
  if(finalUV.length*3===finalPos.length*2)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(finalUV),2));
  mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xc0c0c8,roughness:.45,metalness:.1}));
  finM();
}

/* Parser 3MF minimaliste — extrait le .model XML du ZIP */
async function _load3MF(buf){
  // 3MF = ZIP avec 3D/3dmodel.model dedans (XML). On parse en cherchant les vertex + triangles.
  // Pour simplicité on tente d'extraire la 1ère partie comme texte (3MF ZIP simples) :
  try{
    const u8=new Uint8Array(buf);
    // Cherche le marqueur "3dmodel.model" et lit le XML qui suit (très approximatif)
    const dec=new TextDecoder('utf-8',{fatal:false});
    const text=dec.decode(u8);
    const start=text.indexOf('<vertices>');
    if(start<0)throw new Error('3MF parsing simple a échoué — utilise OBJ/STL/GLB');
    const verts=[];const tris=[];
    const vRe=/<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"\s*\/>/g;
    let m;while((m=vRe.exec(text)))verts.push([+m[1],+m[2],+m[3]]);
    const tRe=/<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"\s*\/>/g;
    while((m=tRe.exec(text)))tris.push([+m[1],+m[2],+m[3]]);
    if(!verts.length||!tris.length)throw new Error('3MF vide');
    const pos=new Float32Array(tris.length*9);
    for(let i=0;i<tris.length;i++){
      for(let j=0;j<3;j++){
        const v=verts[tris[i][j]];if(!v)continue;
        pos[i*9+j*3]=v[0];pos[i*9+j*3+1]=v[1];pos[i*9+j*3+2]=v[2];
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.computeVertexNormals();
    mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xc0c0c8,roughness:.45,metalness:.1}));
    finM();
  }catch(e){throw new Error('3MF non lisible — convertis en STL ou OBJ')}
}

/* Drag & drop global sur toute la fenêtre */
function initGlobalDrop(){
  let dragCounter=0;
  const overlay=q('drop-global');
  window.addEventListener('dragenter',e=>{
    if(!e.dataTransfer?.types?.includes('Files'))return;
    e.preventDefault();dragCounter++;if(overlay)overlay.classList.add('on');
  });
  window.addEventListener('dragleave',e=>{
    e.preventDefault();dragCounter--;if(dragCounter<=0){dragCounter=0;if(overlay)overlay.classList.remove('on')}
  });
  window.addEventListener('dragover',e=>{e.preventDefault()});
  window.addEventListener('drop',async e=>{
    e.preventDefault();dragCounter=0;if(overlay)overlay.classList.remove('on');
    const f=e.dataTransfer?.files?.[0];if(!f)return;
    const ext=f.name.toLowerCase().split('.').pop();
    if(['glb','gltf','stl','obj','3mf'].includes(ext))await _importFile(f);
    else if(['jpg','jpeg','png','webp'].includes(ext)){
      // Image -> bascule en mode Image et l'ajoute
      setMode('image');
      const r=new FileReader();
      r.onload=ev=>{imgs[1].push({b64:ev.target.result.split(',')[1],url:ev.target.result,type:f.type,name:f.name});renderGrid(1,1);toast('✓ Image ajoutée','ok')};
      r.readAsDataURL(f);
    }else toast('Format non supporté : '+ext,true);
  });
}

/* ══════════════════════════════════════════════
   AUTO-ORIENTATION pour impression 3D
   Teste 6 orientations principales (axes ±X/±Y/±Z)
   et choisit celle qui minimise les overhangs.
   ══════════════════════════════════════════════ */
function autoOrient(){
  if(!mesh){toast('Aucun modèle',true);return}
  toast('Analyse orientation…');
  const before=_snapshotTransform();
  setTimeout(()=>{
    _doAutoOrient();
    const after=_snapshotTransform();
    if(before&&after){pushUndo({label:'Auto-orientation',undo:()=>_restoreTransform(before),redo:()=>_restoreTransform(after)})}
  },30);
}
function _doAutoOrient(){
  // 24 orientations possibles (rotations 90° sur axes principaux)
  const orientations=[
    {name:'défaut',euler:[0,0,0]},
    {name:'rotation 90° X',euler:[Math.PI/2,0,0]},
    {name:'rotation 180° X',euler:[Math.PI,0,0]},
    {name:'rotation -90° X',euler:[-Math.PI/2,0,0]},
    {name:'rotation 90° Z',euler:[0,0,Math.PI/2]},
    {name:'rotation -90° Z',euler:[0,0,-Math.PI/2]},
  ];
  let best=null;
  const original=mesh.rotation.clone();
  orientations.forEach(o=>{
    mesh.rotation.set(o.euler[0],o.euler[1],o.euler[2]);
    mesh.updateMatrixWorld(true);
    const score=_scoreOrientation();
    if(!best||score.total<best.score.total){best={o,score:score}}
  });
  // Appliquer la meilleure
  if(best){
    mesh.rotation.set(best.o.euler[0],best.o.euler[1],best.o.euler[2]);
    rx=mesh.rotation.x;ry=mesh.rotation.y;
    mesh.updateMatrixWorld(true);
    // Recentrer
    const box=new THREE.Box3().setFromObject(mesh);
    const center=new THREE.Vector3();box.getCenter(center);
    mesh.position.sub(center);mesh.position.y-=box.min.y-mesh.position.y; // pose sur le plateau
    mesh.position.y=-box.min.y+(box.max.y-box.min.y)/2; // recentre en hauteur visuelle
    toast(`✓ Orientation : ${best.o.name} (${best.score.overhangPct}% overhangs, ${best.score.contactArea} contact)`,'ok');
  }else{
    mesh.rotation.copy(original);
    toast('Orientation inchangée',true);
  }
}

/* Score d'orientation : overhangs + surface de contact au plateau */
function _scoreOrientation(){
  if(!mesh)return{total:Infinity,overhangPct:0,contactArea:0};
  let downFaces=0,totalFaces=0,contactArea=0;
  const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3(),tmpC=new THREE.Vector3();
  // Trouver Y min pour détecter "au plateau"
  const box=new THREE.Box3().setFromObject(mesh);const minY=box.min.y;const tol=(box.max.y-minY)*0.02;
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;const idx=g.index;
    if(!pos)return;
    const m=n.matrixWorld;
    const facesCount=idx?idx.count/3:pos.count/3;
    const stride=Math.max(1,Math.floor(facesCount/3000));
    for(let i=0;i<facesCount;i+=stride){
      const i0=idx?idx.getX(i*3):i*3,i1=idx?idx.getX(i*3+1):i*3+1,i2=idx?idx.getX(i*3+2):i*3+2;
      tmpA.fromBufferAttribute(pos,i0).applyMatrix4(m);
      tmpB.fromBufferAttribute(pos,i1).applyMatrix4(m);
      tmpC.fromBufferAttribute(pos,i2).applyMatrix4(m);
      const ux=tmpB.x-tmpA.x,uy=tmpB.y-tmpA.y,uz=tmpB.z-tmpA.z;
      const vx=tmpC.x-tmpA.x,vy=tmpC.y-tmpA.y,vz=tmpC.z-tmpA.z;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      const lenN=Math.sqrt(nx*nx+ny*ny+nz*nz);if(lenN<1e-6)continue;
      const dotY=ny/lenN;
      totalFaces++;
      if(dotY<-0.3)downFaces++;
      // Contact au plateau : face quasi-horizontale orientée vers le bas ET proche du minY
      const avgY=(tmpA.y+tmpB.y+tmpC.y)/3;
      if(dotY<-0.95&&Math.abs(avgY-minY)<tol){
        const area=lenN/2;contactArea+=area;
      }
    }
  });
  const overhangPct=totalFaces>0?Math.round(downFaces/totalFaces*100):0;
  const total=overhangPct*10-Math.min(contactArea*5,200); // bonus contact, malus overhang
  return{total,overhangPct,contactArea:Math.round(contactArea*100)/100};
}

/* ══════════════════════════════════════════════
   MESURES dans le viewer (distance + angle)
   ══════════════════════════════════════════════ */
let measMode=false,measTool='distance',measPoints=[],measMarkers=[],measLines=[],measLabels=[];

function toggleMeasure(){
  measMode=!measMode;
  q('meas-hud')?.classList.toggle('on',measMode);
  q('b-measure')?.classList.toggle('on',measMode);
  if(!measMode)clearMeasures();
  else{toast('Mode mesure : clic sur le mesh pour poser des points');setSecMode(false)}
}
function setMeasTool(t){
  measTool=t;
  document.querySelectorAll('.meas-tool[data-tool]').forEach(el=>el.classList.toggle('on',el.dataset.tool===t));
  q('meas-help').textContent=t==='distance'?'Clic sur 2 points sur le mesh':'Clic sur 3 points (vertex, sommet, autre côté)';
  clearMeasures();
}
function clearMeasures(){
  measPoints=[];
  measMarkers.forEach(m=>scene.remove(m));measMarkers=[];
  measLines.forEach(l=>scene.remove(l));measLines=[];
  measLabels.forEach(l=>{if(l.parentNode)l.parentNode.removeChild(l)});measLabels=[];
  q('meas-result').textContent='';
}
function _addMeasMarker(p){
  const g=new THREE.SphereGeometry(0.025,12,12);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x9eff3a}));
  m.position.copy(p);scene.add(m);measMarkers.push(m);
}
function _addMeasLine(a,b){
  const g=new THREE.BufferGeometry().setFromPoints([a,b]);
  const m=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x9eff3a,linewidth:2}));
  scene.add(m);measLines.push(m);
}

/* Click handler pour mesures (appelé depuis init3) */
function _handleMeasureClick(e){
  if(!measMode||!mesh)return false;
  const cv=q('cv');const rect=cv.getBoundingClientRect();
  const mouse=new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
  const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObject(mesh,true);
  if(!hits.length)return true;
  const p=hits[0].point.clone();
  measPoints.push(p);_addMeasMarker(p);
  // Distance : 2 points
  if(measTool==='distance'){
    if(measPoints.length===2){
      _addMeasLine(measPoints[0],measPoints[1]);
      // Conversion vers mm via baseScale
      const bsc=mesh.userData?.baseScale||1;
      const dist=measPoints[0].distanceTo(measPoints[1])/bsc*100*modelScale;
      q('meas-result').textContent='📏 '+dist.toFixed(2)+' mm';
      q('meas-help').textContent='Clic pour mesurer une nouvelle distance';
      measPoints=[];
    }
  }
  // Angle : 3 points (sommet au milieu)
  else if(measTool==='angle'){
    if(measPoints.length===3){
      _addMeasLine(measPoints[0],measPoints[1]);
      _addMeasLine(measPoints[1],measPoints[2]);
      const v1=measPoints[0].clone().sub(measPoints[1]).normalize();
      const v2=measPoints[2].clone().sub(measPoints[1]).normalize();
      const ang=Math.acos(Math.max(-1,Math.min(1,v1.dot(v2))))*180/Math.PI;
      q('meas-result').textContent='📐 '+ang.toFixed(1)+'°';
      q('meas-help').textContent='Clic pour mesurer un nouvel angle';
      measPoints=[];
    }
  }
  return true;
}

/* ══════════════════════════════════════════════
   SECTION TRANSVERSALE (clipping plane)
   ══════════════════════════════════════════════ */
let secMode=false,secAxis='x',secValue=100,secPlane=null;

function toggleSection(){setSecMode(!secMode)}
function setSecMode(on){
  secMode=on;
  q('sec-hud')?.classList.toggle('on',on);
  q('b-section')?.classList.toggle('on',on);
  if(!on){
    // désactiver clipping
    if(renderer)renderer.localClippingEnabled=false;
    if(mesh)mesh.traverse(n=>{if(n.isMesh)n.material.clippingPlanes=null});
    q('sec-result').textContent='Plan désactivé';
  }else{
    if(measMode)toggleMeasure();
    _updateSectionPlane();
  }
}
function setSecAxis(a){
  secAxis=a;
  document.querySelectorAll('.meas-tool[data-axis]').forEach(el=>el.classList.toggle('on',el.dataset.axis===a));
  _updateSectionPlane();
}
function setSecValue(v){secValue=v;_updateSectionPlane()}
function _updateSectionPlane(){
  if(!mesh||!secMode)return;
  if(!renderer)return;
  renderer.localClippingEnabled=true;
  const box=new THREE.Box3().setFromObject(mesh);
  const sz=new THREE.Vector3();box.getSize(sz);
  const cen=new THREE.Vector3();box.getCenter(cen);
  const ratio=secValue/100; // -1..1
  let normal,constant;
  if(secAxis==='x'){normal=new THREE.Vector3(-1,0,0);constant=cen.x+sz.x/2*ratio}
  else if(secAxis==='y'){normal=new THREE.Vector3(0,-1,0);constant=cen.y+sz.y/2*ratio}
  else{normal=new THREE.Vector3(0,0,-1);constant=cen.z+sz.z/2*ratio}
  const plane=new THREE.Plane(normal,constant);
  mesh.traverse(n=>{if(n.isMesh){n.material.clippingPlanes=[plane];n.material.clipShadows=true;n.material.side=THREE.DoubleSide;n.material.needsUpdate=true}});
  q('sec-result').textContent='Plan '+secAxis.toUpperCase()+' · '+secValue+'%';
}

/* ══════════════════════════════════════════════
   EXPORT LOCAL — STL binaire + OBJ depuis le mesh Three.js
   Aucun appel API, aucun crédit, conversion 100% client.
   ══════════════════════════════════════════════ */

/* Récupère tous les triangles du mesh en coordonnées monde */
function _collectTriangles(){
  if(!mesh)return null;
  const tris=[];
  mesh.updateMatrixWorld(true);
  const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3(),tmpC=new THREE.Vector3();
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;const idx=g.index;
    if(!pos)return;
    const count=idx?idx.count:pos.count;
    const m=n.matrixWorld;
    for(let i=0;i<count;i+=3){
      const i0=idx?idx.getX(i):i,i1=idx?idx.getX(i+1):i+1,i2=idx?idx.getX(i+2):i+2;
      tmpA.fromBufferAttribute(pos,i0).applyMatrix4(m);
      tmpB.fromBufferAttribute(pos,i1).applyMatrix4(m);
      tmpC.fromBufferAttribute(pos,i2).applyMatrix4(m);
      tris.push([tmpA.x,tmpA.y,tmpA.z,tmpB.x,tmpB.y,tmpB.z,tmpC.x,tmpC.y,tmpC.z]);
    }
  });
  return tris;
}

/* STL binaire : 80 bytes header + uint32 count + (50 bytes par triangle) */
function _buildBinarySTL(tris){
  const n=tris.length;
  const buf=new ArrayBuffer(84+n*50);
  const dv=new DataView(buf);
  // Header (80 bytes UTF-8, fillé de zéros)
  const head='FORM 3D · binary STL · '+new Date().toISOString();
  for(let i=0;i<Math.min(head.length,80);i++)dv.setUint8(i,head.charCodeAt(i));
  // Triangle count
  dv.setUint32(80,n,true);
  let off=84;
  for(let i=0;i<n;i++){
    const t=tris[i];
    // Normale via produit vectoriel
    const ux=t[3]-t[0],uy=t[4]-t[1],uz=t[5]-t[2];
    const vx=t[6]-t[0],vy=t[7]-t[1],vz=t[8]-t[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=len;ny/=len;nz/=len;
    dv.setFloat32(off,nx,true);dv.setFloat32(off+4,ny,true);dv.setFloat32(off+8,nz,true);off+=12;
    for(let j=0;j<9;j++){dv.setFloat32(off,t[j],true);off+=4}
    dv.setUint16(off,0,true);off+=2; // attribute byte count
  }
  return buf;
}

async function exportSTLLocal(){
  if(!mesh){toast('Génère d\'abord un modèle',true);return}
  toast('Conversion locale STL…');
  await new Promise(r=>setTimeout(r,30)); // laisse le toast s'afficher
  const tris=_collectTriangles();
  if(!tris||!tris.length){toast('Aucun mesh à exporter',true);return}
  const buf=_buildBinarySTL(tris);
  const filename='form-3d_'+Date.now().toString(36)+'.stl';
  downloadBlob(new Blob([buf],{type:'application/sla'}),filename);
  toast('✓ STL téléchargé ('+tris.length.toLocaleString('fr')+' triangles · gratuit)','ok');
}

/* OBJ texte avec normales + UVs (sans matériaux pour simplicité) */
function _buildOBJ(){
  if(!mesh)return null;
  mesh.updateMatrixWorld(true);
  const lines=['# FORM 3D OBJ export','# '+new Date().toISOString(),'o form_model'];
  const vPos=[],vNorm=[],vUV=[],faces=[];
  let vOff=1,vnOff=1,vtOff=1; // OBJ indices 1-based
  const tmpV=new THREE.Vector3(),tmpN=new THREE.Vector3();
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;const nor=g.attributes.normal;const uv=g.attributes.uv;const idx=g.index;
    if(!pos)return;
    const m=n.matrixWorld;const nm=new THREE.Matrix3().getNormalMatrix(m);
    const hasN=!!nor,hasUV=!!uv;
    const startV=vOff,startN=vnOff,startUV=vtOff;
    // Vertices
    for(let i=0;i<pos.count;i++){
      tmpV.fromBufferAttribute(pos,i).applyMatrix4(m);
      vPos.push('v '+tmpV.x.toFixed(6)+' '+tmpV.y.toFixed(6)+' '+tmpV.z.toFixed(6));
    }
    vOff+=pos.count;
    // Normals
    if(hasN){
      for(let i=0;i<nor.count;i++){
        tmpN.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize();
        vNorm.push('vn '+tmpN.x.toFixed(6)+' '+tmpN.y.toFixed(6)+' '+tmpN.z.toFixed(6));
      }
      vnOff+=nor.count;
    }
    // UVs
    if(hasUV){
      for(let i=0;i<uv.count;i++){vUV.push('vt '+uv.getX(i).toFixed(6)+' '+uv.getY(i).toFixed(6))}
      vtOff+=uv.count;
    }
    // Faces
    const fcount=idx?idx.count:pos.count;
    for(let i=0;i<fcount;i+=3){
      const i0=(idx?idx.getX(i):i)+startV,i1=(idx?idx.getX(i+1):i+1)+startV,i2=(idx?idx.getX(i+2):i+2)+startV;
      const n0=hasN?(idx?idx.getX(i):i)+startN:null,n1=hasN?(idx?idx.getX(i+1):i+1)+startN:null,n2=hasN?(idx?idx.getX(i+2):i+2)+startN:null;
      const u0=hasUV?(idx?idx.getX(i):i)+startUV:null,u1=hasUV?(idx?idx.getX(i+1):i+1)+startUV:null,u2=hasUV?(idx?idx.getX(i+2):i+2)+startUV:null;
      const fmt=v=>v+(hasUV?'/'+(v-startV+startUV):'')+(hasN?'/'+(v-startV+startN):(hasUV?'':''));
      faces.push('f '+fmt(i0)+' '+fmt(i1)+' '+fmt(i2));
    }
  });
  return lines.concat(vPos,vNorm,vUV,faces).join('\n');
}

async function exportOBJLocal(){
  if(!mesh){toast('Génère d\'abord un modèle',true);return}
  toast('Conversion locale OBJ…');
  await new Promise(r=>setTimeout(r,30));
  const txt=_buildOBJ();
  if(!txt){toast('Aucun mesh à exporter',true);return}
  const filename='form-3d_'+Date.now().toString(36)+'.obj';
  downloadBlob(new Blob([txt],{type:'text/plain'}),filename);
  const tris=txt.split('\nf ').length-1;
  toast('✓ OBJ téléchargé ('+tris.toLocaleString('fr')+' faces · gratuit)','ok');
}

/* Helper : télécharge un blob avec nom de fichier garanti */
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

async function doE(fmt){
  if(!mUrls.glb){toast('Génère d\'abord un modèle',true);return}
  const fmtLow=fmt.toLowerCase();
  const ext='.'+fmtLow;
  const base='form-3d_'+(Date.now().toString(36));
  // Confirmation pour les exports payants (sauf TRELLIS qui est local)
  const isPaidFormat=fmtLow!=='glb';
  const usesTripoCredits=isPaidFormat&&backend==='tripo'&&!mUrls._trellis;
  if(usesTripoCredits){
    if(!confirm('💰 Cette conversion va consommer ~10 crédits Tripo.\n\n💡 Pour économiser : exporte en GLB (gratuit) et convertis localement avec Blender (File → Import glTF 2.0 → Export STL).\n\nContinuer la conversion en '+fmt+' ?'))return;
  }
  // Warning couleur sur STL si le modèle a des textures
  if(fmtLow==='stl'&&meshHasTextures()){
    if(!confirm('⚠️ STL ne supporte pas les couleurs.\n\nTon modèle a des textures qui seront perdues.\n\n3MF préserve la couleur et est natif Bambu Studio.\n\nContinuer en STL ?'))return;
  }
  // TRELLIS / blob URL
  if(backend==='trellis'||mUrls._trellis){
    if(fmtLow!=='glb'){toast('Mode TRELLIS : GLB uniquement — utilise Bambu Studio pour convertir',true);return}
    try{const r=await fetch(mUrls.glb);const blob=await r.blob();downloadBlob(blob,base+ext);toast('✓ '+fmt.toUpperCase()+' téléchargé','ok');}
    catch(e){toast('Erreur téléchargement',true)}
    return;
  }
  const key=q('akey').value.trim();
  // GLB direct depuis IDB ou proxy
  if(fmtLow==='glb'){
    const buf=mUrls._taskId?await idbGet(mUrls._taskId):null;
    if(buf){downloadBlob(new Blob([buf],{type:'model/gltf-binary'}),base+ext);toast('✓ GLB téléchargé','ok');return}
    try{const r=await fetch(PROXY+'/model?url='+encodeURIComponent(mUrls.glb));const blob=await r.blob();downloadBlob(blob,base+ext);toast('✓ GLB téléchargé','ok');}
    catch(e){toast('Erreur téléchargement',true)}
    return;
  }
  // Conversion via Tripo API → STL/3MF/FBX/OBJ
  toast('Conversion '+fmt+'…');
  const flat=q('opt-flat').checked;
  try{
    const res=await fetch(PROXY+'/task',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'convert_model',format:fmt,original_model_task_id:mUrls._taskId,flatten_bottom:flat,pivot_to_center_bottom:flat})});
    const d=await res.json();if(!res.ok)throw new Error(d.message);const convId=d.data.task_id;
    const pint=setInterval(async()=>{
      const r2=await fetch(PROXY+'/task/'+convId,{headers:{'Authorization':'Bearer '+key}});const d2=await r2.json();
      if(d2.data?.status==='success'){
        clearInterval(pint);const url=d2.data.output?.model;
        if(url){
          // Toujours fetch comme blob pour forcer le nom + extension
          try{const rr=await fetch(PROXY+'/model?url='+encodeURIComponent(url));const blob=await rr.blob();downloadBlob(blob,base+ext);toast('✓ '+fmt+' téléchargé !','ok');}
          catch(e){toast('Erreur téléchargement',true)}
        }
      }else if(['failed','cancelled'].includes(d2.data?.status)){clearInterval(pint);toast('Conversion échouée',true)}
    },2000);
  }catch(e){toast(e.message.slice(0,60),true)}
}

/* ══════════════════════════════════════════════
   HISTORIQUE — persistance localStorage + IndexedDB
   ══════════════════════════════════════════════ */
function loadHist(){try{hist=JSON.parse(localStorage.getItem(HIST_KEY)||'[]')}catch(e){hist=[]}rH();idbPrune()}
function saveHist(){try{localStorage.setItem(HIST_KEY,JSON.stringify(hist.slice(0,50)))}catch(e){}}
function addH(item){item.date=new Date().toISOString();hist.unshift(item);saveHist();rH()}
// updH : MAJ statut, thumb (data URL), glb URL, et flag persisted (présent dans IDB)
function updH(id,st,th,glbUrl,persisted){
  const h=hist.find(x=>x.id===id);
  if(!h)return;
  h.status=st;
  if(th)h.thumb=th;
  if(glbUrl)h.glb=glbUrl;
  if(persisted)h.persisted=true;
  saveHist();rH();
}
async function clearHist(){
  if(!confirm('Effacer tout l\'historique ?'))return;
  // Supprime aussi les GLB en IDB
  for(const h of hist){if(h.id)await idbDel(h.id)}
  hist=[];histSelIdx=-1;saveHist();rH();
  const img=q('hi-prev-img');if(img)img.style.display='none';
  const em=q('hi-prev-empty');if(em)em.style.display='block';
  const bd=q('hi-prev-badge');if(bd)bd.style.display='none';
}
function selH(i){
  histSelIdx=i;
  document.querySelectorAll('.hi').forEach((el,j)=>el.classList.toggle('on',j===i));
  const h=hist[i];if(!h)return;
  // Mise à jour du preview (image data URL stockée dans h.thumb)
  const img=q('hi-prev-img'),em=q('hi-prev-empty'),bd=q('hi-prev-badge');
  if(h.thumb){if(img){img.src=h.thumb;img.style.display='block'}if(em)em.style.display='none'}
  else{if(img)img.style.display='none';if(em){em.style.display='block';em.innerHTML='Pas d\'aperçu disponible'}}
  if(bd){bd.textContent=(h.quality||'hd').toUpperCase()+' · '+(h.mode||'');bd.style.display='block'}
  if(h.status==='done')showSpecs(h);
  // Chargement du modèle 3D depuis IDB en priorité, sinon URL
  if(h.status==='done')_loadHistModel(h);
}
function reloadFromHist(){if(histSelIdx>=0&&hist[histSelIdx])_loadHistModel(hist[histSelIdx])}
async function _loadHistModel(h){
  if(!scene)init3();
  q('cv').style.display='block';q('emp').style.display='none';
  // Priorité 1 : IndexedDB (persistant à travers les refresh)
  let buf=h.id?await idbGet(h.id):null;
  if(buf){
    try{
      const dv=new DataView(buf);
      if(mesh){scene.remove(mesh);mesh=null}
      if(dv.getUint32(0,true)===0x46546C67)await loadGLB(buf);else loadSTL(buf);
      // Reconstruit un blob URL pour Bambu/export
      const blob=new Blob([buf],{type:'model/gltf-binary'});
      const blobUrl=URL.createObjectURL(blob);
      const isTrl=h.quality==='trellis';
      mUrls={glb:blobUrl,_taskId:h.id,_trellis:isTrl,_trellisBlobUrl:isTrl?blobUrl:undefined};
      ppTaskId=isTrl?null:h.id;
      _afterHistLoadUI(h,isTrl);
      toast('✓ Modèle rechargé (IDB)','ok');
      return;
    }catch(e){console.warn('IDB load failed:',e)}
  }
  // Priorité 2 : URL stockée (peut être expirée pour Tripo)
  if(h.glb){
    try{
      await loadM(h.glb);
      const isTrl=h.quality==='trellis';
      mUrls={glb:h.glb,_taskId:h.id,_trellis:isTrl};ppTaskId=isTrl?null:h.id;
      _afterHistLoadUI(h,isTrl);
      // Si chargement OK depuis URL → re-persist en IDB pour la prochaine fois
      if(!isTrl)persistGlb(h.id,h.glb);
      toast('✓ Modèle rechargé','ok');
      return;
    }catch(e){}
  }
  toast('Modèle non disponible — URL expirée. Régénère le modèle.',true);
}
function _afterHistLoadUI(h,isTrl){
  q('br').disabled=false;q('bw').disabled=false;q('bc').disabled=false;q('hb').classList.add('on');
  if(!isTrl)q('pp-bar')?.classList.add('on');
  q('ex-glb')?.classList.remove('dis');q('ex-bambu')?.classList.remove('dis');
  if(!isTrl)['stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.remove('dis'));
  else['stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.add('dis'));
  setStage('Prêt · '+(h.quality||'hd').toUpperCase(),true);
}
function rH(){
  const el=q('hist');
  if(!el)return;
  if(!hist.length){
    el.innerHTML='<div class="he empty-state"><div class="es-ico">⬡</div><h4>Aucune génération</h4><p>Tes créations apparaîtront ici.<br>Décris ton objet et clique <b>Générer</b>.</p><button class="es-cta" onclick="q(\'prompt\').focus()">Commencer ➜</button></div>';
    return;
  }
  // Filtre
  let filtered=hist;
  if(histFilter){
    filtered=hist.filter(h=>
      (h.prompt||'').toLowerCase().includes(histFilter)||
      (h.mode||'').toLowerCase().includes(histFilter)||
      (h.quality||'').toLowerCase().includes(histFilter)
    );
  }
  if(!filtered.length){el.innerHTML='<div class="he">Aucun résultat pour "'+histFilter+'"</div>';return}
  el.innerHTML=filtered.map(h=>{
    const i=hist.indexOf(h);
    const sel=i===histSelIdx?' on':(i===0&&histSelIdx<0?' on':'');
    const promptShort=(h.prompt||'').slice(0,22)+((h.prompt||'').length>22?'…':'');
    const dateShort=h.date?new Date(h.date).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    const canRegen=h.mode!=='import'; // imports ne se regenerent pas
    return `<div class="hi${sel}" onclick="selH(${i})">
      <div class="hiT">${h.thumb?`<img src="${h.thumb}" alt="thumbnail"/>`:'⬡'}</div>
      <div style="flex:1;min-width:0">
        <div class="hip">${promptShort}</div>
        <div class="him">${h.mode}·${h.quality||'hd'}·${dateShort}</div>
      </div>
      <div class="hi-actions">
        ${canRegen?`<button class="hi-act" aria-label="Re-générer ce modèle" title="Re-générer" onclick="event.stopPropagation();regenFromHist(${i})">↻</button>`:''}
        <div class="hid d${h.status==='done'?'ok':h.status==='error'?'er':'ld'}"></div>
      </div>
    </div>`;
  }).join('');
}

/* Re-genere a partir d'un item d'historique : restaure le prompt et clique Generate */
function regenFromHist(i){
  const h=hist[i];if(!h){toast('Item introuvable',true);return}
  // Restaure mode + prompt
  if(h.mode==='import'){toast('Pas de regen pour un import',true);return}
  setMode(h.mode||'text');
  if(h.mode==='hybrid'){if(q('prompt2'))q('prompt2').value=h.prompt||'';}
  else if(h.mode==='text'){if(q('prompt'))q('prompt').value=h.prompt||''}
  if(h.quality&&['turbo','standard','hd'].includes(h.quality)){
    quality=h.quality;
    document.querySelectorAll('.q-card').forEach(c=>{
      const oc=c.getAttribute('onclick')||'';
      c.classList.toggle('on',oc.includes("'"+h.quality+"'"));
    });
  }
  updateCost();
  toast('🔄 Paramètres restaurés — clique Générer','ok');
  // Animation flash sur bouton generate
  q('gbtn')?.classList.add('btn-pulse');
  setTimeout(()=>q('gbtn')?.classList.remove('btn-pulse'),1500);
}

/* Détection overhangs : > 45° → supports nécessaires */
function detectSupports(mesh){
  if(!mesh)return{needed:false,score:0,reason:'Pas de mesh'};
  let overhang=0,total=0;
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;const idx=g.index;
    if(!pos)return;
    const facesCount=idx?idx.count/3:pos.count/3;
    for(let i=0;i<Math.min(facesCount,2000);i++){
      const i0=idx?idx.getX(i*3):i*3,i1=idx?idx.getX(i*3+1):i*3+1,i2=idx?idx.getX(i*3+2):i*3+2;
      const ax=pos.getX(i0),ay=pos.getY(i0),az=pos.getZ(i0);
      const bx=pos.getX(i1),by=pos.getY(i1),bz=pos.getZ(i1);
      const cx=pos.getX(i2),cy=pos.getY(i2),cz=pos.getZ(i2);
      // normale via produit vectoriel
      const ux=bx-ax,uy=by-ay,uz=bz-az;
      const vx=cx-ax,vy=cy-ay,vz=cz-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      const len=Math.sqrt(nx*nx+ny*ny+nz*nz);if(len<1e-6)continue;
      const dotY=ny/len; // composante Y de la normale normalisée
      total++;
      if(dotY<-0.3)overhang++; // face pointant vers le bas avec angle > 17°
    }
  });
  const ratio=total>0?overhang/total:0;
  return{
    needed:ratio>0.05,
    score:Math.round(ratio*100),
    reason:ratio>0.2?'Beaucoup d\'overhangs (>'+Math.round(ratio*100)+'%)':ratio>0.05?'Overhangs détectés ('+Math.round(ratio*100)+'%)':'Modèle stable'
  };
}

function showSpecs(h){
  const bbox=mesh?new THREE.Box3().setFromObject(mesh):null;const sz=new THREE.Vector3();if(bbox)bbox.getSize(sz);
  const bsc=mesh?.userData?.baseScale||mesh?.scale?.x||1;
  const dX=Math.round(Math.max(sz.x/bsc,0.05)*100*modelScale)||100;
  const dY=Math.round(Math.max(sz.y/bsc,0.05)*100*modelScale)||150;
  const dZ=Math.round(Math.max(sz.z/bsc,0.05)*100*modelScale)||100;
  const maxD=Math.max(dX,dY,dZ);
  const printer=PRINTERS[selectedPrinter]||PRINTERS['X2D'];
  const mat=MATS[currentMat]||MATS.PLA;
  // Vérif fit sur plateau
  const fits=dX<=printer.plate[0]&&dY<=printer.plate[1]&&dZ<=printer.plate[2];
  // Calculs filament
  const vol=dX*dY*dZ*0.35/1000; // cm³ estimé (35% remplissage moyen incl. murs)
  const surfaceArea=2*(dX*dY+dY*dZ+dX*dZ)/100; // cm²
  const wG=Math.round(vol*mat.density);
  const lenM=(wG/(mat.density*Math.PI*0.875*0.875)/100).toFixed(2);
  // Temps : ajusté selon vitesse imprimante + matériau
  const speedFactor=(600/printer.speed)*(1/mat.speed); // X2D=1, plus lent = plus
  const tMin=Math.round(wG*2.5*speedFactor);
  const tH=Math.floor(tMin/60),tM=tMin%60;
  // Épaisseur couche selon qualité + buse
  const layerOpts={hd:nozzleSize*0.4,std:nozzleSize*0.5,fast:nozzleSize*0.6};
  const layerH=(layerOpts[maxD>200?'hd':maxD>100?'std':'fast']||0.2).toFixed(2);
  // Cooling
  const cool=`${mat.fanMin}-${mat.fanMax}%`;
  // Supports
  const sup=detectSupports(mesh);
  const supLabel=sup.needed?`Recommandés · ${sup.reason}`:'Non nécessaires · '+sup.reason;
  // Plateau
  const plate=mat.bed>=90?'Engineering Plate / High Temp':mat.bed>=80?'PEI Texturé / Smooth':'Cool Plate / PEI';
  // Couleur ?
  const colorOk=meshHasTextures();
  // Murs / top/bottom selon qualité
  const wallCount=maxD>150?3:2;
  const topBottom=maxD>150?5:4;
  // Coût électricité (estimation 0.20 €/kWh, conso ~150W)
  const kwh=(tMin/60*0.150).toFixed(3);
  const elecCost=(kwh*0.20).toFixed(3);
  const matCost=(wG/1000*matPrice).toFixed(2);
  const totalCost=(parseFloat(elecCost)+parseFloat(matCost)).toFixed(2);

  currentSpecs={
    // Méta
    prompt:h.prompt||'—',taskId:h.id,date:h.date?new Date(h.date).toLocaleString('fr-FR'):'—',quality:(h.quality||'hd').toUpperCase(),
    // Imprimante
    printer:printer.label,profile:printer.profileName,plate:printer.plate.join('×')+' mm',fits,multicolor:colorOk&&printer.multicolor>1,
    // Géométrie
    dims:`${dX}×${dY}×${dZ} mm`,maxD:maxD+' mm',volume:vol.toFixed(1)+' cm³',surface:surfaceArea.toFixed(1)+' cm²',
    // Matériau / filament
    mat:mat.label,matDesc:mat.desc,weight:wG+' g',fil:lenM+' m · ⌀ 1.75 mm',density:mat.density+' g/cm³',
    // Températures
    nozzleTemp:mat.nozzle+'°C',bedTemp:mat.bed+'°C',
    // Buse / couches
    nozzle:nozzleSize+' mm',layer:layerH+' mm',firstLayer:(parseFloat(layerH)*1.5).toFixed(2)+' mm',
    // Vitesses
    speedOuter:Math.round(printer.speed*0.5*mat.speed)+' mm/s',speedInner:Math.round(printer.speed*0.7*mat.speed)+' mm/s',speedInfill:Math.round(printer.speed*mat.speed)+' mm/s',speedTravel:Math.round(printer.speed*1.2)+' mm/s',accel:printer.accel+' mm/s²',
    // Structure
    walls:wallCount+' (périmètres)',topBottom:topBottom+' couches',infill:'15%',infillPattern:'Gyroid',
    // Cooling / mécanique
    cooling:cool+' ('+mat.cooling+')',retract:mat.retract+' mm',zHop:mat.zHop+' mm',
    // Adhésion + supports
    adhesion:mat.bed>=90?'Brim 5mm + colle stick':'Brim 3mm',
    supports:supLabel,supportType:sup.needed?'Tree (auto)':'—',supportInterface:sup.needed?mat.supportInterface:'—',
    // Plateau / enclosure
    plate,enclosure:printer.enclosed?'Fermée (recommandée)':'Ouverte',
    // Temps / coûts
    time:tH+'h'+String(tM).padStart(2,'0'),power:kwh+' kWh',matCost:matCost+' €',elecCost:elecCost+' €',totalCost:totalCost+' €',
    // Color
    color:colorOk?(printer.multicolor>1?'✓ Multicolor (AMS '+printer.multicolor+')':'✓ Texture présente — single color'):'Mesh nu (pas de texture)',
  };

  let warns='';
  if(!fits)warns+=warnRow('Modèle trop grand pour '+printer.label+' ('+printer.plate.join('×')+' mm) — réduire l\'échelle');
  if(colorOk&&printer.multicolor<=1)warns+=warnRow('Multicolor indisponible sur '+printer.label+' — utiliser X2D / X1C / P1S');
  if(mat.bed>=90&&!printer.enclosed)warns+=warnRow(mat.label+' nécessite une enclosure — préférer X2D / X1C / P1S');

  q('specs-content').innerHTML='<div class="specs-inner" style="padding:10px 12px">'+warns+'<div class="spec-sec-dummy"><div class="spec-sec-body">'+
    secH('🖨 Imprimante')+
    sR('🏷','Modèle',currentSpecs.printer)+
    sR('📋','Profil slicer',currentSpecs.profile)+
    sR('📏','Volume d\'impression',currentSpecs.plate)+
    sR('🧰','Enclosure',currentSpecs.enclosure)+
    sR('🎨','Multicolor',currentSpecs.color)+
    secH('📐 Géométrie')+
    sR('📐','Dimensions',currentSpecs.dims)+
    sR('📊','Volume mesh',currentSpecs.volume)+
    sR('🔲','Surface',currentSpecs.surface)+
    sR('⚖','Poids estimé',currentSpecs.weight)+
    secH('🧵 Matériau')+
    sR('🧪','Filament',currentSpecs.mat+' — '+currentSpecs.matDesc)+
    sR('🎯','Densité',currentSpecs.density)+
    sR('📏','Longueur',currentSpecs.fil)+
    sR('🌡','Température buse',currentSpecs.nozzleTemp)+
    sR('🔥','Température plateau',currentSpecs.bedTemp)+
    secH('🔧 Couches & buse')+
    sR('🔘','Buse',currentSpecs.nozzle)+
    sR('📑','Épaisseur couche',currentSpecs.layer)+
    sR('1️⃣','Première couche',currentSpecs.firstLayer)+
    sR('🧱','Murs',currentSpecs.walls)+
    sR('⬆','Top/Bottom',currentSpecs.topBottom)+
    sR('🔳','Remplissage',currentSpecs.infill+' · '+currentSpecs.infillPattern)+
    secH('⚡ Vitesses')+
    sR('🌀','Périmètre extérieur',currentSpecs.speedOuter)+
    sR('🌀','Périmètre intérieur',currentSpecs.speedInner)+
    sR('▦','Remplissage',currentSpecs.speedInfill)+
    sR('💨','Déplacement',currentSpecs.speedTravel)+
    sR('⚙','Accélération',currentSpecs.accel)+
    secH('🏗 Supports & adhésion')+
    sR('🏗','Supports',currentSpecs.supports)+
    sR('🌳','Type supports',currentSpecs.supportType)+
    sR('📎','Interface',currentSpecs.supportInterface)+
    sR('📍','Adhésion plateau',currentSpecs.adhesion)+
    sR('🔴','Plateau recommandé',currentSpecs.plate)+
    secH('🌬 Refroidissement & mécanique')+
    sR('🌬','Ventilation',currentSpecs.cooling)+
    sR('↩','Rétraction',currentSpecs.retract)+
    sR('⬇','Z-hop',currentSpecs.zHop)+
    secH('⏱ Temps & coûts')+
    sR('⏱','Temps d\'impression',currentSpecs.time)+
    sR('⚡','Conso électrique',currentSpecs.power)+
    sR('💰','Coût filament',currentSpecs.matCost)+
    sR('🔌','Coût électricité',currentSpecs.elecCost)+
    sR('💶','Coût total',currentSpecs.totalCost)+
    secH('🔑 Métadonnées')+
    sR('📝','Prompt',currentSpecs.prompt.slice(0,80)+(currentSpecs.prompt.length>80?'…':''))+
    sR('🆔','Task ID',(currentSpecs.taskId||'—').slice(0,20)+'…')+
    sR('📅','Date',currentSpecs.date)+
    sR('⭐','Qualité gen',currentSpecs.quality)+
    '</div></div></div>';
  q('copy-specs-btn').disabled=false;setRTab('specs');
}
function sR(ico,label,val){return`<div class="spec-row"><span class="spec-ico">${ico}</span><div><div class="spec-label">${label}</div><div class="spec-val">${val}</div></div></div>`}
function secH(t){return`</div></div><div class="spec-sec"><div class="spec-section-h" onclick="toggleSpecSec(this)"><span>${t}</span><span class="spec-caret">▾</span></div><div class="spec-sec-body">`}
/* La structure utilise '</div></div>' pour fermer la section precedente avant d'en ouvrir une nouvelle.
   On wrappe la sortie de showSpecs avec un debut/fin specifique. */
function warnRow(t){return`<div class="spec-warn">⚠️ ${t}</div>`}

function copySpecs(){
  if(!currentSpecs)return;
  const cs=currentSpecs;
  const t=`╔════════════════════════════════════════╗
║   FORM 3D · Profil Bambu Studio        ║
╚════════════════════════════════════════╝

🖨 IMPRIMANTE
  Modèle          : ${cs.printer}
  Profil          : ${cs.profile}
  Volume          : ${cs.plate}
  Enclosure       : ${cs.enclosure}
  Multicolor      : ${cs.color}

📐 GÉOMÉTRIE
  Dimensions      : ${cs.dims}
  Volume mesh     : ${cs.volume}
  Surface         : ${cs.surface}
  Poids           : ${cs.weight}

🧵 MATÉRIAU
  Filament        : ${cs.mat} (${cs.matDesc})
  Densité         : ${cs.density}
  Longueur        : ${cs.fil}
  T° buse         : ${cs.nozzleTemp}
  T° plateau      : ${cs.bedTemp}

🔧 COUCHES
  Buse            : ${cs.nozzle}
  Épaisseur       : ${cs.layer}
  1ère couche     : ${cs.firstLayer}
  Murs            : ${cs.walls}
  Top/Bottom      : ${cs.topBottom}
  Remplissage     : ${cs.infill} · ${cs.infillPattern}

⚡ VITESSES
  Périmètre ext.  : ${cs.speedOuter}
  Périmètre int.  : ${cs.speedInner}
  Remplissage     : ${cs.speedInfill}
  Déplacement     : ${cs.speedTravel}
  Accélération    : ${cs.accel}

🏗 SUPPORTS & ADHÉSION
  Supports        : ${cs.supports}
  Type            : ${cs.supportType}
  Interface       : ${cs.supportInterface}
  Adhésion        : ${cs.adhesion}
  Plateau         : ${cs.plate}

🌬 REFROIDISSEMENT
  Ventilation     : ${cs.cooling}
  Rétraction      : ${cs.retract}
  Z-hop           : ${cs.zHop}

⏱ TEMPS & COÛTS
  Temps           : ${cs.time}
  Électricité     : ${cs.power} (${cs.elecCost})
  Filament        : ${cs.matCost}
  TOTAL           : ${cs.totalCost}

📝 Prompt : ${cs.prompt}
🆔 Task   : ${cs.taskId}
📅 Date   : ${cs.date}`;
  navigator.clipboard.writeText(t).then(()=>toast('✓ Specs complètes copiées !','ok')).catch(()=>toast('Erreur copie',true));
}

/* Setter pour le profil imprimante */
function setPrinter(name){
  if(!PRINTERS[name])return;
  selectedPrinter=name;
  // Reset nozzle si non disponible
  const p=PRINTERS[name];
  if(!p.nozzles.includes(nozzleSize))nozzleSize=p.nozzleDef;
  document.querySelectorAll('.pr-card').forEach(c=>c.classList.toggle('on',c.dataset.printer===name));
  renderNozzleOpts();
  if(hist.length&&hist[0])showSpecs(hist[0]);
  localStorage.setItem('form3d_printer',name);
}
function setNozzle(n){
  nozzleSize=n;
  document.querySelectorAll('.nz-card').forEach(c=>c.classList.toggle('on',+c.dataset.nz===n));
  if(hist.length&&hist[0])showSpecs(hist[0]);
}
function renderPrinterGrid(){
  const el=q('printer-grid');if(!el)return;
  el.innerHTML=Object.entries(PRINTERS).map(([k,p])=>`<div class="pr-card${k===selectedPrinter?' on':''}" data-printer="${k}" onclick="setPrinter('${k}')"><div class="pr-name">${p.label}</div><div class="pr-sub">${p.plate[0]}×${p.plate[1]}×${p.plate[2]} · ${p.speed}mm/s</div><div class="pr-desc">${p.desc}</div></div>`).join('');
}
function renderNozzleOpts(){
  const el=q('nozzle-row');if(!el)return;
  const p=PRINTERS[selectedPrinter]||PRINTERS['X2D'];
  el.innerHTML=p.nozzles.map(n=>`<div class="nz-card${n===nozzleSize?' on':''}" data-nz="${n}" onclick="setNozzle(${n})">${n} mm</div>`).join('');
}

function showFils(){
  const cols=inferCols();const mat=MATS[currentMat]||MATS.PLA;
  // Calcule le poids reel depuis le mesh courant (au lieu d'un fixe 20g)
  let bg=20;
  if(mesh){
    const bbox=new THREE.Box3().setFromObject(mesh);
    const sz=new THREE.Vector3();bbox.getSize(sz);
    const bsc=mesh.userData?.baseScale||mesh.scale.x||1;
    const dX=Math.max(sz.x/bsc,0.05)*100*modelScale;
    const dY=Math.max(sz.y/bsc,0.05)*100*modelScale;
    const dZ=Math.max(sz.z/bsc,0.05)*100*modelScale;
    // Volume mesh estime ~ 35% du bbox (figurine moyenne)
    const volCm3=dX*dY*dZ*0.35/1000;
    bg=Math.max(1,volCm3*mat.density);
  }
  const per=Math.floor(100/cols.length),rem=100-per*cols.length;
  const items=cols.map((c,i)=>{const pct=per+(i===0?rem:0);return{color:c.hex,name:c.name+' ('+currentMat+')',pct,g:Math.round(bg*mat.density*pct/100)}});
  const tg=items.reduce((a,f)=>a+f.g,0);
  const mLen=(tg/(mat.density*Math.PI*0.875*0.875)).toFixed(1);
  const cost=(tg/1000*matPrice).toFixed(2);
  q('fil-list').innerHTML=items.map(f=>`<div class="fi"><div class="fsw" style="background:${f.color}"></div><div style="flex:1"><div class="fin-n">${f.name}</div><div class="fin-p">${f.pct}%</div><div class="fbw"><div class="fb" style="width:${f.pct}%;background:${f.color}"></div></div></div><div class="fg">${f.g}g</div></div>`).join('');
  q('fil-foot').textContent=`Total : ~${tg}g · ~${mLen}m · ${items.length} filament${items.length>1?'s':''}`;
  const ce=q('fil-cost-eur');if(ce)ce.textContent=cost+' €';
}
function setMat(m){currentMat=m;document.querySelectorAll('.mat-card').forEach(c=>c.classList.toggle('on',c.dataset.mat===m));showFils()}
function setMatPrice(v){matPrice=parseFloat(v)||25;showFils()}
function initMatGrid(){q('mat-grid').innerHTML=Object.entries(MATS).map(([k,m])=>`<div class="mat-card${k===currentMat?' on':''}" data-mat="${k}" onclick="setMat('${k}')"><div class="mat-name">${m.label}</div><div class="mat-den">${m.density}g/cm³</div></div>`).join('')}
function inferCols(){const p=(q('prompt').value||q('prompt2').value||'').toLowerCase();const map=[{k:['blanc','white'],hex:'#f0f0f0',name:'Blanc'},{k:['noir','black'],hex:'#1a1a1a',name:'Noir'},{k:['rouge','red'],hex:'#cc2200',name:'Rouge'},{k:['bleu','blue'],hex:'#1144cc',name:'Bleu'},{k:['vert','green'],hex:'#116633',name:'Vert'},{k:['gris','grey','gray'],hex:'#888888',name:'Gris'},{k:['or','gold'],hex:'#d4aa20',name:'Doré'},{k:['violet','purple'],hex:'#663388',name:'Violet'},{k:['marron','brown'],hex:'#6b3a2a',name:'Marron'},{k:['orange'],hex:'#dd6611',name:'Orange'},{k:['rose','pink'],hex:'#e060a0',name:'Rose'}];const found=map.filter(m=>m.k.some(k=>p.includes(k)));return found.length?found:[{hex:'#c0c0c8',name:'Gris neutre'},{hex:'#1a1a1a',name:'Noir'}]}

function setBatch(n,el){batchN=n;document.querySelectorAll('.batch-btn').forEach(b=>b.classList.remove('on'));el.classList.add('on');q('batch-tray').classList.remove('on');batchResults=[];updateCost()}

let _scaleBefore=null,_scaleTimer=null;
function setScale(v){
  if(!_scaleBefore)_scaleBefore=_snapshotTransform();
  modelScale=v/100;
  if(mesh&&mesh.userData.baseScale)mesh.scale.setScalar(mesh.userData.baseScale*modelScale);
  q('scale-lbl').textContent=v+'%';
  updateHeightInput();
  if(baseGroup)applyBase();
  if(hist.length)showSpecs(hist[0]);
  clearTimeout(_scaleTimer);
  _scaleTimer=setTimeout(()=>{
    const before=_scaleBefore,after=_snapshotTransform();
    _scaleBefore=null;
    if(before&&after&&JSON.stringify(before.scl)!==JSON.stringify(after.scl)){
      pushUndo({label:'Changement d\'échelle',undo:()=>_restoreTransform(before),redo:()=>_restoreTransform(after)});
    }
  },500);
}

function toggleAutoRotate(){
  autoRotate=!autoRotate;
  q('b-rotate')?.classList.toggle('on',autoRotate);
  localStorage.setItem('form3d_autorotate',autoRotate?'1':'0');
  toast(autoRotate?'▶ Rotation auto activée':'⏸ Rotation auto stoppée');
}

/* ══════════════════════════════════════════════
   HAUTEUR EN MM — autosize via modelScale
   La hauteur reelle d'un modele = sz.y/baseScale × 100 mm × modelScale
   Donc modelScale = targetMm / (sz.y/baseScale × 100)
   ══════════════════════════════════════════════ */
function getModelHeightMm(){
  if(!mesh)return 0;
  const box=new THREE.Box3().setFromObject(mesh);
  const sz=new THREE.Vector3();box.getSize(sz);
  const bsc=mesh.userData?.baseScale||mesh.scale.x||1;
  return Math.round(Math.max(sz.y/bsc,0.05)*100);
}

function setHeightMm(targetMm){
  if(!mesh||!targetMm||targetMm<5)return;
  const before=_snapshotTransform?.();
  const box=new THREE.Box3().setFromObject(mesh);
  const sz=new THREE.Vector3();box.getSize(sz);
  const bsc=mesh.userData?.baseScale||1;
  const currentMm=Math.max(sz.y/bsc,0.05)*100*modelScale;
  if(currentMm<=0)return;
  const factor=targetMm/currentMm;
  const newScale=modelScale*factor;
  modelScale=Math.max(0.05,Math.min(10,newScale));
  mesh.scale.setScalar(bsc*modelScale);
  // MAJ UI
  const sl=q('scale-sl');if(sl)sl.value=Math.round(modelScale*100);
  const ll=q('scale-lbl');if(ll)ll.textContent=Math.round(modelScale*100)+'%';
  const hi=q('scale-mm-inp');if(hi)hi.value=Math.round(getModelHeightMm()*modelScale);
  if(hist.length)showSpecs(hist[0]);
  if(typeof _snapshotTransform==='function'){
    const after=_snapshotTransform();
    if(before&&after&&typeof pushUndo==='function')pushUndo({label:'Hauteur '+Math.round(targetMm)+' mm',undo:()=>_restoreTransform(before),redo:()=>_restoreTransform(after)});
  }
  toast('📏 Hauteur : '+Math.round(targetMm)+' mm','ok');
}

function updateHeightInput(){
  const inp=q('scale-mm-inp');if(!inp)return;
  const mm=Math.round(getModelHeightMm()*modelScale);
  if(mm>0&&document.activeElement!==inp)inp.value=mm;
}

/* ══════════════════════════════════════════════
   SOCLE / PLATEFORME — disc / hex / square
   Ajoute un mesh sous le modele pour stabilite impression
   ══════════════════════════════════════════════ */
function toggleBasePanel(){
  q('base-hud')?.classList.toggle('on');
  q('b-base')?.classList.toggle('on',q('base-hud').classList.contains('on'));
}

function setBaseType(t){
  baseConfig.type=t;
  document.querySelectorAll('.base-type').forEach(el=>el.classList.toggle('on',el.dataset.t===t));
  if(baseGroup)applyBase();
}
function setBaseThickness(mm){
  baseConfig.thicknessMm=mm;
  const lbl=q('base-thick-val');if(lbl)lbl.textContent=mm.toFixed(1)+' mm';
  if(baseGroup)applyBase();
}
function setBaseMargin(pct){
  baseConfig.marginPct=pct;
  const lbl=q('base-margin-val');if(lbl)lbl.textContent=pct+'%';
  if(baseGroup)applyBase();
}

function applyBase(){
  if(!mesh)return;
  removeBase();
  // Compute bbox du modele en coord locale du mesh (avant ajout du socle)
  const box=new THREE.Box3().setFromObject(mesh);
  const sz=new THREE.Vector3();box.getSize(sz);
  const bsc=mesh.userData?.baseScale||1;
  // largeur/profondeur reelle en mm
  const wMm=Math.max(sz.x/bsc*100*modelScale,1);
  const dMm=Math.max(sz.z/bsc*100*modelScale,1);
  // Ajoute marge
  const margin=1+baseConfig.marginPct/100;
  const baseDiamMm=baseConfig.diameterMm>0?baseConfig.diameterMm:Math.max(wMm,dMm)*margin;
  // Convert mm vers unites scene (1 mm = 0.01 unite scene car baseScale*100 = mm)
  const baseDiam=baseDiamMm/100*bsc;
  const baseThick=baseConfig.thicknessMm/100*bsc;
  let geo;
  if(baseConfig.type==='hex')geo=new THREE.CylinderGeometry(baseDiam/2,baseDiam/2,baseThick,6);
  else if(baseConfig.type==='square')geo=new THREE.BoxGeometry(baseDiam,baseThick,baseDiam);
  else geo=new THREE.CylinderGeometry(baseDiam/2,baseDiam/2,baseThick,48);
  const mat=new THREE.MeshStandardMaterial({color:0x404048,roughness:.7,metalness:.15});
  const baseMesh=new THREE.Mesh(geo,mat);
  // Positionner sous le mesh : Y = min Y du mesh - moitie epaisseur
  baseGroup=new THREE.Group();
  // Place dans coord MONDE puis ajoute a scene (pas au mesh) pour eviter rotations
  const minY=box.min.y;
  baseMesh.position.y=minY-baseThick/2;
  baseGroup.add(baseMesh);
  scene.add(baseGroup);
  // Update UI feedback
  const stats=q('base-stats');if(stats)stats.textContent='Ø '+Math.round(baseDiamMm)+' mm · '+baseConfig.thicknessMm.toFixed(1)+' mm épais';
}

function removeBase(){if(baseGroup){scene.remove(baseGroup);baseGroup.traverse(n=>{n.geometry?.dispose?.();n.material?.dispose?.()});baseGroup=null}}

function addBase(){applyBase();toast('✓ Socle ajouté','ok')}
function clearBase(){removeBase();toast('Socle retiré')}

function toggleCompare(){
  if(!origUrl){toast('Génère d\'abord un modèle',true);return}
  compareMode=!compareMode;
  q('cmp-overlay').classList.toggle('on',compareMode);
  q('bcmp').classList.toggle('on',compareMode);
  if(compareMode){
    const img=q('cmp-orig');const noThumb=q('cmp-no-thumb');
    if(origThumb){img.src=origThumb;img.style.display='block';noThumb.style.display='none'}
    else{img.style.display='none';noThumb.style.display='block'}
  }
}

function loadStats(){try{const s=JSON.parse(localStorage.getItem(STATS_KEY)||'null');if(s&&s.gens!==undefined){stats.gens=s.gens||0;stats.creds=s.creds||0;stats.totalMs=s.totalMs||0;stats.t0=stats.t0}}catch(e){}}
function saveStats(){try{localStorage.setItem(STATS_KEY,JSON.stringify(stats))}catch(e){}}
function resetStats(){stats={gens:0,creds:0,totalMs:0,t0:Date.now()};saveStats();updateStats()}
function updateStats(){
  if(!q('st-gens'))return;
  q('st-gens').textContent=stats.gens;
  q('st-creds').textContent=stats.creds;
  const avgMs=stats.gens>0?Math.round(stats.totalMs/stats.gens):0;const avgS=Math.round(avgMs/1000);
  q('st-time').textContent=avgS>0?(avgS>=60?Math.floor(avgS/60)+'m'+String(avgS%60).padStart(2,'0')+'s':avgS+'s'):'—';
  const sessS=Math.round((Date.now()-stats.t0)/1000);
  q('st-sess').textContent=sessS>=3600?Math.floor(sessS/3600)+'h'+Math.floor((sessS%3600)/60)+'m':sessS>=60?Math.floor(sessS/60)+'m':sessS+'s';
}

function clrP(){if(poll){clearInterval(poll);poll=null}}
function setG(v){const b=q('gbtn');b.disabled=v;b.classList.toggle('ld',v);b.innerHTML=v?'<span class="spin">⟳</span> Génération en cours…':'<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Générer';const sb=q('stop-btn');if(sb)sb.classList.toggle('on',v&&backend==='trellis')}
function stopTrellis(){
  if(trellisAbortCtrl){trellisAbortCtrl.abort();trellisAbortCtrl=null}
  if(trellisPoll){clearInterval(trellisPoll);trellisPoll=null}
  const sb=q('stop-btn');if(sb)sb.classList.remove('on');
  setG(false);hidP();
  toast('⏹ Génération annulée');
}
function setPg(p,lbl,sub){q('pov').classList.add('on');q('emp').style.display='none';const c=2*Math.PI*30,off=c-(p/100)*c;q('rfl').style.strokeDashoffset=off;q('rpct').textContent=Math.round(p)+'%';q('plb').textContent=lbl;if(sub)q('psb').textContent=sub}
function hidP(){q('pov').classList.remove('on')}
function setStage(txt,done){['stage-chip','stage-chip2'].forEach(id=>{const c=q(id);if(!c)return;c.classList.add('on');c.classList.toggle('ac',done);c.classList.toggle('pu',!done)});['stage-txt','stage-txt2'].forEach(id=>{const el=q(id);if(el)el.textContent=txt});['stage-dot','stage-dot2'].forEach(id=>{const el=q(id);if(el)el.style.background=done?'var(--ac)':'var(--purple)'})}
function rstC(){dist=4;camera.position.set(0,0.5,4);camera.lookAt(0,0,0);if(mesh){mesh.rotation.set(0,0,0);mesh.position.set(0,0,0);rx=ry=panX=panY=0}}
function togW(){wire=!wire;apM();q('bw').classList.toggle('on',wire)}
function togC(){col=!col;apM();q('bc').classList.toggle('on',col)}
function apM(){if(!mesh)return;mesh.traverse(n=>{if(n.isMesh){n.material.wireframe=wire;if(!wire){if(!col){n.material.map=null;n.material.color.set(0xc0c0c8);n.material.needsUpdate=true}else{if(n.userData.om)n.material.map=n.userData.om;n.material.color.set(0xffffff);n.material.needsUpdate=true}}}})}
function openModal(id){q(id).classList.add('on')}
function closeModal(id){q(id).classList.remove('on')}
function setGuideTab(t){
  document.querySelectorAll('.guide-tab').forEach((el,i)=>{
    const onclick=el.getAttribute('onclick')||'';
    el.classList.toggle('on',onclick.includes("'"+t+"'"));
  });
  document.querySelectorAll('.guide-pane').forEach(el=>el.classList.toggle('on',el.id==='guide-'+t));
}
let tT;
function toast(msg,type=''){const t=q('toast');t.textContent=msg;t.className='toast on'+(type==='ok'?' ok':type===true||type==='err'?' err':'');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),3500)}

/* ══════════════════════════════════════════════
   COLOR PAINTER — vertex colors brush
   + COLORIZE FROM IMAGE — projection caméra
   ══════════════════════════════════════════════ */
let paintMode=false,paintColor='#9eff3a',paintRadius=0.15;
let paintHardness=0.5; // 0 = soft falloff, 1 = bord net
let paintBrushMode='soft'; // 'soft' | 'hard' | 'fill' | 'eyedrop'
let paintFillAngle=35; // degres : angle entre normales pour flood vertex mode
let paintFillTolerance=30; // tolerance couleur RGB pour flood texture mode (0-100)
let paintSurface='auto'; // 'auto' | 'texture' | 'vertex'
let _paintBeforeStroke=null;
let _faceAdjCache=null,_faceAdjCacheMesh=null; // cache d'adjacence des faces

/* ─── Canvas texture painting state ─── */
let paintCanvas=null,paintCtx=null,paintTexture=null;
let _origMaterials=null; // sauvegarde des materials originaux pour restaurer
let _paintModeIsTexture=false; // mode actif
let paintColorHistory=['#9eff3a','#ff4f4f','#4fc3f7','#f5a623','#b06ef3','#ffffff','#1a1a1a','#76b900'];

function togglePaint(){
  paintMode=!paintMode;
  q('paint-hud')?.classList.toggle('on',paintMode);
  q('b-paint')?.classList.toggle('on',paintMode);
  if(paintMode){
    if(measMode)toggleMeasure();
    if(secMode)setSecMode(false);
    // Tente le mode texture (couvre vraiment) sinon fallback vertex colors
    const wantTex=paintSurface!=='vertex';
    let texOk=false;
    if(wantTex)texOk=_enterTextureMode();
    if(!texOk)_ensureVertexColors();
    // MAJ UI
    q('paint-surface-info').textContent=_paintModeIsTexture
      ?'🖼 Mode texture (couvre la texture existante)'
      :'⬡ Mode vertex colors (multi-color AMS)';
    toast(_paintModeIsTexture?'Mode peinture sur texture · couvre les détails existants':'Mode peinture · clic + drag');
  }else{
    if(_paintModeIsTexture)_exitTextureMode(true); // keep les modifs pour le viewer
  }
}

function setPaintSurface(s){
  paintSurface=s;
  if(!paintMode)return;
  // Re-toggle pour appliquer
  if(s==='vertex'&&_paintModeIsTexture)_exitTextureMode(true);
  else if(s==='texture'&&!_paintModeIsTexture){_ensureVertexColors();_enterTextureMode()}
  q('paint-surface-info').textContent=_paintModeIsTexture?'🖼 Mode texture':'⬡ Mode vertex colors';
}

function setPaintColor(c){
  paintColor=c;
  const el=q('paint-color-display');if(el)el.style.background=c;
  if(!paintColorHistory.includes(c)){paintColorHistory.unshift(c);paintColorHistory=paintColorHistory.slice(0,8);renderPaintHistory()}
}
function setPaintRadius(v){paintRadius=v;const lbl=q('paint-radius-val');if(lbl)lbl.textContent=v.toFixed(2)}
function setPaintHardness(v){
  paintHardness=v;
  const lbl=q('paint-hardness-val');if(lbl)lbl.textContent=Math.round(v*100)+'%';
}
function setBrushMode(m){
  paintBrushMode=m;
  document.querySelectorAll('.brush-mode').forEach(el=>el.classList.toggle('on',el.dataset.brush===m));
  // Affiche/cache les controles selon le mode
  q('paint-radius-row')?.classList.toggle('hidden',m==='fill'||m==='eyedrop');
  q('paint-hardness-row')?.classList.toggle('hidden',m==='fill'||m==='eyedrop'||m==='hard');
  q('paint-fill-row')?.classList.toggle('hidden',m!=='fill');
  // Curseur indicatif
  const cv=q('cv');if(cv){
    cv.style.cursor=m==='eyedrop'?'crosshair':m==='fill'?'pointer':'auto';
  }
  if(m==='eyedrop')toast('Pipette : clic sur le mesh pour piocher une couleur');
  else if(m==='fill')toast('Remplissage : clic sur une partie pour la peindre entièrement');
}

/* ══════════════════════════════════════════════
   PEINTURE SUR TEXTURE (CanvasTexture)
   Bake la texture actuelle dans un canvas, remplace material.map,
   les coups de pinceau ecrivent sur le canvas → couvre vraiment.
   ══════════════════════════════════════════════ */
function _meshHasUV(){
  if(!mesh)return false;
  let has=false;
  mesh.traverse(n=>{if(n.isMesh&&n.geometry?.attributes?.uv)has=true});
  return has;
}

function _enterTextureMode(){
  if(_paintModeIsTexture||!mesh)return false;
  if(!_meshHasUV()){toast('Pas de UV — mode vertex colors',true);return false}
  // Trouve la meilleure texture source (la 1ere disponible) pour calibrer la taille
  let srcImg=null,srcW=1024,srcH=1024;
  mesh.traverse(n=>{
    if(srcImg)return;
    if(n.isMesh&&n.material?.map?.image){
      srcImg=n.material.map.image;srcW=srcImg.width||1024;srcH=srcImg.height||1024;
    }
  });
  // Cree le canvas avec la taille de la texture source (max 2048 pour les perf)
  const W=Math.min(srcW,2048),H=Math.min(srcH,2048);
  paintCanvas=document.createElement('canvas');
  paintCanvas.width=W;paintCanvas.height=H;
  paintCtx=paintCanvas.getContext('2d',{willReadFrequently:true});
  // Initialement : bake la texture existante (ou blanc si rien)
  if(srcImg){
    try{paintCtx.drawImage(srcImg,0,0,W,H)}catch(e){paintCtx.fillStyle='#ffffff';paintCtx.fillRect(0,0,W,H)}
  }else{
    paintCtx.fillStyle='#cccccc';paintCtx.fillRect(0,0,W,H);
  }
  paintTexture=new THREE.CanvasTexture(paintCanvas);
  paintTexture.flipY=false; // convention GLB
  paintTexture.encoding=THREE.sRGBEncoding;
  // Sauvegarde + applique à tous les meshes
  _origMaterials=[];
  mesh.traverse(n=>{
    if(!n.isMesh)return;
    _origMaterials.push({obj:n,map:n.material.map,vertexColors:n.material.vertexColors,color:n.material.color.clone()});
    n.material.map=paintTexture;
    n.material.vertexColors=false;
    n.material.color.set(0xffffff);
    n.material.needsUpdate=true;
  });
  _paintModeIsTexture=true;
  return true;
}

function _exitTextureMode(keep){
  if(!_paintModeIsTexture)return;
  if(_origMaterials){
    _origMaterials.forEach(o=>{
      if(!keep)o.obj.material.map=o.map;
      o.obj.material.vertexColors=o.vertexColors;
      o.obj.material.color.copy(o.color);
      o.obj.material.needsUpdate=true;
    });
  }
  _origMaterials=null;
  if(!keep){
    paintTexture?.dispose?.();
    paintTexture=null;paintCanvas=null;paintCtx=null;
  }
  _paintModeIsTexture=false;
}

/* Convertit hex '#rrggbb' en [r,g,b] 0-255 */
function _hexToRgb(h){
  h=h.replace('#','');
  return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}

/* Snapshot ImageData du canvas (pour undo en mode texture) */
function _snapshotCanvas(){
  if(!paintCtx)return null;
  return paintCtx.getImageData(0,0,paintCanvas.width,paintCanvas.height);
}
function _restoreCanvas(snap){
  if(!paintCtx||!snap)return;
  paintCtx.putImageData(snap,0,0);
  if(paintTexture)paintTexture.needsUpdate=true;
}

/* Peint un cercle sur le canvas a (u,v) avec hardness et radius */
function _paintCanvasAtUV(u,v){
  if(!paintCtx)return;
  const W=paintCanvas.width,H=paintCanvas.height;
  const x=u*W,y=(1-v)*H; // flip Y pour GLB (flipY:false)
  // Convert brush radius : 0.15 (default) → ~7% de la diagonale texture
  const diag=Math.sqrt(W*W+H*H);
  const r=Math.max(2,paintRadius*diag*0.18);
  const hard=paintBrushMode==='hard'||paintHardness>=0.999;
  if(hard){
    paintCtx.fillStyle=paintColor;
    paintCtx.beginPath();
    paintCtx.arc(x,y,r,0,Math.PI*2);
    paintCtx.fill();
  }else{
    // Brush mou : radial gradient avec plateau hardness
    const [rr,gg,bb]=_hexToRgb(paintColor);
    const grad=paintCtx.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,`rgba(${rr},${gg},${bb},1)`);
    grad.addColorStop(Math.max(0,paintHardness),`rgba(${rr},${gg},${bb},1)`);
    grad.addColorStop(1,`rgba(${rr},${gg},${bb},0)`);
    paintCtx.fillStyle=grad;
    paintCtx.fillRect(x-r,y-r,r*2,r*2);
  }
  paintTexture.needsUpdate=true;
}

/* Pipette canvas : lit la couleur au pixel (u,v) */
function _eyedropCanvasAtUV(u,v){
  if(!paintCtx)return null;
  const W=paintCanvas.width,H=paintCanvas.height;
  const x=Math.max(0,Math.min(W-1,Math.floor(u*W)));
  const y=Math.max(0,Math.min(H-1,Math.floor((1-v)*H)));
  const d=paintCtx.getImageData(x,y,1,1).data;
  return'#'+[d[0],d[1],d[2]].map(c=>c.toString(16).padStart(2,'0')).join('');
}

/* Flood fill raster (4-connectivite) avec tolerance couleur */
function _floodCanvasAtUV(u,v){
  if(!paintCtx)return 0;
  const W=paintCanvas.width,H=paintCanvas.height;
  const startX=Math.floor(u*W),startY=Math.floor((1-v)*H);
  const img=paintCtx.getImageData(0,0,W,H);
  const data=img.data;
  const idx0=(startY*W+startX)*4;
  const target=[data[idx0],data[idx0+1],data[idx0+2]];
  const [pr,pg,pb]=_hexToRgb(paintColor);
  if(target[0]===pr&&target[1]===pg&&target[2]===pb)return 0; // deja la bonne couleur
  const tol=paintFillTolerance*2.55; // 0-100 -> 0-255
  const tol2=tol*tol*3; // dist² 3D dans RGB
  const visited=new Uint8Array(W*H);
  const stack=[[startX,startY]];
  let painted=0;
  while(stack.length){
    const [x,y]=stack.pop();
    if(x<0||x>=W||y<0||y>=H)continue;
    const pi=y*W+x;
    if(visited[pi])continue;
    visited[pi]=1;
    const di=pi*4;
    const dr=data[di]-target[0],dg=data[di+1]-target[1],db=data[di+2]-target[2];
    if(dr*dr+dg*dg+db*db>tol2)continue;
    data[di]=pr;data[di+1]=pg;data[di+2]=pb;data[di+3]=255;
    painted++;
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  paintCtx.putImageData(img,0,0);
  paintTexture.needsUpdate=true;
  return painted;
}
function setPaintFillAngle(v){
  if(_paintModeIsTexture){
    paintFillTolerance=v;
    const lbl=q('paint-fill-angle-val');if(lbl)lbl.textContent=v+'%';
  }else{
    paintFillAngle=v;
    const lbl=q('paint-fill-angle-val');if(lbl)lbl.textContent=v+'°';
  }
}
function renderPaintHistory(){
  const el=q('paint-history');if(!el)return;
  el.innerHTML=paintColorHistory.map(c=>`<button class="paint-swatch" style="background:${c}" onclick="setPaintColor('${c}')"></button>`).join('');
}

/* Assure que chaque mesh a un BufferAttribute 'color' */
function _ensureVertexColors(){
  if(!mesh)return;
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;
    if(!g.attributes.color){
      const arr=new Float32Array(pos.count*3);
      // Init avec couleur du materiau (ou blanc)
      const matCol=n.material?.color||new THREE.Color(0xffffff);
      for(let i=0;i<pos.count;i++){arr[i*3]=matCol.r;arr[i*3+1]=matCol.g;arr[i*3+2]=matCol.b}
      g.setAttribute('color',new THREE.BufferAttribute(arr,3));
    }
    n.material.vertexColors=true;
    n.material.color.set(0xffffff); // ne pas teinter les vertex colors
    n.material.needsUpdate=true;
  });
}

/* Peint à la position cliquée — affecte tous les vertices dans le rayon
   Hardness 0 = falloff smooth, 1 = remplacement total bord net */
function _paintAtPoint(point,obj){
  if(!obj?.geometry)return 0;
  const g=obj.geometry;
  const pos=g.attributes.position;
  const col=g.attributes.color;
  if(!col)return 0;
  const c=new THREE.Color(paintColor);
  let painted=0;
  const local=point.clone();
  obj.worldToLocal(local);
  const r=paintRadius;
  const r2=r*r;
  // Force le bord net si mode 'hard' OU hardness === 1
  const hard=paintBrushMode==='hard'||paintHardness>=0.999;
  // Plateau central (zone d'opacite totale) defini par hardness
  const innerR=r*paintHardness;
  for(let i=0;i<pos.count;i++){
    const dx=pos.getX(i)-local.x,dy=pos.getY(i)-local.y,dz=pos.getZ(i)-local.z;
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2>=r2)continue;
    let t;
    if(hard){t=1}
    else{
      const d=Math.sqrt(d2);
      if(d<=innerR)t=1;
      else t=1-(d-innerR)/(r-innerR);
    }
    col.setXYZ(i,
      col.getX(i)+(c.r-col.getX(i))*t,
      col.getY(i)+(c.g-col.getY(i))*t,
      col.getZ(i)+(c.b-col.getZ(i))*t
    );
    painted++;
  }
  col.needsUpdate=true;
  return painted;
}

/* Construit la carte d'adjacence des faces : merge des vertices proches
   pour gerer les meshes non-indexed et trouver les faces voisines */
function _buildFaceAdjacency(obj){
  if(_faceAdjCache&&_faceAdjCacheMesh===obj)return _faceAdjCache;
  const g=obj.geometry;
  const pos=g.attributes.position;
  const idx=g.index;
  const fcount=idx?idx.count/3:pos.count/3;
  // Map "x,y,z" arrondi -> liste de face indices qui ont ce vertex
  const vertToFaces=new Map();
  const eps=1e-4;
  const round=v=>Math.round(v/eps);
  const faceVerts=new Array(fcount); // pour chaque face : [i0,i1,i2] (indices vertices)
  for(let f=0;f<fcount;f++){
    const i0=idx?idx.getX(f*3):f*3,i1=idx?idx.getX(f*3+1):f*3+1,i2=idx?idx.getX(f*3+2):f*3+2;
    faceVerts[f]=[i0,i1,i2];
    [i0,i1,i2].forEach(vi=>{
      const k=round(pos.getX(vi))+','+round(pos.getY(vi))+','+round(pos.getZ(vi));
      if(!vertToFaces.has(k))vertToFaces.set(k,[]);
      vertToFaces.get(k).push(f);
    });
  }
  // Pour chaque face : voisins = faces qui partagent au moins 1 vertex (même pos)
  const adj=new Array(fcount);
  for(let f=0;f<fcount;f++){
    const seen=new Set();
    faceVerts[f].forEach(vi=>{
      const k=round(pos.getX(vi))+','+round(pos.getY(vi))+','+round(pos.getZ(vi));
      (vertToFaces.get(k)||[]).forEach(nf=>{if(nf!==f)seen.add(nf)});
    });
    adj[f]=[...seen];
  }
  // Calcule normales par face
  const normals=new Array(fcount);
  const tA=new THREE.Vector3(),tB=new THREE.Vector3(),tC=new THREE.Vector3();
  for(let f=0;f<fcount;f++){
    const [i0,i1,i2]=faceVerts[f];
    tA.set(pos.getX(i0),pos.getY(i0),pos.getZ(i0));
    tB.set(pos.getX(i1),pos.getY(i1),pos.getZ(i1));
    tC.set(pos.getX(i2),pos.getY(i2),pos.getZ(i2));
    const e1=tB.clone().sub(tA),e2=tC.clone().sub(tA);
    normals[f]=e1.cross(e2).normalize();
  }
  _faceAdjCache={faceVerts,adj,normals,fcount};
  _faceAdjCacheMesh=obj;
  return _faceAdjCache;
}

/* Flood fill par adjacence + angle entre normales */
function _floodFillFromFace(obj,startFace){
  if(!obj?.geometry)return 0;
  const g=obj.geometry;const col=g.attributes.color;if(!col)return 0;
  const data=_buildFaceAdjacency(obj);
  const c=new THREE.Color(paintColor);
  const angleRad=paintFillAngle*Math.PI/180;
  const cosTh=Math.cos(angleRad);
  const visited=new Uint8Array(data.fcount);
  const queue=[startFace];visited[startFace]=1;
  let painted=0;
  while(queue.length){
    const f=queue.pop();
    // Peint les 3 vertices de cette face
    data.faceVerts[f].forEach(vi=>{
      col.setXYZ(vi,c.r,c.g,c.b);painted++;
    });
    const n0=data.normals[f];
    data.adj[f].forEach(nf=>{
      if(visited[nf])return;
      const n1=data.normals[nf];
      const dot=n0.dot(n1);
      if(dot>=cosTh){visited[nf]=1;queue.push(nf)}
    });
  }
  col.needsUpdate=true;
  return painted;
}

/* Pipette : lit la couleur du vertex le plus proche du hit */
function _eyedropAtHit(hit){
  const obj=hit.object;const g=obj.geometry;const col=g.attributes.color;const pos=g.attributes.position;
  if(!col||!pos){toast('Aucune couleur a piocher',true);return}
  // Trouve le vertex le plus proche du point d'impact (en local)
  const local=hit.point.clone();obj.worldToLocal(local);
  let bestI=-1,bestD2=Infinity;
  for(let i=0;i<pos.count;i++){
    const dx=pos.getX(i)-local.x,dy=pos.getY(i)-local.y,dz=pos.getZ(i)-local.z;
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2<bestD2){bestD2=d2;bestI=i}
  }
  if(bestI<0)return;
  const r=col.getX(bestI),v=col.getY(bestI),b=col.getZ(bestI);
  const hex='#'+[r,v,b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
  setPaintColor(hex);
  const inp=q('paint-color-input');if(inp)inp.value=hex;
  toast('🎨 Couleur piochée : '+hex,'ok');
  // Quitte automatiquement le mode pipette apres une pioche
  setBrushMode('soft');
}

function _handlePaintEvent(e,isInitialClick){
  if(!paintMode||!mesh)return false;
  const cv=q('cv');const rect=cv.getBoundingClientRect();
  const mouse=new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
  const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObject(mesh,true);
  if(!hits.length)return true;
  const h=hits[0];

  // ── MODE TEXTURE (peinture sur CanvasTexture, couvre vraiment) ──
  if(_paintModeIsTexture&&h.uv){
    if(paintBrushMode==='eyedrop'){
      if(!isInitialClick)return true;
      const hex=_eyedropCanvasAtUV(h.uv.x,h.uv.y);
      if(hex){setPaintColor(hex);const inp=q('paint-color-input');if(inp)inp.value=hex;toast('🎨 Couleur piochée : '+hex,'ok');setBrushMode('soft')}
      return true;
    }
    if(paintBrushMode==='fill'){
      if(!isInitialClick)return true;
      const painted=_floodCanvasAtUV(h.uv.x,h.uv.y);
      toast('🪣 Rempli : '+painted.toLocaleString('fr')+' pixels','ok');
      return true;
    }
    // Brush soft / hard sur canvas
    _paintCanvasAtUV(h.uv.x,h.uv.y);
    return true;
  }

  // ── MODE VERTEX COLORS (fallback si pas de UV ou mode force) ──
  if(paintBrushMode==='eyedrop'){
    if(isInitialClick)_eyedropAtHit(h);
    return true;
  }
  if(paintBrushMode==='fill'){
    if(!isInitialClick)return true;
    if(!_paintBeforeStroke)_paintBeforeStroke=_snapshotColors();
    const painted=_floodFillFromFace(h.object,h.faceIndex);
    toast('🪣 Rempli : '+painted.toLocaleString('fr')+' vertices','ok');
    return true;
  }
  _paintAtPoint(h.point,h.object);
  return true;
}

function clearPaint(){
  if(!mesh)return;
  if(!confirm(_paintModeIsTexture?'Restaurer la texture originale ?':'Effacer toute la peinture ?'))return;
  if(_paintModeIsTexture&&paintCtx){
    const before=_snapshotCanvas();
    // Re-bake la texture originale (avant peinture) si possible
    const orig=_origMaterials?.[0]?.map?.image;
    if(orig){try{paintCtx.drawImage(orig,0,0,paintCanvas.width,paintCanvas.height)}catch(e){paintCtx.fillStyle='#cccccc';paintCtx.fillRect(0,0,paintCanvas.width,paintCanvas.height)}}
    else{paintCtx.fillStyle='#cccccc';paintCtx.fillRect(0,0,paintCanvas.width,paintCanvas.height)}
    paintTexture.needsUpdate=true;
    const after=_snapshotCanvas();
    if(before&&after)pushUndo({label:'Réinitialiser texture',undo:()=>_restoreCanvas(before),redo:()=>_restoreCanvas(after)});
    toast('Texture restaurée');
    return;
  }
  const before=_snapshotColors();
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry?.attributes?.color)return;
    const col=n.geometry.attributes.color;
    for(let i=0;i<col.count;i++)col.setXYZ(i,1,1,1);
    col.needsUpdate=true;
  });
  const after=_snapshotColors();
  if(before&&after)pushUndo({label:'Effacer peinture',undo:()=>_restoreColors(before),redo:()=>_restoreColors(after)});
  toast('Peinture effacée');
}

/* Export 3MF basique avec vertex colors (compatible Bambu Studio) */
function export3MFWithColors(){
  if(!mesh){toast('Aucun modèle',true);return}
  toast('Génération 3MF…');
  setTimeout(()=>_do3MFExport(),30);
}
function _do3MFExport(){
  // 3MF = ZIP contenant 3D/3dmodel.model (XML)
  // On genere un XML minimal avec <vertices> + <triangles> + <colorgroup>
  if(!mesh)return;
  mesh.updateMatrixWorld(true);
  const verts=[];const tris=[];const colors=[];const colorIdxMap={};
  let vIdx=0;
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;const idx=g.index;const col=g.attributes.color;
    const m=n.matrixWorld;
    const tmp=new THREE.Vector3();
    const offV=vIdx;
    for(let i=0;i<pos.count;i++){
      tmp.fromBufferAttribute(pos,i).applyMatrix4(m);
      verts.push([tmp.x,tmp.y,tmp.z]);
      // Couleur hex
      if(col){
        const r=Math.round(col.getX(i)*255),vv=Math.round(col.getY(i)*255),b=Math.round(col.getZ(i)*255);
        const hex='#'+[r,vv,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
        if(colorIdxMap[hex]===undefined){colorIdxMap[hex]=colors.length;colors.push(hex)}
      }
      vIdx++;
    }
    const fcount=idx?idx.count:pos.count;
    for(let i=0;i<fcount;i+=3){
      const a=(idx?idx.getX(i):i)+offV;
      const b=(idx?idx.getX(i+1):i+1)+offV;
      const c=(idx?idx.getX(i+2):i+2)+offV;
      tris.push([a,b,c]);
    }
  });
  // Build XML
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n';
  xml+='<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">\n';
  xml+='<resources>\n';
  if(colors.length){
    xml+='<m:colorgroup id="1">\n';
    colors.forEach(c=>{xml+=`<m:color color="${c}"/>\n`});
    xml+='</m:colorgroup>\n';
  }
  xml+='<object id="2" type="model"><mesh>\n<vertices>\n';
  verts.forEach(v=>{xml+=`<vertex x="${v[0].toFixed(4)}" y="${v[1].toFixed(4)}" z="${v[2].toFixed(4)}"/>\n`});
  xml+='</vertices>\n<triangles>\n';
  tris.forEach(t=>{xml+=`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>\n`});
  xml+='</triangles>\n</mesh></object>\n</resources>\n';
  xml+='<build><item objectid="2"/></build>\n</model>\n';
  // Pack ZIP minimal manuellement (sans lib)
  const zip=_makeMinimalZip([
    {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'},
    {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'},
    {name:'3D/3dmodel.model',data:xml},
  ]);
  const filename='form-3d_'+Date.now().toString(36)+'.3mf';
  downloadBlob(new Blob([zip],{type:'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'}),filename);
  toast('✓ 3MF avec couleurs téléchargé ('+verts.length.toLocaleString('fr')+' vertices, '+colors.length+' couleurs)','ok');
}

/* Pack ZIP store-only (sans compression) — suffisant pour Bambu Studio */
function _makeMinimalZip(files){
  // CRC32 table
  if(!_crcTable){
    _crcTable=new Uint32Array(256);
    for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);_crcTable[i]=c>>>0}
  }
  const enc=new TextEncoder();
  const parts=[];const central=[];let offset=0;
  files.forEach(f=>{
    const nameBytes=enc.encode(f.name);
    const data=typeof f.data==='string'?enc.encode(f.data):f.data;
    let crc=0xFFFFFFFF;
    for(let i=0;i<data.length;i++)crc=(_crcTable[(crc^data[i])&0xFF]^(crc>>>8))>>>0;
    crc=(crc^0xFFFFFFFF)>>>0;
    // Local file header
    const lh=new ArrayBuffer(30+nameBytes.length);const lv=new DataView(lh);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0,true);lv.setUint16(8,0,true);
    lv.setUint16(10,0,true);lv.setUint16(12,0,true);
    lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);
    lv.setUint16(26,nameBytes.length,true);lv.setUint16(28,0,true);
    const lhBytes=new Uint8Array(lh);
    parts.push(lhBytes,nameBytes,data);
    // Central directory header
    const ch=new ArrayBuffer(46+nameBytes.length);const cv=new DataView(ch);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0,true);
    cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0,true);
    cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,nameBytes.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true);
    cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offset,true);
    central.push(new Uint8Array(ch),nameBytes);
    offset+=lhBytes.length+nameBytes.length+data.length;
  });
  // Central directory size
  let cdSize=0;central.forEach(p=>cdSize+=p.length);
  // EOCD
  const eocd=new ArrayBuffer(22);const ev=new DataView(eocd);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);
  ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true);
  // Assemblage final
  const total=offset+cdSize+22;
  const out=new Uint8Array(total);let pos=0;
  parts.forEach(p=>{out.set(p,pos);pos+=p.length});
  central.forEach(p=>{out.set(p,pos);pos+=p.length});
  out.set(new Uint8Array(eocd),pos);
  return out.buffer;
}
let _crcTable=null;

/* ══════════════════════════════════════════════
   COLORIZE FROM IMAGE — projection caméra
   Charge une image et la projette depuis l'angle actuel sur le mesh
   ══════════════════════════════════════════════ */
function openColorize(){
  q('colorize-file')?.click();
}

async function _doColorizeFromImage(file){
  if(!mesh){toast('Aucun modèle',true);return}
  toast('Colorisation depuis '+file.name+'…');
  _ensureVertexColors();
  const before=_snapshotColors();
  const dataUrl=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)});
  const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=dataUrl});
  // Cree un canvas pour echantillonner les pixels
  const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;
  const ctx=cv.getContext('2d');ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,img.width,img.height).data;
  // Pour chaque vertex : projete dans l'espace ecran de la camera actuelle, echantillonne la couleur
  _ensureVertexColors();
  const tmpV=new THREE.Vector3();
  const cvViewer=q('cv');const rect=cvViewer.getBoundingClientRect();
  const aspectImg=img.width/img.height;
  const aspectView=rect.width/rect.height;
  let painted=0;
  mesh.traverse(n=>{
    if(!n.isMesh||!n.geometry)return;
    const g=n.geometry;const pos=g.attributes.position;const col=g.attributes.color;
    if(!col)return;
    const m=n.matrixWorld;
    for(let i=0;i<pos.count;i++){
      tmpV.fromBufferAttribute(pos,i).applyMatrix4(m);
      // Projection sur l'ecran : -1..1
      tmpV.project(camera);
      // Skip si derriere ou hors-cadre
      if(tmpV.z>1||tmpV.x<-1||tmpV.x>1||tmpV.y<-1||tmpV.y>1)continue;
      // Convertir vers coord image
      let u=(tmpV.x+1)/2,v=1-(tmpV.y+1)/2;
      // Ajuste aspect : si image plus large, on rogne en X
      if(aspectImg>aspectView){const r=aspectView/aspectImg;u=0.5+(u-0.5)*r}
      else{const r=aspectImg/aspectView;v=0.5+(v-0.5)*r}
      const px=Math.max(0,Math.min(img.width-1,Math.floor(u*img.width)));
      const py=Math.max(0,Math.min(img.height-1,Math.floor(v*img.height)));
      const idx=(py*img.width+px)*4;
      col.setXYZ(i,data[idx]/255,data[idx+1]/255,data[idx+2]/255);
      painted++;
    }
    col.needsUpdate=true;
  });
  toast('✓ '+painted.toLocaleString('fr')+' vertices colorisés depuis '+file.name,'ok');
  const after=_snapshotColors();
  if(before&&after)pushUndo({label:'Colorisation depuis image',undo:()=>_restoreColors(before),redo:()=>_restoreColors(after)});
}

function _handleColorizeInput(e){
  const f=e?.target?.files?.[0];if(!f)return;
  _doColorizeFromImage(f);
  if(e?.target)e.target.value='';
}

/* ══════════════════════════════════════════════
   LIGHTING PRESETS — 5 ambiances
   ══════════════════════════════════════════════ */
let lightGroup=null;
let currentLighting=localStorage.getItem('form3d_lighting')||'neon';
const LIGHTING_PRESETS={
  neon:{
    name:'Neon (défaut)',
    bg:0x080809,exposure:1.8,
    lights:[
      {type:'hemi',sky:0xb3d4ff,ground:0x1a1a2e,intensity:0.7},
      {type:'dir',color:0xffffff,intensity:2.8,pos:[3,8,5]},
      {type:'dir',color:0x88aaff,intensity:0.9,pos:[-6,-2,-3]},
      {type:'dir',color:0xd4f542,intensity:0.8,pos:[0,3,-8]},
      {type:'dir',color:0xfff8f0,intensity:0.5,pos:[0,-1,6]},
    ],
  },
  studio:{
    name:'Studio',
    bg:0x141418,exposure:1.5,
    lights:[
      {type:'hemi',sky:0xffffff,ground:0x666666,intensity:0.6},
      {type:'dir',color:0xffffff,intensity:3.0,pos:[5,8,5]},
      {type:'dir',color:0xffffff,intensity:1.5,pos:[-5,4,2]},
      {type:'dir',color:0xffffff,intensity:1.0,pos:[0,-3,3]},
    ],
  },
  dramatic:{
    name:'Dramatique',
    bg:0x05050a,exposure:1.4,
    lights:[
      {type:'amb',color:0x202030,intensity:0.3},
      {type:'dir',color:0xffe0c0,intensity:4.0,pos:[6,5,3]},
      {type:'dir',color:0x4060ff,intensity:1.2,pos:[-4,2,-5]},
      {type:'dir',color:0xff4080,intensity:0.8,pos:[0,1,-8]},
    ],
  },
  outdoor:{
    name:'Plein air',
    bg:0xa8c8e8,exposure:1.6,
    lights:[
      {type:'hemi',sky:0x87ceeb,ground:0xb8860b,intensity:1.2},
      {type:'dir',color:0xfff5e0,intensity:3.5,pos:[4,10,4]},
      {type:'dir',color:0x4080ff,intensity:0.5,pos:[-3,3,-3]},
    ],
  },
  showcase:{
    name:'Vitrine',
    bg:0xf5f5f5,exposure:1.2,
    lights:[
      {type:'amb',color:0xffffff,intensity:0.7},
      {type:'dir',color:0xffffff,intensity:2.5,pos:[3,6,4]},
      {type:'dir',color:0xffffff,intensity:1.5,pos:[-3,6,-4]},
      {type:'dir',color:0xffffff,intensity:1.0,pos:[0,-2,5]},
    ],
  },
};

function applyLightingPreset(name){
  if(!lightGroup||!LIGHTING_PRESETS[name])return;
  // Nettoyage
  while(lightGroup.children.length)lightGroup.remove(lightGroup.children[0]);
  const p=LIGHTING_PRESETS[name];
  currentLighting=name;
  if(renderer){renderer.setClearColor(p.bg,1);renderer.toneMappingExposure=p.exposure}
  p.lights.forEach(l=>{
    let light;
    if(l.type==='hemi')light=new THREE.HemisphereLight(l.sky,l.ground,l.intensity);
    else if(l.type==='amb')light=new THREE.AmbientLight(l.color,l.intensity);
    else if(l.type==='dir'){light=new THREE.DirectionalLight(l.color,l.intensity);light.position.set(...l.pos)}
    if(light)lightGroup.add(light);
  });
  localStorage.setItem('form3d_lighting',name);
  // Update UI
  document.querySelectorAll('.light-card').forEach(c=>c.classList.toggle('on',c.dataset.light===name));
}

function toggleLightPanel(){
  const h=q('light-hud');if(!h)return;
  h.classList.toggle('on');
  q('b-light')?.classList.toggle('on',h.classList.contains('on'));
}
function renderLightPanel(){
  const el=q('light-cards');if(!el)return;
  el.innerHTML=Object.entries(LIGHTING_PRESETS).map(([k,p])=>`<div class="light-card${k===currentLighting?' on':''}" data-light="${k}" onclick="setLightingByUser('${k}')">${p.name}</div>`).join('');
}
function setLightingByUser(name){
  const prev=currentLighting;
  if(name===prev)return;
  applyLightingPreset(name);
  pushUndo({label:'Éclairage '+(LIGHTING_PRESETS[name]?.name||name),undo:()=>applyLightingPreset(prev),redo:()=>applyLightingPreset(name)});
}

/* ══════════════════════════════════════════════
   HOLLOWING — estimation + preview
   Note : pour le vrai hollow d'un mesh imprimable, Bambu Studio le fait
   nativement (clic droit modele -> Make hollow). Ici on calcule
   l'economie de filament + on previsualise visuellement.
   ══════════════════════════════════════════════ */
let hollowPreviewMesh=null;
let hollowWallMm=2.0; // 2mm wall par defaut
let hollowDrain=true;

function toggleHollowPanel(){
  const h=q('hollow-hud');if(!h)return;
  h.classList.toggle('on');
  q('b-hollow')?.classList.toggle('on',h.classList.contains('on'));
  if(h.classList.contains('on'))updateHollowPreview();
  else clearHollowPreview();
}

function setHollowWall(v){
  hollowWallMm=v;
  const lbl=q('hollow-wall-val');if(lbl)lbl.textContent=v.toFixed(1)+' mm';
  updateHollowPreview();
}
function setHollowDrain(v){hollowDrain=v;updateHollowPreview()}

function clearHollowPreview(){
  if(hollowPreviewMesh){scene.remove(hollowPreviewMesh);hollowPreviewMesh=null}
}

function updateHollowPreview(){
  if(!mesh){q('hollow-stats').textContent='Aucun modèle';return}
  clearHollowPreview();
  // Stats : calcule volume mesh + volume creux (offset par wall)
  const bbox=new THREE.Box3().setFromObject(mesh);const sz=new THREE.Vector3();bbox.getSize(sz);
  const bsc=mesh.userData?.baseScale||1;
  const dX=Math.max(sz.x/bsc*100*modelScale,0.05);
  const dY=Math.max(sz.y/bsc*100*modelScale,0.05);
  const dZ=Math.max(sz.z/bsc*100*modelScale,0.05);
  // Approximation volume : 35% du bbox pour mesh moyen
  const volBboxCm3=dX*dY*dZ/1000;
  const volMeshCm3=volBboxCm3*0.35;
  // Volume creux : offset uniforme de wall mm sur chaque côté
  const wInner=Math.max(0,dX-2*hollowWallMm);
  const hInner=Math.max(0,dY-2*hollowWallMm);
  const dInner=Math.max(0,dZ-2*hollowWallMm);
  const volInnerCm3=wInner*hInner*dInner/1000*0.35;
  const volSavedCm3=Math.max(0,volMeshCm3-Math.max(0,volMeshCm3-volInnerCm3));
  const realSavedCm3=Math.min(volMeshCm3*0.85,volInnerCm3);
  // Poids economise
  const mat=MATS[currentMat]||MATS.PLA;
  const wSaved=Math.round(realSavedCm3*mat.density);
  const wTotal=Math.round(volMeshCm3*mat.density);
  const pctSaved=wTotal>0?Math.round(realSavedCm3/volMeshCm3*100):0;
  const costSaved=(wSaved/1000*matPrice).toFixed(2);
  // Affichage stats
  q('hollow-stats').innerHTML=
    `<div class="h-stat"><span>Poids initial</span><b>${wTotal} g</b></div>`+
    `<div class="h-stat"><span>Poids creux</span><b>${wTotal-wSaved} g</b></div>`+
    `<div class="h-stat h-save"><span>Économie</span><b>${wSaved} g (${pctSaved}%)</b></div>`+
    `<div class="h-stat h-cost"><span>Coût économisé</span><b>${costSaved} €</b></div>`+
    `<div class="h-stat"><span>Drain hole</span><b>${hollowDrain?'∅ 3 mm dessous':'Désactivé'}</b></div>`;
  // Visualisation : copie du mesh scalé vers l'intérieur (approximation visuelle)
  // Calcule un scale equivalent : (size - 2*wall) / size
  const sxRatio=Math.max(0.01,(dX-2*hollowWallMm)/dX);
  const syRatio=Math.max(0.01,(dY-2*hollowWallMm)/dY);
  const szRatio=Math.max(0.01,(dZ-2*hollowWallMm)/dZ);
  const innerMesh=mesh.clone();
  innerMesh.traverse(n=>{
    if(n.isMesh){
      n.material=new THREE.MeshStandardMaterial({color:0xff4080,transparent:true,opacity:0.3,side:THREE.BackSide,wireframe:false});
    }
  });
  innerMesh.scale.copy(mesh.scale);
  innerMesh.scale.x*=sxRatio;innerMesh.scale.y*=syRatio;innerMesh.scale.z*=szRatio;
  innerMesh.position.copy(mesh.position);
  innerMesh.rotation.copy(mesh.rotation);
  hollowPreviewMesh=innerMesh;scene.add(innerMesh);
}

/* ══════════════════════════════════════════════
   THREE.JS VIEWER
   preserveDrawingBuffer:true → permet la capture canvas pour les thumbs
   ══════════════════════════════════════════════ */
function init3(){
  const cv=q('cv'),wrap=cv.parentElement;const W=wrap.clientWidth,H=wrap.clientHeight||500;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,W/H,0.01,1000);camera.position.set(0,0.5,4);camera.lookAt(0,0,0);
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x080809,1);renderer.outputEncoding=THREE.sRGBEncoding;renderer.physicallyCorrectLights=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.8;
  // Groupe lumières pour pouvoir les remplacer via presets
  lightGroup=new THREE.Group();scene.add(lightGroup);
  applyLightingPreset(currentLighting||'neon');
  const grid=new THREE.GridHelper(10,22,0x1c1c24,0x131318);grid.position.y=-1.2;scene.add(grid);
  cv.addEventListener('mousedown',e=>{
    // En mode mesure : capture le clic gauche au lieu de drag
    if(e.button===0&&measMode&&_handleMeasureClick(e)){e.preventDefault();return}
    // En mode peinture : snapshot AVANT le stroke, drag continu, push undo a mouseup
    if(e.button===0&&paintMode){
      _paintBeforeStroke=_paintModeIsTexture?_snapshotCanvas():_snapshotColors();
      _handlePaintEvent(e,true);
      if(paintBrushMode==='fill'||paintBrushMode==='eyedrop'){
        // Push undo immediat pour fill (pas de drag)
        if(paintBrushMode==='fill'&&_paintBeforeStroke){
          const before=_paintBeforeStroke;
          const after=_paintModeIsTexture?_snapshotCanvas():_snapshotColors();
          _paintBeforeStroke=null;
          if(before&&after){
            const restore=_paintModeIsTexture?_restoreCanvas:_restoreColors;
            pushUndo({label:'Remplissage',undo:()=>restore(before),redo:()=>restore(after)});
          }
        }else{_paintBeforeStroke=null}
        e.preventDefault();return
      }
      drag=true;mbtn=10;lx=e.clientX;ly=e.clientY;e.preventDefault();return
    }
    drag=true;mbtn=e.button;lx=e.clientX;ly=e.clientY;e.preventDefault()
  });
  window.addEventListener('mouseup',()=>{
    // Si on terminait un stroke de peinture, push undo
    if(paintMode&&_paintBeforeStroke&&mbtn===10){
      const before=_paintBeforeStroke;
      const after=_paintModeIsTexture?_snapshotCanvas():_snapshotColors();
      _paintBeforeStroke=null;
      if(before&&after){
        const restore=_paintModeIsTexture?_restoreCanvas:_restoreColors;
        pushUndo({label:'Coup de pinceau',undo:()=>restore(before),redo:()=>restore(after)});
      }
    }else if(_paintBeforeStroke&&mbtn!==10){_paintBeforeStroke=null}
    drag=false;mbtn=-1;
  });
  window.addEventListener('mousemove',e=>{
    if(!drag||!mesh)return;
    if(mbtn===10&&paintMode){_handlePaintEvent(e);return} // brush continu
    const dx=e.clientX-lx,dy=e.clientY-ly;
    if(mbtn===2||e.shiftKey){panX+=dx*.005;panY-=dy*.005;mesh.position.x=panX;mesh.position.y=panY}
    else{ry+=dx*.007;rx+=dy*.007;rx=Math.max(-1.5,Math.min(1.5,rx));mesh.rotation.y=ry;mesh.rotation.x=rx}
    lx=e.clientX;ly=e.clientY
  });
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{dist=Math.max(1.2,Math.min(12,dist+e.deltaY*.008));camera.position.setLength(dist)},{passive:true});
  window.addEventListener('resize',()=>{const W2=wrap.clientWidth,H2=wrap.clientHeight;renderer.setSize(W2,H2);camera.aspect=W2/H2;camera.updateProjectionMatrix()});
  (function anim(){requestAnimationFrame(anim);if(mesh&&!drag&&autoRotate&&!paintMode&&!measMode){mesh.rotation.y+=.003;ry=mesh.rotation.y}renderer.render(scene,camera)})();
}

async function loadM(url){
  if(mesh){scene.remove(mesh);mesh=null}
  const isLocal=url.startsWith('http://localhost')||url.startsWith('http://127.0.0.1')||url.startsWith('blob:');
  try{
    let resp;
    if(isLocal){resp=await fetch(url)}else{resp=await fetch(PROXY+'/model?url='+encodeURIComponent(url));if(!resp.ok)resp=await fetch(url)}
    const buf=await resp.arrayBuffer();const v=new DataView(buf);if(v.getUint32(0,true)===0x46546C67)await loadGLB(buf);else loadSTL(buf)
  }catch(e){console.error('loadM:',e);phMesh()}
}
function loadSTL(buf){try{const v=new DataView(buf),n=v.getUint32(80,true);const pos=new Float32Array(n*9);let off=84,pi=0;for(let i=0;i<n;i++){off+=12;for(let j=0;j<3;j++){pos[pi++]=v.getFloat32(off,true);pos[pi++]=v.getFloat32(off+4,true);pos[pi++]=v.getFloat32(off+8,true);off+=12}off+=2}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.computeVertexNormals();mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xc0c0c8,roughness:.45,metalness:.1}));finM()}catch(e){phMesh()}}
async function loadGLB(buf){
  try{const u8=new Uint8Array(buf),v=new DataView(buf);const jl=v.getUint32(12,true),js=new TextDecoder().decode(u8.slice(20,20+jl));const gltf=JSON.parse(js),bs=20+jl+8;const group=new THREE.Group();const texs={};
  if(gltf.images&&gltf.bufferViews){gltf.images.forEach((img,ii)=>{try{const bv=gltf.bufferViews[img.bufferView];if(!bv)return;const off=bs+(bv.byteOffset||0);const blob=new Blob([u8.slice(off,off+bv.byteLength)],{type:img.mimeType||'image/png'});const tex=new THREE.TextureLoader().load(URL.createObjectURL(blob));tex.flipY=false;tex.encoding=THREE.sRGBEncoding;texs[ii]=tex}catch(e){}})}
  if(gltf.meshes){gltf.meshes.forEach(m=>m.primitives.forEach(p=>{const g=new THREE.BufferGeometry();const lA=(acc,comp)=>{const a=gltf.accessors[acc],bv=gltf.bufferViews[a.bufferView];const off=bs+(bv.byteOffset||0)+(a.byteOffset||0);return new Float32Array(buf,off,a.count*comp).slice()};if(p.attributes.POSITION!==undefined)g.setAttribute('position',new THREE.BufferAttribute(lA(p.attributes.POSITION,3),3));if(p.attributes.NORMAL!==undefined)g.setAttribute('normal',new THREE.BufferAttribute(lA(p.attributes.NORMAL,3),3));if(p.attributes.TEXCOORD_0!==undefined)g.setAttribute('uv',new THREE.BufferAttribute(lA(p.attributes.TEXCOORD_0,2),2));if(p.indices!==undefined){const a=gltf.accessors[p.indices],bv=gltf.bufferViews[a.bufferView];const off=bs+(bv.byteOffset||0)+(a.byteOffset||0);const idx=a.componentType===5123?new Uint16Array(buf,off,a.count):new Uint32Array(buf,off,a.count);g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx),1))}if(!g.attributes.normal)g.computeVertexNormals();let mat=new THREE.MeshStandardMaterial({roughness:.5,metalness:.05,color:0xffffff});if(p.material!==undefined&&gltf.materials){const gm=gltf.materials[p.material];if(gm.pbrMetallicRoughness){const pbr=gm.pbrMetallicRoughness;if(pbr.baseColorTexture){const tidx=pbr.baseColorTexture.index;const src=gltf.textures?.[tidx]?.source;if(src!==undefined&&texs[src]){mat.map=texs[src];mat.map.needsUpdate=true}}if(pbr.baseColorFactor){const c=pbr.baseColorFactor;mat.color.set('#'+[c[0],c[1],c[2]].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join(''))}if(pbr.metallicFactor!==undefined)mat.metalness=pbr.metallicFactor;if(pbr.roughnessFactor!==undefined)mat.roughness=pbr.roughnessFactor}}const mn=new THREE.Mesh(g,mat);mn.userData.om=mat.map;group.add(mn)}))}
  if(!group.children.length){phMesh();return}mesh=group;finM()}catch(e){phMesh()}
}
function finM(){const box=new THREE.Box3().setFromObject(mesh);const sz=new THREE.Vector3();box.getSize(sz);const sc=2.2/Math.max(sz.x,sz.y,sz.z);const center=new THREE.Vector3();box.getCenter(center);mesh.position.sub(center.multiplyScalar(sc));mesh.scale.setScalar(sc);mesh.userData.baseScale=sc;scene.add(mesh);rx=ry=panX=panY=0;modelScale=1;const sw=q('scale-wrap');if(sw)sw.style.display='flex';const sl=q('scale-sl');if(sl)sl.value=100;const ll=q('scale-lbl');if(ll)ll.textContent='100%';
  // Reset undo stack + cache d'adjacence + socle au chargement d'un nouveau mesh
  undoStack.length=0;redoStack.length=0;updateUndoUI();
  _faceAdjCache=null;_faceAdjCacheMesh=null;
  removeBase();
  updateHeightInput();
  // Active toujours les exports locaux dès qu'un mesh est chargé (peu importe le backend)
  q('ex-stl-local')?.classList.remove('dis');
  q('ex-obj-local')?.classList.remove('dis');
  // Active les outils viewer (orient / measure / section / light / hollow)
  q('b-orient')?.removeAttribute('disabled');
  q('b-measure')?.removeAttribute('disabled');
  q('b-section')?.removeAttribute('disabled');
  q('b-light')?.removeAttribute('disabled');
  q('b-hollow')?.removeAttribute('disabled');
  q('b-paint')?.removeAttribute('disabled');
  q('b-colorize')?.removeAttribute('disabled');
  q('b-base')?.removeAttribute('disabled');
}
function phMesh(){mesh=new THREE.Mesh(new THREE.TorusKnotGeometry(.55,.18,256,32),new THREE.MeshStandardMaterial({color:0xc8e83a,roughness:.1,metalness:.7}));scene.add(mesh)}

/* ── MOBILE NAV ── */
function mobTab(tab){
  const isMob=window.innerWidth<=768;
  if(!isMob)return;
  ['config','viewer','infos'].forEach(t=>{
    q('mnav-'+t).classList.toggle('on',t===tab);
  });
  document.querySelector('.L').classList.toggle('mob-on',tab==='config');
  document.querySelector('.C').classList.toggle('mob-on',tab==='viewer');
  document.querySelector('.R').classList.toggle('mob-on',tab==='infos');
  if(tab==='viewer'&&renderer){setTimeout(()=>{const c=q('cv');const p=c.parentElement;renderer.setSize(p.clientWidth,p.clientHeight);camera.aspect=p.clientWidth/p.clientHeight;camera.updateProjectionMatrix()},50)}
}
/* Tracking : seul un VRAI changement de breakpoint déclenche un reset
   (sinon le scroll mobile shrink la barre URL -> resize -> reset au tab Config) */
let _wasMobile=null;
function initMob(force){
  const isMob=window.innerWidth<=768;
  if(!force&&_wasMobile===isMob)return; // déjà dans le bon mode, on ignore
  _wasMobile=isMob;
  if(isMob){
    document.querySelector('.L').classList.add('mob-on');
    document.querySelector('.C').classList.remove('mob-on');
    document.querySelector('.R').classList.remove('mob-on');
    ['config','viewer','infos'].forEach(t=>{const el=q('mnav-'+t);if(el)el.classList.toggle('on',t==='config')});
  }else{
    document.querySelector('.L').classList.remove('mob-on');
    document.querySelector('.C').classList.remove('mob-on');
    document.querySelector('.R').classList.remove('mob-on');
  }
}
window.addEventListener('resize',()=>initMob(false));

/* ── TOUCH EVENTS 3D VIEWER ── */
function initTouch(){
  const cv2=q('cv');
  let t0=null,t1=null,initDist=0;
  cv2.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(e.touches.length===1){drag=true;mbtn=0;lx=e.touches[0].clientX;ly=e.touches[0].clientY;t1=null}
    else if(e.touches.length===2){t0=e.touches[0];t1=e.touches[1];drag=false;initDist=Math.hypot(t1.clientX-t0.clientX,t1.clientY-t0.clientY)}
  },{passive:false});
  cv2.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&drag&&mesh){
      const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;
      ry+=dx*.007;rx+=dy*.007;rx=Math.max(-1.5,Math.min(1.5,rx));
      mesh.rotation.y=ry;mesh.rotation.x=rx;
      lx=e.touches[0].clientX;ly=e.touches[0].clientY;
    }else if(e.touches.length===2){
      const d=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);
      const delta=initDist-d;dist=Math.max(1.2,Math.min(12,dist+delta*.015));
      camera.position.setLength(dist);initDist=d;
    }
  },{passive:false});
  cv2.addEventListener('touchend',e=>{drag=false;t0=null;t1=null});
}

/* ══════════════════════════════════════════════
   TRELLIS LOCAL BACKEND  — API REST FastAPI
   POST /generate_no_preview → GET /status (polling) → GET /download/model
   ══════════════════════════════════════════════ */
function setBackend(b){
  backend=b;
  document.body.classList.toggle('trellis-mode',b==='trellis');
  q('bk-tripo').classList.toggle('on',b==='tripo');
  q('bk-trellis').classList.toggle('on',b==='trellis');
  // TRELLIS ne supporte que Image / Hybrid (necessite une image source)
  // On désactive Texte et Multi-view, et on auto-switch si on était dessus
  const incompat=['text','multiview'];
  document.querySelectorAll('.tab').forEach(t=>{
    const m=t.dataset.m;
    const disabled=b==='trellis'&&incompat.includes(m);
    t.classList.toggle('tab-disabled',disabled);
    if(disabled){t.setAttribute('aria-disabled','true');t.setAttribute('title','TRELLIS nécessite une image — utilise Image ou Hybride')}
    else{t.removeAttribute('aria-disabled');t.removeAttribute('title')}
  });
  if(b==='trellis'&&incompat.includes(mode)){
    setMode('image');
    toast('TRELLIS nécessite une image → mode Image activé');
  }
  const trOpts=q('tr-opts');if(trOpts)trOpts.classList.toggle('on',b==='trellis');
  const crdChip=q('crd-chip');if(crdChip)crdChip.style.display=b==='tripo'?'':'none';
  const gbtn=q('gbtn');if(gbtn)gbtn.innerHTML=b==='trellis'?
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Générer (TRELLIS)':
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Générer';
  if(b==='trellis'){['stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.add('dis'))}
  else if(mUrls.glb){['stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.remove('dis'))}
  const eb=q('ex-bambu');if(eb)eb.classList.toggle('dis',!mUrls.glb);
  if(b==='trellis'){checkTrellis();updateCost()}else updateCost();
}

async function checkTrellis(){
  const dot=q('bk-dot');if(dot)dot.className='bk-dot';
  try{
    const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),4000);
    const r=await fetch(TRELLIS_URL+'/',{signal:ctrl.signal});
    const d=await r.json();
    trellisOk=d.status==='ready'||r.ok;
    if(dot)dot.className='bk-dot'+(trellisOk?' ok':' err');
  }catch(e){trellisOk=false;if(dot)dot.className='bk-dot err'}
}

function setTrRes(r,el){trellisRes=r;document.querySelectorAll('.tr-res-card').forEach(c=>c.classList.remove('on'));el.classList.add('on')}
function setTrTexSize(v,el){trellisTexSize=v;document.querySelectorAll('.tr-tex-card').forEach(c=>c.classList.remove('on'));el.classList.add('on')}
function setTrFaceLimit(v){trellisFaceLimit=v;const lbl=q('tr-face-val');if(lbl)lbl.textContent=(v<10?v+'k':v+'k')}
function setTrGuidance(v){trellisGuidance=v;const lbl=q('tr-guid-val');if(lbl)lbl.textContent=v.toFixed(1);const sl=q('tr-guid-sl');if(sl)sl.value=Math.round(v*10)}

/* Presets TRELLIS — applique tous les paramètres en 1 clic */
function applyTrPreset(p){
  const presets={
    fast:    {res:512, ss:12, slat:12, face:30,  tex:1024, guid:7.0},
    balanced:{res:1024,ss:20, slat:20, face:50,  tex:2048, guid:7.5},
    max:     {res:1536,ss:50, slat:50, face:100, tex:4096, guid:9.5},
  };
  const c=presets[p];if(!c)return;
  // Résolution
  trellisRes=c.res;
  document.querySelectorAll('.tr-res-card').forEach(el=>{
    const onclick=el.getAttribute('onclick')||'';
    el.classList.toggle('on',onclick.includes('setTrRes('+c.res+','));
  });
  // Steps
  trellisSsSteps=c.ss;trellisSlatSteps=c.slat;
  if(q('tr-ss-sl')){q('tr-ss-sl').value=c.ss;q('tr-ss-val').textContent=c.ss}
  if(q('tr-slat-sl')){q('tr-slat-sl').value=c.slat;q('tr-slat-val').textContent=c.slat}
  // Face limit
  trellisFaceLimit=c.face;
  if(q('tr-face-sl')){q('tr-face-sl').value=c.face;setTrFaceLimit(c.face)}
  // Texture size
  trellisTexSize=c.tex;
  document.querySelectorAll('.tr-tex-card').forEach(el=>{
    const onclick=el.getAttribute('onclick')||'';
    el.classList.toggle('on',onclick.includes('setTrTexSize('+c.tex+','));
  });
  // Guidance
  setTrGuidance(c.guid);
  // Mise à jour du bouton actif
  document.querySelectorAll('.tr-preset').forEach(b=>b.classList.remove('on'));
  const btn=Array.from(document.querySelectorAll('.tr-preset')).find(b=>(b.getAttribute('onclick')||'').includes("'"+p+"'"));
  if(btn)btn.classList.add('on');
  toast('Preset '+(p==='max'?'Qualité Max':p==='fast'?'Rapide':'Équilibré')+' appliqué','ok');
}

/* Preset Tripo "Visages humains" : HD + Multi-view */
function applyFacePreset(){
  // Bascule sur Tripo si on était en TRELLIS
  if(backend==='trellis')setBackend('tripo');
  // Force qualité HD
  document.querySelectorAll('.q-card').forEach(c=>c.classList.remove('on'));
  const hdCard=Array.from(document.querySelectorAll('.q-card')).find(c=>(c.getAttribute('onclick')||'').includes("'hd'"));
  if(hdCard){hdCard.classList.add('on');quality='hd'}
  // Bascule sur le mode Multi-view
  setMode('multiview');
  updateCost();
  toast('👤 Preset Visages : Tripo HD + Multi-view (clique Raffiner HD après gen)','ok');
}

async function retryTrellis(){
  q('tr-offline')?.classList.remove('on');
  q('emp').style.display='flex';q('cv').style.display='none';
  await checkTrellis();
  if(trellisOk)toast('✓ TRELLIS connecté !','ok');
  else{q('tr-offline')?.classList.add('on');q('emp').style.display='none'}
}

function openBambu(){
  if(!mUrls.glb){toast('Génère d\'abord un modèle',true);return}
  // Try local file path for TRELLIS, URL for Tripo
  const target=mUrls._trellisBlobUrl||mUrls.glb;
  window.location.href='bambu-studio://open?file='+encodeURIComponent(target);
  setTimeout(()=>toast('Si Bambu Studio ne s\'ouvre pas, télécharge d\'abord le GLB'),2000);
}

async function generateTrellis(){
  const imgArr=mode==='image'?imgs[1]:mode==='hybrid'?imgs[3]:imgs[1];
  if(mode==='text'){toast('TRELLIS ne supporte que le mode Image',true);return}
  if(!imgArr.length){toast('Upload une image d\'abord',true);return}
  if(!scene)init3();
  if(trellisPoll){clearInterval(trellisPoll);trellisPoll=null}
  clrP();setG(true);
  q('tr-offline')?.classList.remove('on');
  q('cv').style.display='block';q('emp').style.display='none';q('pp-bar')?.classList.remove('on');
  if(mesh){scene.remove(mesh);mesh=null}
  document.querySelectorAll('.pp-btn').forEach(b=>b.classList.remove('pp-done','pp-loading'));
  genStartTime=Date.now();
  mUrls={};origUrl=null;origThumb=null;compareMode=false;
  q('cmp-overlay')?.classList.remove('on');q('bcmp').disabled=true;
  setPg(0,'Connexion TRELLIS…','127.0.0.1:7960');
  try{
    // 1. Ping GET /
    const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),5000);
    let pingOk=false;
    try{
      const pr=await fetch(TRELLIS_URL+'/',{signal:ctrl.signal});
      const pd=await pr.json();
      pingOk=pd.status==='ready'||pr.ok;
    }catch(e){}
    if(!pingOk)throw new Error('TRELLIS_OFFLINE');
    if(q('bk-dot'))q('bk-dot').className='bk-dot ok';trellisOk=true;
    // 2. Build multipart form — POST /generate_no_preview (appel bloquant)
    setPg(10,'Envoi image…','TRELLIS API');
    const img=imgArr[0];
    const blob=await(await fetch(`data:${img.type||'image/jpeg'};base64,${img.b64}`)).blob();
    const fd=new FormData();
    fd.append('file',blob,img.name||'image.jpg');
    fd.append('seed',String(parseInt(q('tr-seed')?.value)||Math.floor(Math.random()*65535)));
    fd.append('guidance_scale',String(trellisGuidance));
    fd.append('num_inference_steps',String(Math.round((trellisSsSteps+trellisSlatSteps)/2)));
    fd.append('ss_sampling_steps',String(trellisSsSteps));
    fd.append('slat_sampling_steps',String(trellisSlatSteps));
    fd.append('resolution',String(trellisRes));          // int : 512 | 1024 | 1536
    fd.append('mesh_simplify',String(trellisFaceLimit)); // int 5-100 (×1000 → faces)
    fd.append('remesh',q('tr-remesh')?.checked?'true':'false');
    fd.append('watertight',q('tr-watertight')?.checked?'true':'false');
    fd.append('background_removal',q('tr-rembg')?.checked?'true':'false');
    fd.append('apply_texture',q('tr-texture')?.checked?'true':'false');
    fd.append('texture_size',String(trellisTexSize));    // int : 512/1024/2048/4096
    fd.append('tex_rescale_t','3.0');
    fd.append('tex_guidance_strength','1.0');
    fd.append('output_format','glb');
    // Animation de progression pendant le POST bloquant
    // Estimation : résolution² × steps × facteur → ms
    const _estMs=Math.max(20000,Math.round((trellisRes/512)**2*(trellisSsSteps+trellisSlatSteps)*650));
    const _phases=[
      {from:10,to:18,label:'Envoi image…',sub:'TRELLIS API'},
      {from:18,to:22,label:'Suppression du fond…',sub:'background removal'},
      {from:22,to:58,label:'Structure sparse 3D…',sub:'sparse · '+trellisSsSteps+' steps'},
      {from:58,to:85,label:'Surface SLAT…',sub:'slat · '+trellisSlatSteps+' steps'},
      {from:85,to:90,label:'Remesh & watertight…',sub:'mesh final · '+trellisRes+'³'},
    ];
    let _animPct=10,_animTick=0;
    const _animTotal=_estMs/200;
    const _animIntvl=setInterval(()=>{
      _animTick++;
      const raw=10+Math.min(80,(_animTick/_animTotal)*80);
      const ph=_phases.find(p=>raw>=p.from&&raw<p.to)||_phases[_phases.length-1];
      if(raw>_animPct){_animPct=raw;setPg(Math.round(raw),ph.label,ph.sub);}
    },200);
    trellisAbortCtrl=new AbortController();
    let genR;
    try{genR=await fetch(TRELLIS_URL+'/generate_no_preview',{method:'POST',body:fd,signal:trellisAbortCtrl.signal});}
    finally{clearInterval(_animIntvl);trellisAbortCtrl=null;}
    if(!genR)return; // annulé via stopTrellis()
    if(!genR.ok){const t=await genR.text();throw new Error('Génération refusée ('+genR.status+'): '+t.slice(0,60))}
    const genD=await genR.json();
    if(genD.status==='FAILED')throw new Error(genD.message||'Erreur génération');
    // Si le POST était bloquant et la génération déjà terminée → on saute le polling
    if(genD.status==='COMPLETE'||genD.status==='PREVIEW_READY'){
      setPg(92,'Modèle prêt, téléchargement…','TRELLIS');
    } else {
      setPg(90,'Finalisation…','TRELLIS · '+trellisRes+'³');
    }
    // 3. Poll GET /status uniquement si la génération n'est pas encore terminée
    if(genD.status!=='COMPLETE'&&genD.status!=='PREVIEW_READY'){
      await new Promise((resolve,reject)=>{
        trellisPoll=setInterval(async()=>{
          try{
            const sr=await fetch(TRELLIS_URL+'/status');
            const sd=await sr.json();
            const pct=Math.max(90,Math.min(92,90+(sd.progress||0)*0.02));
            const lbl=sd.message||'Génération 3D…';
            setPg(Math.round(pct),lbl,'TRELLIS · '+trellisRes+'³');
            if(sd.status==='COMPLETE'||sd.status==='PREVIEW_READY'){
              clearInterval(trellisPoll);trellisPoll=null;resolve();
            }else if(sd.status==='FAILED'){
              clearInterval(trellisPoll);trellisPoll=null;
              reject(new Error(sd.message||'TRELLIS a échoué'));
            }
          }catch(e){clearInterval(trellisPoll);trellisPoll=null;reject(e)}
        },2000);
        setTimeout(()=>{if(trellisPoll){clearInterval(trellisPoll);trellisPoll=null;reject(new Error('Timeout (>10 min)'))}},600000);
      });
    }
    // 4. Download GLB from GET /download/model
    setPg(93,'Téléchargement modèle…','TRELLIS');
    const dlR=await fetch(TRELLIS_URL+'/download/model');
    if(!dlR.ok)throw new Error('Téléchargement GLB échoué ('+dlR.status+')');
    const glbBuf=await dlR.arrayBuffer();
    // Create a blob URL for export/Bambu
    const glbBlob=new Blob([glbBuf],{type:'model/gltf-binary'});
    const blobUrl=URL.createObjectURL(glbBlob);
    const trlId='trl_'+Date.now();
    mUrls={glb:blobUrl,_taskId:trlId,_trellis:true,_trellisBlobUrl:blobUrl};origUrl=blobUrl;
    // 5. Load into Three.js viewer
    if(mesh){scene.remove(mesh);mesh=null}
    const dv=new DataView(glbBuf);
    if(dv.getUint32(0,true)===0x46546C67)await loadGLB(glbBuf);else loadSTL(glbBuf);
    setPg(100,'Modèle prêt ✓','TRELLIS');setG(false);fireSuccessFX();setTimeout(hidP,1500);
    // 6. Update UI
    q('ex-glb')?.classList.remove('dis');
    q('ex-bambu')?.classList.remove('dis');
    ['stl','3mf','fbx','obj'].forEach(f=>q('ex-'+f)?.classList.add('dis'));
    q('br').disabled=false;q('bw').disabled=false;q('bc').disabled=false;
    q('hb').classList.add('on');
    setStage('Prêt · TRELLIS',true);
    const p2=img.name||'Image TRELLIS';
    addH({id:trlId,prompt:p2,mode,status:'done',quality:'trellis',glb:blobUrl});
    // Persist GLB binaire en IDB + capture thumbnail depuis le canvas
    await idbPut(trlId,glbBuf);
    setTimeout(()=>{const th=captureCanvasThumb();updH(trlId,'done',th||null,blobUrl,true)},800);
    stats.gens++;stats.totalMs+=Date.now()-genStartTime;saveStats();updateStats();
    setTimeout(()=>{showSpecs(hist[0]);showFils()},500);
  }catch(e){
    if(trellisPoll){clearInterval(trellisPoll);trellisPoll=null}
    if(e.name==='AbortError')return; // annulé proprement par stopTrellis()
    setG(false);hidP();
    const sb=q('stop-btn');if(sb)sb.classList.remove('on');
    const offline=e.message==='TRELLIS_OFFLINE'||e.message.includes('Failed to fetch')||e.message.includes('NetworkError')||e.message.includes('net::');
    if(offline){
      q('cv').style.display='none';q('emp').style.display='none';
      q('tr-offline')?.classList.add('on');
      trellisOk=false;const dot=q('bk-dot');if(dot)dot.className='bk-dot err';
    }else{toast('TRELLIS : '+e.message.slice(0,70),true)}
  }
}

window.addEventListener('load',()=>{
  init3();
  initTouch();
  initMob(true);
  initGlobalDrop();
  initMatGrid();
  renderLightPanel();
  renderPaintHistory();
  renderEnhancerStyles();
  initShortcuts();
  initAutosave();
  initResizers();
  updateUndoUI();
  initLeftTabs();
  // Restore auto-rotate state
  const arSaved=localStorage.getItem('form3d_autorotate');
  if(arSaved!==null)autoRotate=arSaved==='1';
  q('b-rotate')?.classList.toggle('on',autoRotate);
  // First-run tour si jamais lance
  if(!localStorage.getItem('form3d_tour_done')&&!localStorage.getItem(HIST_KEY)){
    setTimeout(()=>q('cmd-input')&&toast('💡 Astuce : Ctrl+K pour la palette de commandes'),2000);
  }
  // Restore profil imprimante
  const savedPrinter=localStorage.getItem('form3d_printer');
  if(savedPrinter&&PRINTERS[savedPrinter])selectedPrinter=savedPrinter;
  const p=PRINTERS[selectedPrinter]||PRINTERS['X2D'];
  if(!p.nozzles.includes(nozzleSize))nozzleSize=p.nozzleDef;
  renderPrinterGrid();renderNozzleOpts();
  loadStats();updateStats();
  setInterval(updateStats,10000);
  const saved=localStorage.getItem('form3d_key');if(saved){q('akey').value=saved;ckK()}
  loadHist();updateCost();
});
