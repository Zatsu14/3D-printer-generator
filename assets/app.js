/* ══════════════════════════════════════════════
   FORM — AI 3D Generator · App principal
   ══════════════════════════════════════════════ */
const q=id=>document.getElementById(id);
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
function setMode(m){mode=m;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.m===m));['text','image','multiview','hybrid'].forEach(p=>{const el=q('pane-'+p);if(el)el.classList.toggle('on',p===m)});updateCost()}
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
        setPg(100,'Modèle prêt ✓','TRIPO v3.1');setG(false);
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
        const lbl=pct<20?'Analyse…':pct<50?'Construction mesh…':pct<80?'Textures PBR…':'Finalisation…';
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
  if(!hist.length){el.innerHTML='<div class="he">Aucune génération<br>Tes créations apparaîtront ici</div>';return}
  el.innerHTML=hist.map((h,i)=>`<div class="hi ${i===histSelIdx?'on':i===0&&histSelIdx<0?'on':''}" onclick="selH(${i})"><div class="hiT">${h.thumb?`<img src="${h.thumb}"/>`:'⬡'}</div><div style="flex:1;min-width:0"><div class="hip">${(h.prompt||'').slice(0,22)}${(h.prompt||'').length>22?'…':''}</div><div class="him">${h.mode}·${h.quality||'hd'}·${h.date?new Date(h.date).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}</div></div><div class="hid d${h.status==='done'?'ok':h.status==='error'?'er':'ld'}"></div></div>`).join('')
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

  q('specs-content').innerHTML='<div style="padding:10px 12px">'+warns+
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
    '</div>';
  q('copy-specs-btn').disabled=false;setRTab('specs');
}
function sR(ico,label,val){return`<div class="spec-row"><span class="spec-ico">${ico}</span><div><div class="spec-label">${label}</div><div class="spec-val">${val}</div></div></div>`}
function secH(t){return`<div class="spec-section-h">${t}</div>`}
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
  const cols=inferCols();const mat=MATS[currentMat]||MATS.PLA;const bg=20;
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

function setScale(v){
  modelScale=v/100;
  if(mesh&&mesh.userData.baseScale)mesh.scale.setScalar(mesh.userData.baseScale*modelScale);
  q('scale-lbl').textContent=v+'%';
  if(hist.length)showSpecs(hist[0]);
}

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
   THREE.JS VIEWER
   preserveDrawingBuffer:true → permet la capture canvas pour les thumbs
   ══════════════════════════════════════════════ */
function init3(){
  const cv=q('cv'),wrap=cv.parentElement;const W=wrap.clientWidth,H=wrap.clientHeight||500;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,W/H,0.01,1000);camera.position.set(0,0.5,4);camera.lookAt(0,0,0);
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x080809,1);renderer.outputEncoding=THREE.sRGBEncoding;renderer.physicallyCorrectLights=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.8;
  scene.add(new THREE.HemisphereLight(0xb3d4ff,0x1a1a2e,0.7));
  const k=new THREE.DirectionalLight(0xffffff,2.8);k.position.set(3,8,5);scene.add(k);
  const f=new THREE.DirectionalLight(0x88aaff,0.9);f.position.set(-6,-2,-3);scene.add(f);
  const rim=new THREE.DirectionalLight(0xd4f542,0.8);rim.position.set(0,3,-8);scene.add(rim);
  const front=new THREE.DirectionalLight(0xfff8f0,0.5);front.position.set(0,-1,6);scene.add(front);
  const grid=new THREE.GridHelper(10,22,0x1c1c24,0x131318);grid.position.y=-1.2;scene.add(grid);
  cv.addEventListener('mousedown',e=>{drag=true;mbtn=e.button;lx=e.clientX;ly=e.clientY;e.preventDefault()});
  window.addEventListener('mouseup',()=>{drag=false;mbtn=-1});
  window.addEventListener('mousemove',e=>{if(!drag||!mesh)return;const dx=e.clientX-lx,dy=e.clientY-ly;if(mbtn===2||e.shiftKey){panX+=dx*.005;panY-=dy*.005;mesh.position.x=panX;mesh.position.y=panY}else{ry+=dx*.007;rx+=dy*.007;rx=Math.max(-1.5,Math.min(1.5,rx));mesh.rotation.y=ry;mesh.rotation.x=rx}lx=e.clientX;ly=e.clientY});
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{dist=Math.max(1.2,Math.min(12,dist+e.deltaY*.008));camera.position.setLength(dist)},{passive:true});
  window.addEventListener('resize',()=>{const W2=wrap.clientWidth,H2=wrap.clientHeight;renderer.setSize(W2,H2);camera.aspect=W2/H2;camera.updateProjectionMatrix()});
  (function anim(){requestAnimationFrame(anim);if(mesh&&!drag){mesh.rotation.y+=.003;ry=mesh.rotation.y}renderer.render(scene,camera)})();
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
function finM(){const box=new THREE.Box3().setFromObject(mesh);const sz=new THREE.Vector3();box.getSize(sz);const sc=2.2/Math.max(sz.x,sz.y,sz.z);const center=new THREE.Vector3();box.getCenter(center);mesh.position.sub(center.multiplyScalar(sc));mesh.scale.setScalar(sc);mesh.userData.baseScale=sc;scene.add(mesh);rx=ry=panX=panY=0;modelScale=1;const sw=q('scale-wrap');if(sw)sw.style.display='flex';const sl=q('scale-sl');if(sl)sl.value=100;const ll=q('scale-lbl');if(ll)ll.textContent='100%'}
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
function initMob(){
  if(window.innerWidth<=768){
    document.querySelector('.L').classList.add('mob-on');
    document.querySelector('.C').classList.remove('mob-on');
    document.querySelector('.R').classList.remove('mob-on');
  }else{
    document.querySelector('.L').classList.remove('mob-on');
    document.querySelector('.C').classList.remove('mob-on');
    document.querySelector('.R').classList.remove('mob-on');
  }
}
window.addEventListener('resize',initMob);

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
    setPg(100,'Modèle prêt ✓','TRELLIS');setG(false);setTimeout(hidP,1500);
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
  initMob();
  initMatGrid();
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
