/* ══════════════════════════════════════════════
   PRO MAX UI v2 — Polish (status / particles / cursor / a11y)
   ══════════════════════════════════════════════ */

/* ── STATUS BAR BOTTOM ── */
function buildStatusBar(){
  if(document.getElementById('status-bar'))return;
  const sb=document.createElement('div');
  sb.id='status-bar';sb.className='status-bar';sb.setAttribute('role','status');
  sb.innerHTML=`
    <span class="status-item"><span class="status-item-ico">●</span>FORM <span class="v" id="sb-mode">Texte</span></span>
    <span class="status-sep"></span>
    <span class="status-item"><span class="status-item-ico">⚡</span><span class="v" id="sb-backend">Tripo3D</span></span>
    <span class="status-sep hide-mob"></span>
    <span class="status-item hide-mob"><span class="status-item-ico">🧊</span><span class="v" id="sb-tris">0</span> tri</span>
    <span class="status-sep hide-mob"></span>
    <span class="status-item hide-mob"><span class="status-item-ico">📐</span><span class="v" id="sb-dims">— mm</span></span>
    <span class="status-item right"><span class="status-fps-dot" id="sb-fps-dot"></span><span class="v" id="sb-fps">60</span> FPS</span>
  `;
  document.body.appendChild(sb);
}

let _sbFrames=0,_sbLast=performance.now(),_sbFps=60;
function statusBarTick(){
  _sbFrames++;
  const now=performance.now();
  if(now-_sbLast>=1000){
    _sbFps=Math.round(_sbFrames*1000/(now-_sbLast));
    _sbFrames=0;_sbLast=now;
    const fpsEl=document.getElementById('sb-fps');if(fpsEl)fpsEl.textContent=_sbFps;
    const dot=document.getElementById('sb-fps-dot');
    if(dot){dot.className='status-fps-dot'+(_sbFps<30?' low':_sbFps<50?' med':'')}
  }
  requestAnimationFrame(statusBarTick);
}

function updateStatusBar(){
  // Mode actif
  const mode=window.mode||'text';
  const modeMap={text:'Texte',image:'Image',multiview:'Multi-view',hybrid:'Hybride',import:'Import'};
  const modeEl=document.getElementById('sb-mode');if(modeEl)modeEl.textContent=modeMap[mode]||mode;
  // Backend
  const beEl=document.getElementById('sb-backend');if(beEl)beEl.textContent=(window.backend||'tripo')==='trellis'?'TRELLIS Local':'Tripo3D';
  // Tris + dims (depuis mesh global)
  if(window.mesh){
    let tris=0;
    window.mesh.traverse(n=>{
      if(!n.isMesh||!n.geometry)return;
      const g=n.geometry;
      tris+=g.index?g.index.count/3:g.attributes.position?g.attributes.position.count/3:0;
    });
    const trisEl=document.getElementById('sb-tris');if(trisEl)trisEl.textContent=Math.round(tris).toLocaleString('fr');
    try{
      const THREE=window.THREE;
      const bbox=new THREE.Box3().setFromObject(window.mesh);
      const sz=new THREE.Vector3();bbox.getSize(sz);
      const bsc=window.mesh.userData?.baseScale||1;
      const ms=window.modelScale||1;
      const dx=Math.round(Math.max(sz.x/bsc,0.05)*100*ms);
      const dy=Math.round(Math.max(sz.y/bsc,0.05)*100*ms);
      const dz=Math.round(Math.max(sz.z/bsc,0.05)*100*ms);
      const el=document.getElementById('sb-dims');if(el)el.textContent=`${dx}×${dy}×${dz} mm`;
    }catch(e){}
  }else{
    const el=document.getElementById('sb-dims');if(el)el.textContent='— mm';
    const el2=document.getElementById('sb-tris');if(el2)el2.textContent='0';
  }
}

/* ── PARTICLES BACKGROUND ── */
let _particles=[],_particleRAF=null;
function buildParticles(){
  if(document.getElementById('particles-bg'))return;
  const c=document.createElement('div');c.id='particles-bg';c.className='particles-bg';
  document.body.insertBefore(c,document.body.firstChild);
  // Create N particles
  const N=30;
  _particles=[];
  for(let i=0;i<N;i++){
    const p=document.createElement('div');p.className='particle';
    const obj={el:p,x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:(Math.random()-.5)*0.15,vy:(Math.random()-.5)*0.15,size:Math.random()*2+1.5};
    p.style.width=p.style.height=obj.size+'px';
    p.style.opacity=Math.random()*0.4+0.15;
    c.appendChild(p);
    _particles.push(obj);
  }
  function tick(){
    for(const p of _particles){
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=window.innerWidth;else if(p.x>window.innerWidth)p.x=0;
      if(p.y<0)p.y=window.innerHeight;else if(p.y>window.innerHeight)p.y=0;
      p.el.style.transform=`translate(${p.x}px,${p.y}px)`;
    }
    _particleRAF=requestAnimationFrame(tick);
  }
  tick();
}
function destroyParticles(){
  cancelAnimationFrame(_particleRAF);_particleRAF=null;
  document.getElementById('particles-bg')?.remove();
  _particles=[];
}
function setParticles(on){
  document.body.classList.toggle('no-particles',!on);
  localStorage.setItem('form3d_particles',on?'1':'0');
  if(on)buildParticles();else destroyParticles();
}

