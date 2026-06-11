/* ══════════════════════════════════════════════
   PRO MAX UI v2 PR-B — Interactions naturelles
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   FAB MOBILE — Floating Action Button
   ══════════════════════════════════════════════ */
function buildFAB(){
  if(document.getElementById('fab-main'))return;
  const fab=document.createElement('button');
  fab.id='fab-main';fab.className='fab';
  fab.setAttribute('aria-label','Menu d\'actions rapides');
  fab.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  document.body.appendChild(fab);
  const radial=document.createElement('div');
  radial.id='fab-radial';radial.className='fab-radial';
  radial.innerHTML=`
    <button class="fab-action" onclick="fabAction('generate')" aria-label="Générer">⚡<span class="fab-action-lbl">Générer</span></button>
    <button class="fab-action" onclick="fabAction('import')" aria-label="Importer">📥<span class="fab-action-lbl">Importer</span></button>
    <button class="fab-action" onclick="fabAction('palette')" aria-label="Palette">⌘<span class="fab-action-lbl">Palette</span></button>
    <button class="fab-action" onclick="fabAction('settings')" aria-label="Paramètres">⚙<span class="fab-action-lbl">Paramètres</span></button>
  `;
  document.body.appendChild(radial);
  let open=false;
  fab.addEventListener('click',()=>{
    open=!open;
    fab.classList.toggle('on',open);
    radial.classList.toggle('on',open);
  });
  // Click ailleurs ferme
  document.addEventListener('click',e=>{
    if(open&&!e.target.closest('#fab-main')&&!e.target.closest('#fab-radial')){
      open=false;fab.classList.remove('on');radial.classList.remove('on');
    }
  });
}
function fabAction(name){
  document.getElementById('fab-main')?.classList.remove('on');
  document.getElementById('fab-radial')?.classList.remove('on');
  if(name==='generate'&&typeof generate==='function')generate();
  else if(name==='import')document.getElementById('import-file')?.click();
  else if(name==='palette'&&typeof openCmdPalette==='function')openCmdPalette();
  else if(name==='settings'&&typeof openSettings==='function')openSettings();
}

/* ══════════════════════════════════════════════
   SWIPE GESTURES (mobile)
   ══════════════════════════════════════════════ */
function initSwipeGestures(){
  let startX=null,startY=null,startT=0;
  const TABS=['config','viewer','infos'];
  function currentTab(){
    if(document.querySelector('.L.mob-on'))return 'config';
    if(document.querySelector('.C.mob-on'))return 'viewer';
    if(document.querySelector('.R.mob-on'))return 'infos';
    return 'config';
  }
  function swipeTo(dir){
    if(window.innerWidth>768)return;
    const cur=currentTab();
    const i=TABS.indexOf(cur);
    const nxt=Math.max(0,Math.min(TABS.length-1,i+dir));
    if(nxt!==i&&typeof mobTab==='function'){
      mobTab(TABS[nxt]);
      // Petit retour visuel
      const hint=document.getElementById('swipe-hint');
      if(hint){hint.textContent='› '+TABS[nxt].toUpperCase();hint.classList.add('show');setTimeout(()=>hint.classList.remove('show'),900)}
    }
  }
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    // Ignore si dans le viewer 3D (peindre, etc.)
    if(e.target.closest('#cv'))return;
    if(e.target.closest('.notif-drawer'))return;
    if(e.target.closest('.modal-bg'))return;
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;startT=Date.now();
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(startX===null)return;
    const dx=e.changedTouches[0].clientX-startX;
    const dy=e.changedTouches[0].clientY-startY;
    const dt=Date.now()-startT;
    startX=null;
    if(dt>500)return; // trop lent
    if(Math.abs(dx)<60||Math.abs(dy)>50)return; // pas un swipe horizontal franc
    swipeTo(dx<0?1:-1);
  },{passive:true});
  // Hint visible 1x au load
  if(!document.getElementById('swipe-hint')){
    const h=document.createElement('div');h.id='swipe-hint';h.className='swipe-hint';h.textContent='← swipe pour naviguer →';
    document.body.appendChild(h);
    setTimeout(()=>{if(window.innerWidth<=768){h.classList.add('show');setTimeout(()=>h.classList.remove('show'),2200)}},1500);
  }
}

/* ══════════════════════════════════════════════
   MAGNETIC SNAP SLIDERS
   Sliders qui snap aux valeurs courantes (style Figma)
   ══════════════════════════════════════════════ */
const SNAP_POINTS={
  'scale-sl':[25,50,75,100,150,200,300,400],
};
const SNAP_TOLERANCE_PX=8;

