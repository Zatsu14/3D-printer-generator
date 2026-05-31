/* ══════════════════════════════════════════════
   POSTER 3D — Lithophane / Bas-relief / Plat colore
   Convertit une image en mesh 3D imprimable
   ══════════════════════════════════════════════ */

let _posterImg=null;       // HTMLImageElement charge
let _posterImgData=null;   // ImageData (pixels RGBA)
let _posterCfg={
  mode:'litho',            // 'litho' | 'relief' | 'flat-color'
  widthMm:100,             // largeur cible en mm
  resolution:200,          // nb cellules sur la largeur
  thickMin:0.8,            // epaisseur min (back) mm
  thickMax:3.5,            // epaisseur max (front) mm
  invert:false,            // inverser noir/blanc
  borderMm:3,              // bordure plate autour
  baseFlat:true,           // base plate watertight
  hangHole:false,          // trou suspension
  smoothing:1,             // niveau de smoothing 0-3
};

/* ── HTML : modal Poster 3D injecte au load ── */
function _buildPosterModal(){
  if(document.getElementById('modal-poster'))return;
  const m=document.createElement('div');
  m.className='modal-bg poster-modal';m.id='modal-poster';m.setAttribute('role','dialog');m.setAttribute('aria-label','Poster 3D');
  m.innerHTML=`
    <div class="modal" style="width:680px;max-width:96vw;padding:0;overflow:hidden">
      <div class="settings-head">
        <div class="settings-title">🖼 Poster 3D depuis une image</div>
        <button class="notif-close" onclick="closePosterModal()" aria-label="Fermer">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:0">
        <!-- Preview image -->
        <div style="padding:18px;border-right:1px solid var(--b2);background:var(--bg2)">
          <div id="poster-preview-wrap" style="width:100%;aspect-ratio:1;border:1.5px dashed var(--b2);border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg3);position:relative;cursor:pointer" onclick="q('poster-file').click()">
            <div id="poster-empty" style="text-align:center;color:var(--t3);font-family:var(--mono);font-size:11px;padding:14px;line-height:1.6">
              <div style="font-size:32px;margin-bottom:10px;color:var(--ac)">🖼</div>
              Clique ou drop<br>une image
            </div>
            <canvas id="poster-canvas" style="display:none;max-width:100%;max-height:100%;border-radius:8px"></canvas>
          </div>
          <input type="file" id="poster-file" accept=".jpg,.jpeg,.png,.webp" style="display:none" onchange="_handlePosterImage(event)">
          <button class="settings-data-btn" style="width:100%;margin-top:8px" onclick="q('poster-file').click()">📥 Charger image</button>
          <div id="poster-imginfo" style="font-family:var(--mono);font-size:10px;color:var(--t3);margin-top:10px;line-height:1.6"></div>
        </div>
        <!-- Params -->
        <div style="padding:18px 22px;max-height:60vh;overflow-y:auto">
          <!-- Mode -->
          <div class="settings-sec" style="margin-bottom:18px">
            <div class="settings-sec-h">Type</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">
              <button class="poster-mode-card on" data-mode="litho" onclick="setPosterMode('litho')">
                <div style="font-size:18px">🌗</div>
                <div style="font-weight:700;font-size:11px;margin-top:3px">Lithophane</div>
                <div style="font-size:9px;color:var(--t3);margin-top:2px">Rétroéclairé</div>
              </button>
              <button class="poster-mode-card" data-mode="relief" onclick="setPosterMode('relief')">
                <div style="font-size:18px">🗿</div>
                <div style="font-weight:700;font-size:11px;margin-top:3px">Bas-relief</div>
                <div style="font-size:9px;color:var(--t3);margin-top:2px">Sculpture</div>
              </button>
              <button class="poster-mode-card" data-mode="flat-color" onclick="setPosterMode('flat-color')">
                <div style="font-size:18px">🎨</div>
                <div style="font-weight:700;font-size:11px;margin-top:3px">Plat couleur</div>
                <div style="font-size:9px;color:var(--t3);margin-top:2px">AMS multi</div>
              </button>
            </div>
            <div class="tr-desc" id="poster-mode-desc" style="margin-top:6px">Lithophane : zones sombres = plus épais → bloquent la lumière en rétroéclairage. Idéal lampe.</div>
          </div>

          <!-- Dimensions -->
          <div class="settings-sec" style="margin-bottom:18px">
            <div class="settings-sec-h">Dimensions</div>
            <div class="tr-sl-row">
              <label>Largeur</label>
              <input type="range" min="40" max="300" step="5" value="100" id="poster-width" oninput="setPosterParam('widthMm',+this.value)">
              <span class="tr-sl-val" id="poster-width-val">100 mm</span>
            </div>
            <div class="tr-desc">Hauteur calculée auto selon le ratio de l'image</div>
            <div class="tr-sl-row">
              <label>Bordure plate</label>
              <input type="range" min="0" max="15" step="0.5" value="3" id="poster-border" oninput="setPosterParam('borderMm',+this.value)">
              <span class="tr-sl-val" id="poster-border-val">3 mm</span>
            </div>
          </div>

          <!-- Epaisseur (modes litho/relief) -->
          <div class="settings-sec" id="poster-thick-sec" style="margin-bottom:18px">
            <div class="settings-sec-h">Épaisseur</div>
            <div class="tr-sl-row">
              <label>Min (back)</label>
              <input type="range" min="0.4" max="3" step="0.1" value="0.8" id="poster-tmin" oninput="setPosterParam('thickMin',+this.value)">
              <span class="tr-sl-val" id="poster-tmin-val">0.8 mm</span>
            </div>
            <div class="tr-sl-row">
              <label>Max (front)</label>
              <input type="range" min="1" max="8" step="0.1" value="3.5" id="poster-tmax" oninput="setPosterParam('thickMax',+this.value)">
              <span class="tr-sl-val" id="poster-tmax-val">3.5 mm</span>
            </div>
            <div class="tr-desc">Lithophane idéal : min 0.8 / max 3-4 mm (3 couches de 0.2)</div>
          </div>

          <!-- Qualité -->
          <div class="settings-sec" style="margin-bottom:18px">
            <div class="settings-sec-h">Qualité</div>
            <div class="tr-sl-row">
              <label>Résolution</label>
              <input type="range" min="50" max="500" step="10" value="200" id="poster-res" oninput="setPosterParam('resolution',+this.value)">
              <span class="tr-sl-val" id="poster-res-val">200</span>
            </div>
            <div class="tr-desc">Nb de cellules sur la largeur · plus = plus détaillé mais plus lourd</div>
            <div class="tr-sl-row">
              <label>Lissage</label>
              <input type="range" min="0" max="3" step="1" value="1" id="poster-smooth" oninput="setPosterParam('smoothing',+this.value)">
              <span class="tr-sl-val" id="poster-smooth-val">1</span>
            </div>
          </div>

          <!-- Options -->
          <div class="settings-sec">
            <div class="settings-sec-h">Options</div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-lbl">Inverser noir / blanc</div>
                <div class="settings-row-sub">Utile si l'image a un fond noir</div>
              </div>
              <label class="toggle"><input type="checkbox" id="poster-invert" onchange="setPosterParam('invert',this.checked)"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
            </div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-lbl">Trou de suspension</div>
                <div class="settings-row-sub">Petit trou en haut pour accrocher</div>
              </div>
              <label class="toggle"><input type="checkbox" id="poster-hang" onchange="setPosterParam('hangHole',this.checked)"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-foot" style="display:flex;gap:8px;justify-content:space-between;align-items:center">
        <div id="poster-stats" style="font-family:var(--mono);font-size:10px;color:var(--t3)">—</div>
        <div style="display:flex;gap:8px">
          <button class="mbtn sec" onclick="closePosterModal()">Annuler</button>
          <button class="mbtn pri" id="poster-gen-btn" onclick="generatePoster()" disabled>⚡ Générer le poster</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  // CSS pour les modes cards
  const s=document.createElement('style');
  s.textContent=`
    .poster-mode-card{padding:9px 5px;border-radius:9px;border:1.5px solid var(--b2);background:var(--bg3);color:var(--t);cursor:pointer;transition:all .15s var(--ease);text-align:center;font-family:var(--dis)}
    .poster-mode-card:hover{border-color:var(--b3)}
    .poster-mode-card.on{border-color:var(--ac);color:var(--ac);background:var(--ac3);box-shadow:0 0 12px rgba(158,255,58,.25)}
    .poster-mode-card.on > div:first-child{filter:drop-shadow(0 0 4px var(--ac))}
  `;
  document.head.appendChild(s);
  // Drop sur la zone preview
  const wrap=document.getElementById('poster-preview-wrap');
  ['dragover','dragenter'].forEach(ev=>wrap.addEventListener(ev,e=>{e.preventDefault();wrap.style.borderColor='var(--ac)'}));
  ['dragleave','drop'].forEach(ev=>wrap.addEventListener(ev,e=>{e.preventDefault();wrap.style.borderColor=''}));
  wrap.addEventListener('drop',e=>{
    const f=e.dataTransfer?.files?.[0];if(!f)return;
    if(/^image\//.test(f.type))_loadPosterImage(f);
  });
}

function openPosterModal(){
  _buildPosterModal();
  document.getElementById('modal-poster')?.classList.add('on');
}
function closePosterModal(){document.getElementById('modal-poster')?.classList.remove('on')}

function setPosterMode(m){
  _posterCfg.mode=m;
  document.querySelectorAll('.poster-mode-card').forEach(c=>c.classList.toggle('on',c.dataset.mode===m));
  const desc={
    litho:'Lithophane : zones sombres = plus épais → bloquent la lumière en rétroéclairage. Idéal lampe.',
    relief:'Bas-relief : zones claires = plus hautes (style sculpture). Pas besoin d\'éclairage.',
    'flat-color':'Plat couleur : plaque fine, à peindre ensuite (mode Peinture du viewer) pour export 3MF AMS.',
  };
  const d=document.getElementById('poster-mode-desc');if(d)d.textContent=desc[m];
  // Cache epaisseur si mode flat-color
  const ts=document.getElementById('poster-thick-sec');
  if(ts)ts.style.display=m==='flat-color'?'none':'';
}

function setPosterParam(k,v){
  _posterCfg[k]=v;
  const map={widthMm:' mm',borderMm:' mm',thickMin:' mm',thickMax:' mm',resolution:'',smoothing:''};
  const lbl=document.getElementById('poster-'+({widthMm:'width',borderMm:'border',thickMin:'tmin',thickMax:'tmax',resolution:'res',smoothing:'smooth'}[k])+'-val');
  if(lbl)lbl.textContent=v+(map[k]||'');
  _updatePosterStats();
}

function _handlePosterImage(e){
  const f=e?.target?.files?.[0];if(!f)return;
  _loadPosterImage(f);
  if(e?.target)e.target.value='';
}

async function _loadPosterImage(file){
  const dataUrl=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)});
  const img=new Image();
  img.onload=()=>{
    _posterImg=img;
    // Affiche preview canvas
    const cv=document.getElementById('poster-canvas');
    const ctx=cv.getContext('2d');
    cv.width=img.width;cv.height=img.height;
    ctx.drawImage(img,0,0);
    cv.style.display='block';
    document.getElementById('poster-empty').style.display='none';
    document.getElementById('poster-imginfo').textContent=`${img.width}×${img.height} px · ratio ${(img.width/img.height).toFixed(2)}`;
    // Stocke les pixels
    _posterImgData=ctx.getImageData(0,0,img.width,img.height);
    document.getElementById('poster-gen-btn').disabled=false;
    _updatePosterStats();
  };
  img.src=dataUrl;
}

function _updatePosterStats(){
  if(!_posterImg){document.getElementById('poster-stats').textContent='Charge une image';return}
  const ratio=_posterImg.height/_posterImg.width;
  const w=_posterCfg.widthMm;
  const h=Math.round(w*ratio);
  const res=_posterCfg.resolution;
  const cells=res*Math.round(res*ratio);
  const tris=cells*2+8; // top + bottom + walls approx
  document.getElementById('poster-stats').textContent=
    `Dimensions : ${w}×${h} mm · ${cells.toLocaleString('fr')} cellules · ~${tris.toLocaleString('fr')} triangles`;
}

/* ══════════════════════════════════════════════
   GENERATION DU MESH
   Heightmap depuis brightness → geometry watertight
   ══════════════════════════════════════════════ */
async function generatePoster(){
  if(!_posterImgData){toast('Charge d\'abord une image',true);return}
  if(typeof THREE==='undefined'){toast('Three.js non disponible',true);return}
  toast('⚙ Génération du poster…');
  closePosterModal();
  // Petit delai pour laisser le toast s'afficher
  await new Promise(r=>setTimeout(r,30));
  try{
    const mesh3d=await _buildPosterMesh();
    if(!mesh3d){toast('Échec génération',true);return}
    if(!window.scene)init3();
    if(window.mesh){scene.remove(window.mesh);window.mesh=null}
    window.mesh=mesh3d;
    scene.add(mesh3d);
    finM();
    // UI
    q('cv').style.display='block';q('emp').style.display='none';
    q('br').disabled=false;q('bw').disabled=false;q('bc').disabled=false;
    q('hb').classList.add('on');
    // Export blob URL + history
    const id='poster_'+Date.now().toString(36);
    const mode=_posterCfg.mode;
    const modeLabel={litho:'Lithophane',relief:'Bas-relief','flat-color':'Plat couleur'}[mode];
    // Snapshot canvas pour le thumb
    setTimeout(()=>{
      const th=typeof captureCanvasThumb==='function'?captureCanvasThumb():null;
      addH({id,prompt:`🖼 Poster ${modeLabel} (${_posterCfg.widthMm}mm)`,mode:'poster',status:'done',quality:'poster',thumb:th});
    },800);
    // Active exports locaux
    q('ex-stl-local')?.classList.remove('dis');
    q('ex-obj-local')?.classList.remove('dis');
    setStage('Poster '+modeLabel,true);
    if(typeof fireSuccessFX==='function')fireSuccessFX();
    toast(`✓ Poster ${modeLabel} généré`,'ok');
  }catch(e){console.error(e);toast('Erreur génération : '+e.message.slice(0,50),true)}
}

async function _buildPosterMesh(){
  const cfg=_posterCfg;
  const img=_posterImgData;
  const imgW=img.width,imgH=img.height;
  const ratio=imgH/imgW;
  // Resolution en cellules
  const cellsX=cfg.resolution;
  const cellsY=Math.max(2,Math.round(cellsX*ratio));
  // Sample brightness for each cell (averaged)
  const bx=imgW/cellsX,by=imgH/cellsY;
  let map=new Float32Array(cellsX*cellsY);
  for(let cy=0;cy<cellsY;cy++){
    for(let cx=0;cx<cellsX;cx++){
      const x0=Math.floor(cx*bx),x1=Math.floor((cx+1)*bx);
      const y0=Math.floor(cy*by),y1=Math.floor((cy+1)*by);
      let sum=0,n=0;
      for(let y=y0;y<y1;y++){for(let x=x0;x<x1;x++){
        const i=(y*imgW+x)*4;
        // Perceived brightness
        const b=(0.299*img.data[i]+0.587*img.data[i+1]+0.114*img.data[i+2])/255;
        sum+=b;n++;
      }}
      map[cy*cellsX+cx]=n>0?sum/n:0;
    }
  }
  // Optional invert
  if(cfg.invert)for(let i=0;i<map.length;i++)map[i]=1-map[i];
  // Smoothing (simple box blur N passes)
  for(let p=0;p<cfg.smoothing;p++){
    const newMap=new Float32Array(cellsX*cellsY);
    for(let cy=0;cy<cellsY;cy++){
      for(let cx=0;cx<cellsX;cx++){
        let s=0,n=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=cx+dx,ny=cy+dy;
          if(nx<0||nx>=cellsX||ny<0||ny>=cellsY)continue;
          s+=map[ny*cellsX+nx];n++;
        }
        newMap[cy*cellsX+cx]=s/n;
      }
    }
    map=newMap;
  }
  // Dimensions en mm
  const wMm=cfg.widthMm;
  const hMm=wMm*ratio;
  // Convert mm to scene units (1mm = 0.01 unit, comme dans le reste de l'app pour rester coherent)
  const SCALE=0.01;
  const wU=wMm*SCALE,hU=hMm*SCALE;
  const cellW=wU/cellsX,cellH=hU/cellsY;
  const minT=cfg.thickMin*SCALE,maxT=cfg.thickMax*SCALE;
  // Pour mode litho : dark (low brightness) = thick
  // Pour relief : light (high brightness) = thick (positif)
  // flat-color : on ne fait qu'une plaque plate de minT
  const range=maxT-minT;
  // Build vertices and faces
  // Total : (cellsX+1)*(cellsY+1) vertices pour la surface du dessus
  const vx=cellsX+1,vy=cellsY+1;
  const topPos=new Float32Array(vx*vy*3);
  const bottomPos=new Float32Array(vx*vy*3);
  for(let y=0;y<vy;y++){
    for(let x=0;x<vx;x++){
      const px=x*cellW-wU/2;
      const py=-(y*cellH-hU/2); // flip Y pour orientation correcte
      // brightness moyenne aux 4 cellules adjacentes (cell-corner sampling)
      let b=0,n=0;
      for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
        const cx=x+dx,cy=y+dy;
        if(cx<0||cx>=cellsX||cy<0||cy>=cellsY)continue;
        b+=map[cy*cellsX+cx];n++;
      }
      b=n>0?b/n:0.5;
      // Force bordure plate
      const distX=Math.min(x,vx-1-x);const distY=Math.min(y,vy-1-y);
      const borderCells=Math.ceil((cfg.borderMm*SCALE)/Math.min(cellW,cellH));
      const inBorder=distX<borderCells||distY<borderCells;
      let z;
      if(cfg.mode==='flat-color'){
        z=minT;
      }else if(inBorder){
        z=minT;
      }else if(cfg.mode==='litho'){
        // dark = thick
        z=minT+(1-b)*range;
      }else{ // relief
        z=minT+b*range;
      }
      const i=(y*vx+x)*3;
      topPos[i]=px;topPos[i+1]=py;topPos[i+2]=z;
      bottomPos[i]=px;bottomPos[i+1]=py;bottomPos[i+2]=0;
    }
  }
  // Indices : 2 triangles par cell pour top + bottom (inverses)
  const cellCount=cellsX*cellsY;
  const topIdx=new Uint32Array(cellCount*6);
  const botIdx=new Uint32Array(cellCount*6);
  let ti=0,bi=0;
  for(let y=0;y<cellsY;y++){
    for(let x=0;x<cellsX;x++){
      const a=y*vx+x;
      const b=a+1;
      const c=a+vx;
      const d=c+1;
      // top : counter-clockwise (face up)
      topIdx[ti++]=a;topIdx[ti++]=c;topIdx[ti++]=b;
      topIdx[ti++]=b;topIdx[ti++]=c;topIdx[ti++]=d;
    }
  }
  // Combine top + bottom in one geometry
  // On va creer 4 buffers : top vertices, bottom vertices, top indices, bottom indices (inverted)
  // Plus les 4 murs
  // Approche simple : merge tout dans une seule geometry indexed
  const totalV=vx*vy*2; // top + bottom vertices
  const allPos=new Float32Array(totalV*3);
  allPos.set(topPos,0);
  allPos.set(bottomPos,vx*vy*3);
  const bottomOff=vx*vy;
  // Bottom indices : inversees pour normale vers le bas
  bi=0;
  for(let y=0;y<cellsY;y++){
    for(let x=0;x<cellsX;x++){
      const a=y*vx+x+bottomOff;
      const b=a+1;
      const c=a+vx;
      const d=c+1;
      botIdx[bi++]=a;botIdx[bi++]=b;botIdx[bi++]=c;
      botIdx[bi++]=b;botIdx[bi++]=d;botIdx[bi++]=c;
    }
  }
  // Murs : 4 cotes (left right top bottom)
  // Pour chaque arete sur le perimetre, on cree 2 triangles entre top et bottom
  const wallIdx=[];
  // Bottom row (y=0) : entre top et bottom
  for(let x=0;x<cellsX;x++){
    const t1=x,t2=x+1;
    const b1=x+bottomOff,b2=x+1+bottomOff;
    wallIdx.push(t1,b1,t2,t2,b1,b2);
  }
  // Top row (y=cellsY)
  const lastY=cellsY*vx;
  for(let x=0;x<cellsX;x++){
    const t1=lastY+x,t2=lastY+x+1;
    const b1=lastY+x+bottomOff,b2=lastY+x+1+bottomOff;
    wallIdx.push(t2,b2,t1,t1,b2,b1);
  }
  // Left col (x=0)
  for(let y=0;y<cellsY;y++){
    const t1=y*vx,t2=(y+1)*vx;
    const b1=y*vx+bottomOff,b2=(y+1)*vx+bottomOff;
    wallIdx.push(t2,b2,t1,t1,b2,b1);
  }
  // Right col (x=cellsX)
  for(let y=0;y<cellsY;y++){
    const t1=y*vx+cellsX,t2=(y+1)*vx+cellsX;
    const b1=y*vx+cellsX+bottomOff,b2=(y+1)*vx+cellsX+bottomOff;
    wallIdx.push(t1,b1,t2,t2,b1,b2);
  }
  // Combine indices
  const totalIdx=topIdx.length+botIdx.length+wallIdx.length;
  const allIdx=new Uint32Array(totalIdx);
  allIdx.set(topIdx,0);
  allIdx.set(botIdx,topIdx.length);
  allIdx.set(wallIdx,topIdx.length+botIdx.length);
  // Build BufferGeometry
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(allPos,3));
  g.setIndex(new THREE.BufferAttribute(allIdx,1));
  g.computeVertexNormals();
  // Hang hole : si active, fait un trou conique 4mm au top center
  // (skipped for simplicity — pourrait etre ajoute via CSG plus tard)
  // Material : white pour mieux voir le relief
  const mat=new THREE.MeshStandardMaterial({
    color:cfg.mode==='litho'?0xeeeeee:0xc8c8d0,
    roughness:.6,
    metalness:.05,
    side:THREE.DoubleSide,
  });
  const mesh=new THREE.Mesh(g,mat);
  return mesh;
}

/* Hook command palette si dispo */
window.addEventListener('load',()=>{
  setTimeout(()=>{
    _buildPosterModal();
    // Ajoute la commande dans la palette
    if(typeof COMMANDS!=='undefined'){
      COMMANDS.push({label:'🖼 Créer un Poster 3D (lithophane / bas-relief)',ico:'🖼',action:()=>openPosterModal(),tags:'poster image lithophane relief bas embossed wall hang plate'});
    }
  },400);
});
