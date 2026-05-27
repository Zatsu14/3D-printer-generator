/* ══════════════════════════════════════════════
   PRO MAX UI v2 PR-A — Modernité
   ══════════════════════════════════════════════ */

/* ── THEME CROSSFADE ── */
(function(){
  if(typeof setTheme!=='function')return;
  const orig=window.setTheme;
  window.setTheme=function(name){
    let fade=document.querySelector('.theme-fade');
    if(!fade){fade=document.createElement('div');fade.className='theme-fade';document.body.appendChild(fade)}
    fade.classList.add('on');
    setTimeout(()=>{orig(name)},150);
    setTimeout(()=>fade.classList.remove('on'),500);
  };
})();

/* ══════════════════════════════════════════════
   HISTORY : Toggle Liste/Grille + Chips + Pin
   ══════════════════════════════════════════════ */
let _histView=localStorage.getItem('form3d_hist_view')||'list';
let _histChipFilters=new Set();

function setHistView(v){
  _histView=v;
  const el=document.getElementById('hist');if(el)el.dataset.view=v;
  document.querySelectorAll('.vt-btn').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  localStorage.setItem('form3d_hist_view',v);
  // Re-render pour ajuster
  if(typeof rH==='function')rH();
}

function toggleChipFilter(name){
  if(_histChipFilters.has(name))_histChipFilters.delete(name);
  else _histChipFilters.add(name);
  document.querySelectorAll('.chip-filt').forEach(c=>c.classList.toggle('on',_histChipFilters.has(c.dataset.filt)));
  if(typeof rH==='function')rH();
}
function clearChipFilters(){
  _histChipFilters.clear();
  document.querySelectorAll('.chip-filt').forEach(c=>c.classList.remove('on'));
  if(typeof rH==='function')rH();
}

function togglePin(idx,evt){
  evt?.stopPropagation();
  if(!window.hist||!hist[idx])return;
  hist[idx].pinned=!hist[idx].pinned;
  if(typeof saveHist==='function')saveHist();
  if(typeof rH==='function')rH();
}

/* Hook sur rH pour ajouter les filtres chips et le tri pinned + vue grille */
(function(){
  if(typeof rH!=='function')return;
  const origRH=window.rH;
  window.rH=function(){
    // Sort : pinned en haut
    if(window.hist&&Array.isArray(window.hist)){
      window.hist.sort((a,b)=>{
        if(a.pinned&&!b.pinned)return -1;
        if(!a.pinned&&b.pinned)return 1;
        return 0;
      });
    }
    // Filtre supplementaire par chips
    let savedFilter=window.histFilter||'';
    if(_histChipFilters.size>0){
      // Hack : on filtre le hist temporairement
      const origHist=window.hist;
      window.hist=origHist.filter(h=>{
        for(const f of _histChipFilters){
          if(['text','image','multiview','hybrid','import'].includes(f)&&h.mode===f)return true;
          if(f==='turbo'&&h.quality==='turbo')return true;
          if(f==='hd'&&h.quality==='hd')return true;
          if(f==='trellis'&&h.quality==='trellis')return true;
          if(f==='pinned'&&h.pinned)return true;
        }
        return false;
      });
      try{origRH()}finally{window.hist=origHist}
    }else{
      origRH();
    }
    // Applique data-view
    const el=document.getElementById('hist');if(el){el.dataset.view=_histView}
    // Injecte les boutons pin sur chaque item
    document.querySelectorAll('.hi').forEach((it,i)=>{
      if(it.querySelector('.hi-pin'))return;
      const realIdx=Array.from(it.parentElement.children).indexOf(it);
      const idx=(window.hist||[]).findIndex(h=>{
        const txt=it.querySelector('.hip')?.textContent||'';
        return h.prompt?.startsWith(txt.replace(/…$/,''));
      });
      const pinned=idx>=0&&hist[idx]?.pinned;
      const pin=document.createElement('button');
      pin.className='hi-pin'+(pinned?' on':'');
      pin.title='Épingler';
      pin.innerHTML='⭐';
      pin.onclick=(e)=>togglePin(idx,e);
      it.appendChild(pin);
    });
  };
})();