function initSnapSliders(){
  Object.keys(SNAP_POINTS).forEach(id=>{
    const sl=document.getElementById(id);
    if(!sl||sl.dataset.snapInit)return;
    sl.dataset.snapInit='1';
    const min=+sl.min,max=+sl.max;
    const snaps=SNAP_POINTS[id];
    // Add visual ticks
    const wrap=sl.parentElement;
    if(wrap&&!wrap.querySelector('.snap-tick')){
      snaps.forEach(v=>{
        if(v<=min||v>=max)return;
        const pct=(v-min)/(max-min);
        const tick=document.createElement('div');tick.className='snap-tick';
        // approximative position (la largeur du slider varie)
        tick.style.left=(20+pct*72)+'px'; // 72 = width du range, 20 = decalage SVG
        wrap.appendChild(tick);
      });
    }
    sl.addEventListener('input',e=>{
      const v=+e.target.value;
      // find closest snap
      let closest=v,minDist=Infinity;
      snaps.forEach(s=>{const d=Math.abs(s-v);if(d<minDist){minDist=d;closest=s}});
      // snap si dans la tolerance (3% de la range)
      const tol=(max-min)*0.025;
      if(minDist<=tol&&closest!==v){
        e.target.value=closest;
        // Trigger change event pour propager
        e.target.dispatchEvent(new Event('input',{bubbles:true}));
      }
    });
  });
}

/* ══════════════════════════════════════════════
   DRAG & DROP REORDER HISTORIQUE
   ══════════════════════════════════════════════ */
function initDragReorder(){
  // Observer pour ajouter draggable apres render
  const hist=document.getElementById('hist');if(!hist)return;
  const obs=new MutationObserver(()=>{
    hist.querySelectorAll('.hi').forEach(el=>{
      if(el.dataset.dragInit)return;
      el.dataset.dragInit='1';
      el.draggable=true;
      // Index absolu dans le tableau hist via onclick="selH(N)" (l'index DOM ment si filtre actif)
      const histIdxOf=node=>{const m=(node.getAttribute('onclick')||'').match(/selH\((\d+)\)/);return m?+m[1]:Array.from(hist.children).indexOf(node)};
      el.addEventListener('dragstart',e=>{
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',String(histIdxOf(el)));
        el.classList.add('dragging');
      });
      el.addEventListener('dragend',()=>{
        el.classList.remove('dragging');
        hist.querySelectorAll('.drag-over,.drag-over-bottom').forEach(x=>{x.classList.remove('drag-over');x.classList.remove('drag-over-bottom')});
      });
      el.addEventListener('dragover',e=>{
        e.preventDefault();e.dataTransfer.dropEffect='move';
        const r=el.getBoundingClientRect();const bottom=e.clientY>r.top+r.height/2;
        el.classList.toggle('drag-over',!bottom);
        el.classList.toggle('drag-over-bottom',bottom);
      });
      el.addEventListener('dragleave',()=>{el.classList.remove('drag-over');el.classList.remove('drag-over-bottom')});
      el.addEventListener('drop',e=>{
        e.preventDefault();
        const fromIdx=+e.dataTransfer.getData('text/plain');
        const r=el.getBoundingClientRect();const bottom=e.clientY>r.top+r.height/2;
        let toIdx=histIdxOf(el);
        if(bottom)toIdx++;
        if(Array.isArray(window.hist)&&fromIdx>=0&&fromIdx<window.hist.length){
          const moved=window.hist.splice(fromIdx,1)[0];
          if(toIdx>fromIdx)toIdx--;
          window.hist.splice(toIdx,0,moved);
          if(typeof saveHist==='function')saveHist();
          if(typeof rH==='function')rH();
        }
      });
    });
  });
  obs.observe(hist,{childList:true,subtree:false});
}

/* ══════════════════════════════════════════════
   HUD DRAGGABLE — drag le header pour bouger
   ══════════════════════════════════════════════ */
function initHudDrag(){
  const HUDS=['meas-hud','sec-hud','light-hud','hollow-hud','paint-hud','base-hud'];
  HUDS.forEach(id=>{
    const hud=document.getElementById(id);if(!hud||hud.dataset.dragInit)return;
    hud.dataset.dragInit='1';
    const head=hud.querySelector('.meas-head');if(!head)return;
    // Add grip visual
    const span=head.querySelector('span');
    if(span&&!span.querySelector('.hud-grip')){
      const g=document.createElement('span');g.className='hud-grip';span.insertBefore(g,span.firstChild);
    }
    let drag=false,sx=0,sy=0,startL=0,startT=0;
    head.addEventListener('mousedown',e=>{
      if(e.target.closest('.meas-close'))return;
      // Save position avant le drag
      const r=hud.getBoundingClientRect();
      startL=r.left;startT=r.top;sx=e.clientX;sy=e.clientY;drag=true;
      hud.classList.add('hud-dragging');
      // Switch to fixed positioning
      hud.style.position='fixed';
      hud.style.left=startL+'px';hud.style.top=startT+'px';
      hud.style.right='auto';hud.style.bottom='auto';
      e.preventDefault();
    });
    document.addEventListener('mousemove',e=>{
      if(!drag)return;
      const nx=Math.max(0,Math.min(window.innerWidth-100,startL+e.clientX-sx));
      const ny=Math.max(0,Math.min(window.innerHeight-50,startT+e.clientY-sy));
      hud.style.left=nx+'px';hud.style.top=ny+'px';
    });
    document.addEventListener('mouseup',()=>{
      if(!drag)return;drag=false;
      hud.classList.remove('hud-dragging');
      // Save position pour la session
      sessionStorage.setItem('hud_'+id,JSON.stringify({l:hud.style.left,t:hud.style.top}));
    });
  });
  // Restore positions sauvegardees pour la session
  HUDS.forEach(id=>{
    const saved=sessionStorage.getItem('hud_'+id);if(!saved)return;
    try{const p=JSON.parse(saved);const hud=document.getElementById(id);
      if(hud){hud.style.position='fixed';hud.style.left=p.l;hud.style.top=p.t;hud.style.right='auto';hud.style.bottom='auto'}
    }catch(e){}
  });
}

