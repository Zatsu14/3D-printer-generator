/* ══════════════════════════════════════════════
   PRO MAX UI — Themes / Tour / Skeletons / Notifs / Settings
   ══════════════════════════════════════════════ */

/* ── THEME SWITCHER ── */
const THEMES=['neon','cyber','pastel','mono'];
function setTheme(name){
  if(!THEMES.includes(name))name='neon';
  THEMES.forEach(t=>document.body.classList.toggle('theme-'+t,t===name));
  // 'neon' n'a pas de classe car c'est le defaut
  if(name==='neon')document.body.classList.remove('theme-neon');
  document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('on',c.dataset.theme===name));
  localStorage.setItem('form3d_theme',name);
  if(typeof toast==='function')toast('🎨 Thème : '+({neon:'Neon Lime',cyber:'Cyberpunk',pastel:'Pastel Soft',mono:'Mono Sombre'}[name]),'ok');
}
function initTheme(){
  const saved=localStorage.getItem('form3d_theme')||'neon';
  if(saved!=='neon')document.body.classList.add('theme-'+saved);
  document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('on',c.dataset.theme===saved));
}

/* ── NOTIFICATION CENTER ── */
const NOTIF_KEY='form3d_notifs_v1';
let notifs=[];
let _unreadCount=0;

function loadNotifs(){
  try{notifs=JSON.parse(localStorage.getItem(NOTIF_KEY)||'[]')}catch(e){notifs=[]}
  // Calcule les non-lus
  _unreadCount=notifs.filter(n=>!n.read).length;
  updateNotifBadge();
  renderNotifs();
}
function saveNotifs(){
  if(localStorage.getItem('form3d_keep_notifs')==='0')return;
  try{localStorage.setItem(NOTIF_KEY,JSON.stringify(notifs.slice(0,50)))}catch(e){}
}
function pushNotif(msg,type){
  const item={msg,type:type||'',time:Date.now(),read:false};
  notifs.unshift(item);
  notifs=notifs.slice(0,50);
  _unreadCount++;
  saveNotifs();
  updateNotifBadge();
  renderNotifs();
}
function updateNotifBadge(){
  const b=document.getElementById('notif-badge');if(!b)return;
  if(_unreadCount<=0){b.classList.add('hidden')}
  else{b.classList.remove('hidden');b.textContent=_unreadCount>9?'9+':_unreadCount}
}
function renderNotifs(){
  const el=document.getElementById('notif-list');if(!el)return;
  if(!notifs.length){
    el.innerHTML='<div class="notif-empty"><div class="notif-empty-ico">🔔</div>Aucune notification pour le moment.<br>Les messages apparaîtront ici.</div>';
    return;
  }
  el.innerHTML=notifs.map(n=>{
    const ago=_relativeTime(n.time);
    const cls=n.type==='ok'?'ok':n.type==='err'?'err':'';
    return `<div class="notif-item ${cls}"><div class="notif-item-msg">${_escapeHtml(n.msg)}</div><div class="notif-item-time">${ago}</div></div>`;
  }).join('');
}
function _escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function _relativeTime(t){
  const d=Math.max(0,Date.now()-t);
  if(d<60000)return 'À l\'instant';
  if(d<3600000)return Math.floor(d/60000)+' min';
  if(d<86400000)return Math.floor(d/3600000)+' h';
  return Math.floor(d/86400000)+' j';
}
function toggleNotifs(){
  const d=document.getElementById('notif-drawer');if(!d)return;
  const opening=!d.classList.contains('on');
  d.classList.toggle('on');
  if(opening){markAllNotifsRead()}
}
function markAllNotifsRead(){
  notifs.forEach(n=>n.read=true);_unreadCount=0;
  saveNotifs();updateNotifBadge();
}
function clearNotifs(){
  if(!confirm('Effacer toutes les notifications ?'))return;
  notifs=[];_unreadCount=0;saveNotifs();updateNotifBadge();renderNotifs();
}

/* Hook le toast() existant pour qu'il push aussi dans les notifs */
function hookToast(){
  if(!window._origToast)window._origToast=window.toast;
  window.toast=function(msg,type){
    try{window._origToast(msg,type)}catch(e){}
    const t=type===true||type==='err'?'err':type==='ok'?'ok':'';
    pushNotif(msg,t);
    if(window._soundsOn)_playSound(t);
  };
}