/* Ajoute la toolbar historique : search + view toggle + chips */
function injectHistToolbar(){
  const pane=document.getElementById('rpane-hist');if(!pane)return;
  // Remplace .hist-search existant
  const oldSearch=pane.querySelector('.hist-search');
  if(oldSearch&&!oldSearch.classList.contains('hist-search-new'))oldSearch.remove();
  if(pane.querySelector('.hist-toolbar'))return;
  const tb=document.createElement('div');tb.className='hist-toolbar';
  tb.innerHTML=`
    <div class="hist-tools-row">
      <div class="hist-search hist-search-new" style="display:flex">
        <input type="text" placeholder="🔍 Filtrer…" oninput="if(typeof setHistFilter==='function')setHistFilter(this.value)" aria-label="Rechercher dans l'historique">
      </div>
      <div class="view-toggle">
        <button class="vt-btn ${_histView==='list'?'on':''}" data-view="list" onclick="setHistView('list')" title="Vue liste" aria-label="Vue liste">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="vt-btn ${_histView==='grid'?'on':''}" data-view="grid" onclick="setHistView('grid')" title="Vue grille" aria-label="Vue grille">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </button>
      </div>
    </div>
    <div class="hist-chips">
      <button class="chip-filt" data-filt="pinned" onclick="toggleChipFilter('pinned')">⭐ Épinglés</button>
      <button class="chip-filt" data-filt="hd" onclick="toggleChipFilter('hd')">★ HD</button>
      <button class="chip-filt" data-filt="trellis" onclick="toggleChipFilter('trellis')">🟣 TRELLIS</button>
      <button class="chip-filt" data-filt="text" onclick="toggleChipFilter('text')">📝 Texte</button>
      <button class="chip-filt" data-filt="image" onclick="toggleChipFilter('image')">🖼 Image</button>
      <button class="chip-filt" data-filt="import" onclick="toggleChipFilter('import')">📥 Import</button>
      <button class="chip-clear" onclick="clearChipFilters()">Reset</button>
    </div>
  `;
  pane.insertBefore(tb,pane.firstChild);
}

/* ══════════════════════════════════════════════
   MINI-MAP ORIENTATION XYZ (gizmo)
   ══════════════════════════════════════════════ */
let _gizmoScene,_gizmoCam,_gizmoRenderer,_gizmoMesh;
function initGizmo(){
  const vw=document.querySelector('.vw');if(!vw)return;
  if(document.getElementById('gizmo-mini'))return;
  if(typeof THREE==='undefined')return;
  const wrap=document.createElement('div');wrap.id='gizmo-mini';wrap.className='gizmo-mini';
  wrap.title='Clic = reset vue · Drag = pivoter';
  wrap.innerHTML='<canvas></canvas><div class="gizmo-mini-actions"><span>RESET</span></div>';
  vw.appendChild(wrap);
  const cv=wrap.querySelector('canvas');
  // Scene gizmo
  _gizmoScene=new THREE.Scene();
  _gizmoCam=new THREE.PerspectiveCamera(50,1,0.1,10);
  _gizmoCam.position.set(0,0,3);
  _gizmoRenderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  _gizmoRenderer.setSize(72,72);_gizmoRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  _gizmoRenderer.setClearColor(0x000000,0);
  // Axes : 3 cylindres + petits cubes au bout
  const axesGroup=new THREE.Group();
  const axes=[
    {color:0xff4f4f,dir:[1,0,0],label:'X'},
    {color:0x9eff3a,dir:[0,1,0],label:'Y'},
    {color:0x4fc3f7,dir:[0,0,1],label:'Z'},
  ];
  axes.forEach(a=>{
    const cyl=new THREE.CylinderGeometry(0.045,0.045,0.85,12);
    const mat=new THREE.MeshBasicMaterial({color:a.color});
    const m=new THREE.Mesh(cyl,mat);
    // align cylinder a l'axe
    if(a.dir[0]){m.rotation.z=-Math.PI/2;m.position.x=0.425}
    else if(a.dir[1]){m.position.y=0.425}
    else{m.rotation.x=Math.PI/2;m.position.z=0.425}
    axesGroup.add(m);
    // boule au bout
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.13,16,16),mat);
    ball.position.set(a.dir[0]*0.95,a.dir[1]*0.95,a.dir[2]*0.95);
    axesGroup.add(ball);
  });
  _gizmoMesh=axesGroup;
  _gizmoScene.add(axesGroup);
  // Sync rotation avec la camera principale
  function animGizmo(){
    requestAnimationFrame(animGizmo);
    if(window.camera&&window.mesh){
      // Inverser la rotation : si camera tourne, le gizmo tourne dans l'autre sens
      axesGroup.rotation.x=window.mesh.rotation.x;
      axesGroup.rotation.y=window.mesh.rotation.y;
    }
    _gizmoRenderer.render(_gizmoScene,_gizmoCam);
  }
  animGizmo();
  // Click reset cam
  wrap.addEventListener('click',e=>{
    if(typeof rstC==='function')rstC();
  });
}