/* ── EMPTY STATES ANIMÉS ── */
function decorateEmptyStates(){
  // Specs vide
  const specs=document.getElementById('specs-content');
  if(specs&&specs.querySelector('.specs-empty')&&!specs.querySelector('.es-anim')){
    specs.innerHTML=`<div class="es-anim">
      <div class="es-anim-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
      <h4>Aucune génération</h4>
      <p>Génère un modèle pour voir les<br>specs Bambu Studio détaillées.</p>
    </div>`;
  }
  // Filaments vide
  const fils=document.getElementById('fil-list');
  if(fils&&fils.querySelector('.specs-empty')&&!fils.querySelector('.es-anim')){
    fils.innerHTML=`<div class="es-anim">
      <div class="es-anim-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11h18M3 11l3-6h12l3 6M3 11v8h18v-8"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="12" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/></svg></div>
      <h4>Filaments</h4>
      <p>Calcul automatique du poids,<br>longueur et coût par filament.</p>
    </div>`;
  }
}

/* ── R-TABS indicator coulissant ── */
function updateRTabsIndicator(){
  const tabs=document.querySelector('.r-tabs');if(!tabs)return;
  const on=tabs.querySelector('.r-tab.on');if(!on)return;
  const tr=tabs.getBoundingClientRect();const r=on.getBoundingClientRect();
  tabs.style.setProperty('--rt-x',(r.left-tr.left)+'px');
  tabs.style.setProperty('--rt-w',r.width+'px');
}

/* ── CUSTOM CURSOR (paint mode) ── */
let _paintCursor=null;
function ensurePaintCursor(){
  if(_paintCursor)return _paintCursor;
  _paintCursor=document.createElement('div');
  _paintCursor.id='paint-cursor';_paintCursor.className='paint-cursor';
  document.body.appendChild(_paintCursor);
  return _paintCursor;
}
function updatePaintCursor(e){
  if(!_paintCursor)return;
  if(!window.paintMode){_paintCursor.classList.remove('on');document.body.classList.remove('paint-cursor-active');return}
  const cv=document.getElementById('cv');if(!cv)return;
  const rect=cv.getBoundingClientRect();
  const inCv=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  if(!inCv){_paintCursor.classList.remove('on');document.body.classList.remove('paint-cursor-active');return}
  _paintCursor.classList.add('on');
  document.body.classList.add('paint-cursor-active');
  // Adapte le style selon le mode
  _paintCursor.classList.remove('eyedrop','fill');
  if(window.paintBrushMode==='eyedrop')_paintCursor.classList.add('eyedrop');
  else if(window.paintBrushMode==='fill')_paintCursor.classList.add('fill');
  else{
    // Taille proportionnelle au brush radius (radius 0.15 -> 30px)
    const r=Math.max(12,Math.min(80,(window.paintRadius||0.15)*200));
    _paintCursor.style.width=_paintCursor.style.height=r+'px';
    _paintCursor.style.background=`radial-gradient(circle,${(window.paintColor||'#9eff3a')}33 0%,transparent 70%)`;
    _paintCursor.style.borderColor=window.paintColor||'#9eff3a';
  }
  _paintCursor.style.left=e.clientX+'px';
  _paintCursor.style.top=e.clientY+'px';
}

/* ── ARIA LIVE pour les toasts ── */
function buildAriaLive(){
  if(document.getElementById('aria-live'))return;
  const el=document.createElement('div');
  el.id='aria-live';el.className='sr-only';
  el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');
  document.body.appendChild(el);
}
function announce(msg){
  const el=document.getElementById('aria-live');if(!el)return;
  el.textContent='';setTimeout(()=>el.textContent=msg,50);
}
// Hook toast pour annoncer
function hookToastA11y(){
  if(window._a11yHooked)return;
  const orig=window.toast;
  window.toast=function(msg,type){
    try{orig?.(msg,type)}catch(e){}
    announce(msg);
  };
  window._a11yHooked=true;
}

/* ── INIT — etapes isolees ── */
window.addEventListener('load',()=>{
  [
    ()=>{buildStatusBar();setInterval(updateStatusBar,500);statusBarTick()},
    ()=>{
      const particlesOn=localStorage.getItem('form3d_particles')!=='0';
      if(particlesOn)buildParticles();
      else document.body.classList.add('no-particles');
    },
    ()=>{decorateEmptyStates();setInterval(decorateEmptyStates,2000)},
    ()=>{
      updateRTabsIndicator();
      document.querySelectorAll('.r-tab').forEach(t=>t.addEventListener('click',()=>setTimeout(updateRTabsIndicator,10)));
      window.addEventListener('resize',updateRTabsIndicator);
    },
    ()=>{ensurePaintCursor();document.addEventListener('mousemove',updatePaintCursor)},
    ()=>{buildAriaLive();setTimeout(hookToastA11y,150)},
  ].forEach(fn=>{try{fn()}catch(e){console.warn('promax2 init:',e)}});
});

/* ── Toggle particles dans Settings (ajoute la row) ── */
function injectParticlesToggle(){
  const settings=document.querySelector('#modal-settings .settings-body');
  if(!settings||settings.querySelector('#opt-particles'))return;
  // Cherche la section Performance
  const perfSecs=settings.querySelectorAll('.settings-sec');
  let perfSec=null;
  perfSecs.forEach(s=>{if(s.querySelector('.settings-sec-h')?.textContent.includes('Performance'))perfSec=s});
  if(!perfSec)return;
  const row=document.createElement('div');
  row.className='settings-row';
  row.innerHTML=`
    <div class="settings-row-info">
      <div class="settings-row-lbl">Particules de fond</div>
      <div class="settings-row-sub">Petits points néon qui dérivent (décoratif)</div>
    </div>
    <label class="toggle"><input type="checkbox" id="opt-particles" ${localStorage.getItem('form3d_particles')!=='0'?'checked':''} onchange="setParticles(this.checked)"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
  `;
  perfSec.appendChild(row);
}
// Auto-inject quand la modale s'ouvre
document.addEventListener('click',e=>{
  if(e.target.closest?.('[onclick*="openSettings"]'))setTimeout(injectParticlesToggle,30);
});