/* ── SETTINGS PANEL ── */
function openSettings(){
  // Restore les toggles
  const setT=(id,k,def)=>{const el=document.getElementById(id);if(el){const v=localStorage.getItem(k);el.checked=v===null?def:v==='1'}};
  setT('opt-sound','form3d_sounds',false);
  setT('opt-keep-notifs','form3d_keep_notifs',true);
  setT('opt-anim','form3d_anim',true);
  setT('opt-autorot-default','form3d_autorot_default',true);
  // Storage info
  try{
    let total=0;
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);total+=k.length+localStorage.getItem(k).length}
    const el=document.getElementById('storage-info');
    if(el)el.textContent=`Historique + drafts + préférences (~${(total/1024).toFixed(1)} KB)`;
  }catch(e){}
  if(typeof openModal==='function')openModal('modal-settings');
}

function setSounds(on){
  localStorage.setItem('form3d_sounds',on?'1':'0');
  window._soundsOn=on;
}
function setKeepNotifs(on){
  localStorage.setItem('form3d_keep_notifs',on?'1':'0');
  if(!on)try{localStorage.removeItem(NOTIF_KEY)}catch(e){}
}
function setAnimations(on){
  localStorage.setItem('form3d_anim',on?'1':'0');
  document.body.classList.toggle('reduce-motion',!on);
}
function setAutoRotateDefault(on){
  localStorage.setItem('form3d_autorot_default',on?'1':'0');
}
function exportAllData(){
  const dump={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('form3d_'))dump[k]=localStorage.getItem(k)}
  const blob=new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='form3d_backup_'+Date.now()+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  if(typeof toast==='function')toast('✓ Backup exporté','ok');
}
function clearAllData(){
  if(!confirm('⚠️ Effacer TOUTES les données locales ?\n\n• Historique\n• Modèles 3D stockés\n• Préférences\n• Drafts\n\nIrréversible.'))return;
  const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('form3d_'))keys.push(k)}
  keys.forEach(k=>localStorage.removeItem(k));
  // Vide aussi IndexedDB
  try{indexedDB.deleteDatabase('form3d_v1')}catch(e){}
  alert('✓ Données effacées. La page va recharger.');
  location.reload();
}

/* ── SKELETON VIEWER ── */
function showViewerSkel(){const el=document.getElementById('viewer-skel');if(el)el.classList.add('on')}
function hideViewerSkel(){const el=document.getElementById('viewer-skel');if(el)el.classList.remove('on')}
/* Hook setG pour montrer skeleton pendant gen, hide a la fin */
function hookSetG(){
  if(typeof setG!=='function'||window._origSetG)return;
  window._origSetG=setG;
  window.setG=function(v){
    try{window._origSetG(v)}catch(e){}
    if(v)showViewerSkel();else hideViewerSkel();
  };
}

/* ── WELCOME TOUR ── */
const TOUR_STEPS=[
  {sel:'.logo',title:'Bienvenue dans FORM',text:'Générateur 3D pour ton imprimante Bambu Lab. Crée des modèles à partir de texte, d\'images ou imports STL/GLB.'},
  {sel:'.bk-sel',title:'Choisis ton backend',text:'☁ Tripo3D (cloud, payant) pour une qualité pro · 🟣 TRELLIS Local (gratuit, GPU NVIDIA) pour les objets simples.'},
  {sel:'.tabs',title:'4 modes de génération',text:'Texte (décris) · Image (upload une photo) · Multi-view (4 angles) · Hybride (texte + image). Raccourcis : 1-4.'},
  {sel:'#gbtn',title:'Génère ton modèle',text:'Configure puis clique ici. Raccourci : Ctrl+Enter. Tu peux annuler à tout moment.'},
  {sel:'.vtb-r',title:'Outils sur le modèle',text:'Import, orientation, mesures, peinture, socle, hollowing… Hover chaque icône pour voir son nom.',pos:'bottom'},
  {sel:'#notif-btn',title:'Notifications & paramètres',text:'Centre de notifs (cloche) + Paramètres (⚙) pour personnaliser thème, sons, exporter tes données. Tu es prêt !'},
];
let _tourIdx=0;