/* ══════════════════════════════════════════════
   RIGHT-CLICK CONTEXT MENU
   ══════════════════════════════════════════════ */
let _ctxMenu=null;
function ensureCtxMenu(){
  if(_ctxMenu)return _ctxMenu;
  _ctxMenu=document.createElement('div');_ctxMenu.className='ctx-menu';_ctxMenu.setAttribute('role','menu');
  document.body.appendChild(_ctxMenu);
  return _ctxMenu;
}
function showCtxMenu(items,x,y){
  const m=ensureCtxMenu();
  m.innerHTML=items.map(it=>{
    if(it==='sep')return '<div class="ctx-sep"></div>';
    if(it.header)return `<div class="ctx-header">${it.header}</div>`;
    const cls='ctx-item'+(it.danger?' danger':'');
    return `<div class="${cls}" data-i="${items.indexOf(it)}"><span class="ctx-item-ico">${it.ico||'·'}</span><span>${it.label}</span>${it.key?`<span class="ctx-item-key">${it.key}</span>`:''}</div>`;
  }).join('');
  m.style.left=x+'px';m.style.top=y+'px';
  m.classList.add('on');
  m.querySelectorAll('.ctx-item').forEach(el=>{
    el.onclick=()=>{
      const i=+el.dataset.i;
      const it=items[i];if(it?.action)try{it.action()}catch(e){console.error(e)}
      hideCtxMenu();
    };
  });
  // Reposition si depasse
  setTimeout(()=>{
    const r=m.getBoundingClientRect();
    if(r.right>window.innerWidth)m.style.left=(window.innerWidth-r.width-10)+'px';
    if(r.bottom>window.innerHeight)m.style.top=(window.innerHeight-r.height-10)+'px';
  },10);
}
function hideCtxMenu(){_ctxMenu?.classList.remove('on')}

