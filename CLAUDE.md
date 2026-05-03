# FORM — AI 3D Generator · Claude Code Context

## Projet
Application web de génération de modèles 3D via l'API Tripo3D, optimisée pour l'impression 3D avec la Bambu X2D.

## Stack
- **Frontend** : HTML/CSS/JS vanilla — fichier unique `index.html`
- **3D Viewer** : Three.js r128 (CDN)
- **API** : Tripo3D v3.1 (`api.tripo3d.ai`)
- **Proxy CORS** : Cloudflare Worker (`form-3d-proxy.antho14j.workers.dev`)
- **Hébergement** : GitHub Pages (`zatsu14.github.io/3D-printer-generator`)
- **Repo** : `github.com/Zatsu14/3D-printer-generator`

## Architecture
Tout le code est dans `index.html` (CSS + HTML + JS). Pas de build, pas de bundler.

### Proxy Cloudflare (`worker.js`)
Route toutes les requêtes vers `api.tripo3d.ai` pour contourner le CORS.
- `/proxy/task` → API Tripo
- `/proxy/upload/sts` → Upload images
- `/proxy/user/balance` → Solde crédits
- `/proxy/model?url=...` → Téléchargement GLB/STL

## Variables globales importantes
```js
const PROXY = 'https://form-3d-proxy.antho14j.workers.dev/proxy'
const HIST_KEY = 'form3d_hist_v2'  // localStorage
let mode = 'text' | 'image' | 'multiview' | 'hybrid'
let quality = 'turbo' | 'standard' | 'hd'
let styleVal = 'none' | 'object:clay' | 'gold' | 'ancient_bronze' | ...
let ppTaskId  // task_id du dernier modèle généré (pour post-processing)
let mUrls     // { glb, _taskId, thumb }
```

## Modèles Tripo disponibles
- `Turbo-v1.0-20250506` — ~15s, ~10 crédits
- `v3.1-20260211` — qualité standard/HD, 20-40 crédits
- `P1-20260311` — low-poly optimisé, topologie propre

## Fonctionnalités implémentées
- [x] Text to 3D / Image to 3D / Multiview to 3D / Hybride
- [x] Génération 4 vues auto depuis 1 image (`generate_multiview_image`)
- [x] Qualité : Turbo / Standard / HD (geometry_quality + texture_quality)
- [x] Styles : Clay, Steampunk, Gold, Bronze, Barbie, Venom, Cartoon
- [x] Options toggles : PBR, Autofix, Base plate, Auto-orient
- [x] Post-processing : Low-poly, Lego, Voxel, Voronoi, Segmentation, Rig+Animation, Re-texture
- [x] Export : GLB, STL, 3MF, FBX, OBJ (via convert_model)
- [x] Viewer 3D : rotation, pan (clic droit), zoom
- [x] Historique persistant (localStorage, 50 entrées)
- [x] Specs Bambu Studio avec copie
- [x] Filaments estimés
- [x] Solde crédits en temps réel

## Workflow de développement
1. Modifier `index.html` directement
2. `git add index.html && git commit -m "message" && git push`
3. GitHub Pages se met à jour automatiquement (~1min)
4. URL live : `https://zatsu14.github.io/3D-printer-generator`

Si `worker.js` est modifié, le déployer manuellement sur Cloudflare Dashboard.

## Conventions
- CSS en variables CSS (`--ac`, `--bg`, `--t2`…)
- Classes courtes pour le CSS (`lbl`, `sec`, `pp-btn`…)
- JS minifié/compact pour garder le fichier léger
- Pas de framework, pas de dépendances npm
- Tout commentaire en français

## Points d'attention
- Le proxy Cloudflare doit gérer les CORS — ne jamais appeler `api.tripo3d.ai` directement depuis le front
- Les URLs de modèles Tripo expirent après 60 secondes — toujours passer par `/proxy/model?url=`
- La clé API Tripo (`tsk_...`) est stockée en localStorage, jamais dans le code
- `ppTaskId` est mis à jour après chaque génération ET après chaque post-processing réussi