/* ══════════════════════════════════════════════
   SMART SUGGESTIONS
   Tips contextuels qui apparaissent au bon moment
   ══════════════════════════════════════════════ */
let _smartTipShown=new Set();
const SMART_TIPS=[
  {
    id:'orient-after-import',
    trigger:()=>window.mUrls?._imported&&window.mesh,
    delay:3000,
    icon:'🎯',
    msg:'Modèle importé. Pense à <b>Auto-orient</b> avant impression pour minimiser les supports.',
    cta:'Faire',
    action:()=>{if(typeof autoOrient==='function')autoOrient()}
  },
  {
    id:'use-grid-history',
    trigger:()=>window.hist&&window.hist.length>=8&&_histView==='list',
    delay:1500,
    icon:'🔲',
    msg:'Tu as <b>'+( window.hist?.length||0)+' modèles</b>. La vue grille est plus pratique pour parcourir.',
    cta:'Passer en grille',
    action:()=>{if(typeof setHistView==='function')setHistView('grid')}
  },
  {
    id:'try-multiview-faces',
    trigger:()=>window.mode==='image'&&window.imgs?.[1]?.length===1&&window.quality==='hd',
    delay:5000,
    icon:'📐',
    msg:'Pour les <b>visages humains</b>, le mode Multi-view (4 angles) donne de meilleurs résultats.',
    cta:'Voir',
    action:()=>{if(typeof openModal==='function')openModal('modal-guide')}
  },
  {
    id:'export-glb-free',
    trigger:()=>window.hist?.length>=3&&window.mUrls?.glb,
    delay:8000,
    icon:'💰',
    msg:'<b>GLB est gratuit</b>. Pour économiser tes crédits Tripo, convertis en STL via Blender (cf Guide).',
    cta:'Comprendre',
    action:()=>{if(typeof openModal==='function')openModal('modal-guide')},
    interval:60000 // re-show max 1x/min
  },
];
function checkSmartTips(){
  if(localStorage.getItem('form3d_no_tips')==='1')return;
  const tip=document.getElementById('smart-tip');if(!tip)return;
  if(tip.classList.contains('on'))return; // un seul a la fois
  for(const t of SMART_TIPS){
    if(_smartTipShown.has(t.id)&&!t.interval)continue;
    try{if(t.trigger()){_showSmartTip(t);break}}catch(e){}
  }
}
function _showSmartTip(t){
  _smartTipShown.add(t.id);
  const tip=document.getElementById('smart-tip');
  document.getElementById('smart-tip-ico').textContent=t.icon||'💡';
  document.getElementById('smart-tip-msg').innerHTML=t.msg;
  const cta=document.getElementById('smart-tip-cta');
  cta.textContent=t.cta||'OK';
  cta.onclick=()=>{try{t.action?.()}catch(e){}hideSmartTip()};
  setTimeout(()=>tip.classList.add('on'),50);
  // Auto-hide apres 12s
  if(window._smartTipTimer)clearTimeout(window._smartTipTimer);
  window._smartTipTimer=setTimeout(hideSmartTip,12000);
}
function hideSmartTip(){document.getElementById('smart-tip')?.classList.remove('on')}
function disableTips(){
  localStorage.setItem('form3d_no_tips','1');
  hideSmartTip();
}

/* Build le DOM */
function buildSmartTip(){
  if(document.getElementById('smart-tip'))return;
  const t=document.createElement('div');t.id='smart-tip';t.className='smart-tip';t.setAttribute('role','status');
  t.innerHTML=`
    <span class="smart-tip-ico" id="smart-tip-ico">💡</span>
    <span id="smart-tip-msg">…</span>
    <button class="smart-tip-cta" id="smart-tip-cta">OK</button>
    <button class="smart-tip-close" onclick="hideSmartTip()" aria-label="Fermer">×</button>
  `;
  document.body.appendChild(t);
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
window.addEventListener('load',()=>{
  setTimeout(()=>{
    [buildFAB,initSwipeGestures,initSnapSliders,initDragReorder,initHudDrag,buildSmartTip,
     ()=>setInterval(checkSmartTips,3000)]
      .forEach(fn=>{try{fn()}catch(e){console.warn('promax4 init:',e)}});
  },300);
});