function initCtxMenus(){
  // Click ailleurs ferme
  document.addEventListener('click',hideCtxMenu);
  document.addEventListener('contextmenu',e=>{
    // Sur canvas viewer
    const cv=document.getElementById('cv');
    if(cv&&e.target===cv&&window.mesh){
      e.preventDefault();
      showCtxMenu([
        {header:'Modèle 3D'},
        {ico:'↻',label:'Reset vue',key:'R',action:()=>{if(typeof rstC==='function')rstC()}},
        {ico:'🎯',label:'Auto-orientation',action:()=>{if(typeof autoOrient==='function')autoOrient()}},
        {ico:'🔄',label:'Toggle rotation',action:()=>{if(typeof toggleAutoRotate==='function')toggleAutoRotate()}},
        'sep',
        {ico:'📏',label:'Mesures',action:()=>{if(typeof toggleMeasure==='function')toggleMeasure()}},
        {ico:'🏛',label:'Ajouter socle',action:()=>{if(typeof toggleBasePanel==='function')toggleBasePanel()}},
        {ico:'🎨',label:'Peindre',action:()=>{if(typeof togglePaint==='function')togglePaint()}},
        'sep',
        {ico:'📦',label:'Export GLB',action:()=>{if(typeof doE==='function')doE('glb')}},
        {ico:'🆓',label:'Export STL local',action:()=>{if(typeof exportSTLLocal==='function')exportSTLLocal()}},
      ],e.clientX,e.clientY);
      return;
    }
    // Sur item historique
    const hi=e.target.closest?.('.hi');
    if(hi){
      e.preventDefault();
      const idx=Array.from(hi.parentElement.children).indexOf(hi);
      showCtxMenu([
        {header:'Modèle dans l\'historique'},
        {ico:'📂',label:'Recharger',action:()=>{if(typeof selH==='function')selH(idx)}},
        {ico:'↻',label:'Régénérer',action:()=>{if(typeof regenFromHist==='function')regenFromHist(idx)}},
        {ico:'⭐',label:hist?.[idx]?.pinned?'Désépingler':'Épingler',action:()=>togglePin(idx)},
        'sep',
        {ico:'🗑',label:'Supprimer',danger:true,action:()=>{
          if(!confirm('Supprimer ce modèle de l\'historique ?'))return;
          if(window.hist){
            const h=window.hist[idx];
            window.hist.splice(idx,1);
            if(h?.id&&typeof idbDel==='function')idbDel(h.id);
            if(typeof saveHist==='function')saveHist();
            if(typeof rH==='function')rH();
          }
        }},
      ],e.clientX,e.clientY);
      return;
    }
  });
}

/* ══════════════════════════════════════════════
   ANIMATED FAVICON
   ══════════════════════════════════════════════ */
function setFaviconState(state){
  // state: 'idle' (default green), 'gen' (pulse orange), 'ok' (green burst), 'err' (red)
  const colors={idle:'#9eff3a',gen:'#f5a623',ok:'#9eff3a',err:'#ff4f4f'};
  const color=colors[state]||colors.idle;
  // Generate SVG favicon en data URL
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="1.2"/></filter></defs>
    <polygon points="16,2 30,16 16,30 2,16" fill="${color}" filter="url(#glow)" opacity="0.4"/>
    <polygon points="16,6 26,16 16,26 6,16" fill="${color}"/>
    ${state==='gen'?'<circle cx="16" cy="16" r="3" fill="#0a0a0a"/>':''}
  </svg>`;
  const url='data:image/svg+xml;base64,'+btoa(svg);
  let link=document.querySelector('link[rel="icon"]');
  if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}
  link.href=url;
}
// Hook sur setG pour le state gen
(function(){
  setTimeout(()=>{
    if(typeof window.setG!=='function')return;
    const orig=window.setG;
    window.setG=function(v){
      try{orig(v)}catch(e){}
      setFaviconState(v?'gen':'idle');
    };
  },200);
})();
// Hook sur toast pour ok/err
(function(){
  setTimeout(()=>{
    if(typeof window.toast!=='function')return;
    const orig=window.toast;
    window.toast=function(msg,type){
      try{orig(msg,type)}catch(e){}
      if(type==='ok')setFaviconState('ok');
      else if(type===true||type==='err')setFaviconState('err');
      setTimeout(()=>setFaviconState('idle'),1800);
    };
  },250);
})();

/* ── INIT ── */
window.addEventListener('load',()=>{
  setTimeout(()=>{
    injectHistToolbar();
    setHistView(_histView);
    initGizmo();
    initCtxMenus();
    setFaviconState('idle');
  },200);
});