function startWelcomeTour(force){
  if(!force&&localStorage.getItem('form3d_tour_done')==='1')return;
  _tourIdx=0;
  const ov=document.getElementById('tour-overlay');if(!ov)return;
  ov.classList.add('on');
  _renderTourStep();
}
function nextTourStep(){
  _tourIdx++;
  if(_tourIdx>=TOUR_STEPS.length){endWelcomeTour();return}
  _renderTourStep();
}
function endWelcomeTour(){
  document.getElementById('tour-overlay')?.classList.remove('on');
  localStorage.setItem('form3d_tour_done','1');
}
function _renderTourStep(){
  const step=TOUR_STEPS[_tourIdx];if(!step)return;
  const target=document.querySelector(step.sel);
  if(!target){nextTourStep();return}
  const r=target.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const radius=Math.max(r.width,r.height)/2+18;
  // Update mask
  const mask=document.getElementById('tour-mask');
  if(mask){
    mask.style.setProperty('--cx',cx+'px');
    mask.style.setProperty('--cy',cy+'px');
    mask.style.setProperty('--r',radius+'px');
  }
  // Ring
  const ring=document.getElementById('tour-ring');
  if(ring){
    ring.style.left=(cx-radius)+'px';
    ring.style.top=(cy-radius)+'px';
    ring.style.width=ring.style.height=(radius*2)+'px';
  }
  // Bubble : positionne en dessous OU au-dessus selon l'espace
  const bubble=document.getElementById('tour-bubble');
  if(bubble){
    bubble.style.top='';
    bubble.style.bottom='';
    bubble.style.left='';
    const bubbleW=340,bubbleH=200;
    let bx=cx-bubbleW/2;
    bx=Math.max(16,Math.min(window.innerWidth-bubbleW-16,bx));
    bubble.style.left=bx+'px';
    // Vertical : en dessous si possible, sinon au-dessus
    const spaceBelow=window.innerHeight-(cy+radius)-bubbleH-30;
    if(step.pos==='bottom'||spaceBelow>0){
      bubble.style.top=(cy+radius+24)+'px';
    }else{
      bubble.style.top=Math.max(16,cy-radius-bubbleH-24)+'px';
    }
  }
  // Contenu
  document.getElementById('tour-step').textContent='Étape '+(_tourIdx+1)+' / '+TOUR_STEPS.length;
  document.getElementById('tour-title').textContent=step.title;
  document.getElementById('tour-text').textContent=step.text;
  const nextBtn=document.getElementById('tour-next');
  if(nextBtn)nextBtn.textContent=_tourIdx===TOUR_STEPS.length-1?'✓ Terminer':'Suivant →';
  // Dots
  const prog=document.getElementById('tour-progress');
  if(prog)prog.innerHTML=TOUR_STEPS.map((_,i)=>`<div class="tour-dot${i===_tourIdx?' on':''}"></div>`).join('');
}

/* ── SOUNDS (synthese Web Audio) ── */
let _audioCtx=null;
function _playSound(type){
  try{
    if(!_audioCtx)_audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const ctx=_audioCtx;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    const freqs={ok:[660,990],err:[220,180],'':[440]};
    const f=freqs[type]||freqs[''];
    osc.frequency.value=f[0];
    if(f[1])osc.frequency.linearRampToValueAtTime(f[1],ctx.currentTime+0.08);
    gain.gain.value=0.08;
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    osc.start();osc.stop(ctx.currentTime+0.18);
  }catch(e){}
}

/* ── INIT ── */
window.addEventListener('load',()=>{
  initTheme();
  loadNotifs();
  hookToast();
  // Restore prefs
  if(localStorage.getItem('form3d_sounds')==='1')window._soundsOn=true;
  if(localStorage.getItem('form3d_anim')==='0')document.body.classList.add('reduce-motion');
  // Hook setG apres que app.js soit charge
  setTimeout(hookSetG,100);
  // Welcome tour
  setTimeout(()=>{
    if(localStorage.getItem('form3d_tour_done')!=='1'&&!localStorage.getItem('form3d_hist_v2'))startWelcomeTour();
  },800);
});
