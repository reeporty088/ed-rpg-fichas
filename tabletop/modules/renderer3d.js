// Renderizador 3D — Three.js r128, standees 2.5D com billboarding
// THREE e THREE.OrbitControls carregados como globais via <script>

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96"><rect width="64" height="96" fill="%23330a10"/><text x="32" y="52" text-anchor="middle" fill="%23ff8ca0" font-size="14" font-family="serif">?</text></svg>';

export class Renderer3D {
  constructor(containerEl) {
    this.container = containerEl;
    this.gridSize  = 1.2;           // unidades Three.js por célula

    this.scene    = null;
    this.camera   = null;
    this.renderer = null;
    this.controls = null;

    this._tokenMeshes = {};         // { [id]: { frente, verso, grupo } }
    this._mapaPlanes  = {};         // { [mapaId]: THREE.Mesh }
    this._itemMeshes  = {};         // { [id]: { grupo, frente?, verso?, plano? } }
    this._activeIndicators = {};
    this._gridHelper  = null;
    this._texLoader   = new THREE.TextureLoader();
    this._texCache    = {};
    this._ativo       = false;
    this._animId      = null;

    // Estado de drag
    this._dragPlane   = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    this._raycaster   = new THREE.Raycaster();
    this._mouse       = new THREE.Vector2();
    this._dragToken   = null;
    this._dragMapa    = null;
    this._clickPos    = null;
    this._dragging    = false;

    // Régua
    this._rulerMode   = false;
    this._rulerLine   = null;
    this._rulerLabel  = null;
    this._rulerDrag   = false;

    // Flags
    this._snapGrid    = true;
    this._mapaDragMode = false;

    // Callbacks
    this.onTokenClick  = null;
    this.onTokenDblClick = null;
    this.onTokenMoved  = null;
    this.onMapClick    = null;
    this.onMapaMoved   = null;
    this.onItemMoved   = null;
    this.onRulerDown   = null;
    this.onRulerMove   = null;
    this.onRulerUp     = null;
    this.onRulerClick  = null;
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  init() {
    const w = this.container.clientWidth  || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 60, 120);

    this.camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 200);
    this.camera.position.set(0, 18, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xfff0f0, 0.7));
    const dir = new THREE.DirectionalLight(0xffeeff, 1.0);
    dir.position.set(10, 20, 10); dir.castShadow = true;
    this.scene.add(dir);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

    this._gridHelper = new THREE.GridHelper(200, 200, 0x330a1a, 0x220a12);
    this.scene.add(this._gridHelper);

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', e => this._onMove(e));
    el.addEventListener('pointerdown', e => this._onDown(e));
    el.addEventListener('pointerup',   e => this._onUp(e));
    el.addEventListener('dblclick',    e => this._onDbl(e));
    el.addEventListener('touchstart',  e => this._onTouchStart(e), { passive: false });
    el.addEventListener('touchend',    () => clearTimeout(this._touchTimer));
    window.addEventListener('resize', () => this._onResize());

    this._ativo = true;
    this._loop();
  }

  dispose() {
    this._ativo = false;
    if (this._animId) cancelAnimationFrame(this._animId);
    if (this.renderer) { this.container.removeChild(this.renderer.domElement); this.renderer.dispose(); }
  }

  _loop() {
    if (!this._ativo) return;
    this._animId = requestAnimationFrame(() => this._loop());
    this.controls?.update();

    // Billboarding: tokens e itens standee virados para a câmera
    const q = this.camera.quaternion;
    Object.values(this._tokenMeshes).forEach(({ frente, verso }) => {
      frente?.quaternion.copy(q); verso?.quaternion.copy(q);
    });
    Object.values(this._itemMeshes).forEach(({ frente, verso }) => {
      frente?.quaternion.copy(q); verso?.quaternion.copy(q);
    });

    // Pulso nos anéis de iniciativa
    const t = Date.now() / 600;
    Object.values(this._activeIndicators).forEach(a => { a.material.opacity = 0.5 + 0.5 * Math.sin(t); });

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Mapas na cena ────────────────────────────────────────────────────────────

  upsertMapaItem(m) {
    const { id, imageUrl, posX = 0, posY = 0, escalaX = 1, escalaY = 1 } = m;
    const gs = this.gridSize;
    const w  = 20 * gs * escalaX, h = 20 * gs * escalaY;  // tamanho base 20 células

    if (this._mapaPlanes[id]) {
      const mesh = this._mapaPlanes[id];
      mesh.position.set(posX * gs + w/2, -0.01, posY * gs + h/2);
      mesh.scale.set(escalaX, 1, escalaY);
      if (imageUrl && mesh.material.map?.image?.src !== imageUrl) {
        mesh.material.map = this._tex(imageUrl);
        mesh.material.needsUpdate = true;
      }
      return;
    }

    const geo = new THREE.PlaneGeometry(w, h);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0x1a0a0a });
    if (imageUrl) { mat.map = this._tex(imageUrl); mat.needsUpdate = true; }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX * gs + w/2, -0.01, posY * gs + h/2);
    mesh.receiveShadow = true;
    mesh.userData.mapaId = id;
    this.scene.add(mesh);
    this._mapaPlanes[id] = mesh;
  }

  removeMapaItem(id) {
    if (!this._mapaPlanes[id]) return;
    this.scene.remove(this._mapaPlanes[id]);
    delete this._mapaPlanes[id];
  }

  setGridVisible(v) { if (this._gridHelper) this._gridHelper.visible = v; }
  setMapaDragMode(v) { this._mapaDragMode = v; }

  // ── Tokens ───────────────────────────────────────────────────────────────────

  upsertToken(t) {
    const { id, posX, posY, escala, variacaoAtiva, variacoes, bloqueado } = t;
    const v = variacoes?.[variacaoAtiva || 0] || {};
    const gs = this.gridSize;
    const h  = (escala || 1.133) * gs;
    const w  = h * 0.6;

    if (this._tokenMeshes[id]) {
      const { grupo, frente, verso } = this._tokenMeshes[id];
      grupo.position.set(posX * gs, h/2, posY * gs);
      frente.material.map = this._tex(v.img3d_frente); frente.material.needsUpdate = true;
      verso.material.map  = this._tex(v.img3d_verso || v.img3d_frente); verso.material.needsUpdate = true;
      [frente, verso].forEach(m => { m.material.opacity = bloqueado ? 0.6 : 1; });
      return;
    }

    const geo  = new THREE.PlaneGeometry(w, h);
    const mF   = new THREE.MeshBasicMaterial({ map: this._tex(v.img3d_frente), transparent: true, side: THREE.FrontSide, alphaTest: 0.1 });
    const mV   = new THREE.MeshBasicMaterial({ map: this._tex(v.img3d_verso || v.img3d_frente), transparent: true, side: THREE.BackSide, alphaTest: 0.1 });
    const meshF = new THREE.Mesh(geo, mF), meshV = new THREE.Mesh(geo, mV);

    const grupo = new THREE.Group();
    grupo.add(meshF, meshV);
    grupo.position.set(posX * gs, h/2, posY * gs);
    grupo.userData.tokenId = id;
    this.scene.add(grupo);
    this._tokenMeshes[id] = { frente: meshF, verso: meshV, grupo };
  }

  removeToken(id) {
    if (!this._tokenMeshes[id]) return;
    this.scene.remove(this._tokenMeshes[id].grupo);
    delete this._tokenMeshes[id];
    this.removeActiveIndicator(id);
  }

  // ── Itens de cenário ──────────────────────────────────────────────────────────

  upsertItem(item) {
    const { id, posX = 0, posY = 0, escala = 0.667, tipo = '2.5d', texturas = [] } = item;
    const url = texturas[0]?.url || '';
    const gs  = this.gridSize;

    if (this._itemMeshes[id]) {
      const { grupo } = this._itemMeshes[id];
      const h = (escala || 0.667) * gs;
      grupo.position.set(posX * gs, tipo === '2d_chao' ? 0 : h/2, posY * gs);
      return;
    }

    const grupo = new THREE.Group();
    grupo.userData.itemId = id;
    grupo.position.set(posX * gs, 0, posY * gs);

    if (tipo === '2d_chao') {
      // Plano horizontal no chão
      const sz  = (escala || 0.667) * gs;
      const geo = new THREE.PlaneGeometry(sz, sz);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ map: this._tex(url), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
      grupo.add(new THREE.Mesh(geo, mat));
      this._itemMeshes[id] = { grupo };
    } else {
      // Standee 2.5D
      const h  = (escala || 0.667) * gs;
      const w  = h * 0.6;
      const geo = new THREE.PlaneGeometry(w, h);
      const mF  = new THREE.MeshBasicMaterial({ map: this._tex(url), transparent: true, side: THREE.FrontSide, alphaTest: 0.1 });
      const mV  = new THREE.MeshBasicMaterial({ map: this._tex(url), transparent: true, side: THREE.BackSide,  alphaTest: 0.1 });
      const meshF = new THREE.Mesh(geo, mF), meshV = new THREE.Mesh(geo, mV);
      grupo.add(meshF, meshV);
      grupo.position.y = h/2;
      this._itemMeshes[id] = { grupo, frente: meshF, verso: meshV };
    }

    this.scene.add(grupo);
  }

  removeItem(id) {
    if (!this._itemMeshes[id]) return;
    this.scene.remove(this._itemMeshes[id].grupo);
    delete this._itemMeshes[id];
  }

  // ── Régua ────────────────────────────────────────────────────────────────────

  setRulerMode(v) {
    this._rulerMode = v;
    if (!v) this.clearRuler();
  }

  setRuler(inicio, fim, metros) {
    this.clearRuler();
    const gs = this.gridSize;
    const pts = [
      new THREE.Vector3(inicio.x * gs, 0.1, inicio.y * gs),
      new THREE.Vector3(fim.x    * gs, 0.1, fim.y    * gs),
    ];
    const geo  = new THREE.BufferGeometry().setFromPoints(pts);
    const mat  = new THREE.LineDashedMaterial({ color: 0xffdd44, dashSize: 0.3, gapSize: 0.2, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    this.scene.add(line);
    this._rulerLine = line;

    // Label de distância como sprite canvas
    const meio = new THREE.Vector3(
      (inicio.x + fim.x) / 2 * gs, 0.5,
      (inicio.y + fim.y) / 2 * gs
    );
    this._rulerLabel = this._criarLabelSprite(`${metros}m`, meio);
  }

  clearRuler() {
    if (this._rulerLine)  { this.scene.remove(this._rulerLine);  this._rulerLine  = null; }
    if (this._rulerLabel) { this.scene.remove(this._rulerLabel); this._rulerLabel = null; }
  }

  _criarLabelSprite(texto, posicao) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 128, 40);
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 18px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(texto, 64, 27);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sp  = new THREE.Sprite(mat);
    sp.scale.set(1.5, 0.5, 1);
    sp.position.copy(posicao);
    this.scene.add(sp);
    return sp;
  }

  // ── Indicador de turno ────────────────────────────────────────────────────────

  setActiveIndicator(tokenId, ativo) {
    this.removeActiveIndicator(tokenId);
    if (!ativo || !this._tokenMeshes[tokenId]) return;
    const r  = this.gridSize * 0.55;
    const geo = new THREE.RingGeometry(r, r + 0.08, 32);
    geo.rotateX(-Math.PI / 2);
    const mat  = new THREE.MeshBasicMaterial({ color: 0xff8ca0, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const anel = new THREE.Mesh(geo, mat);
    const pos  = this._tokenMeshes[tokenId].grupo.position;
    anel.position.set(pos.x, 0.05, pos.z);
    this.scene.add(anel);
    this._activeIndicators[tokenId] = anel;
  }

  removeActiveIndicator(id) {
    if (!this._activeIndicators[id]) return;
    this.scene.remove(this._activeIndicators[id]);
    delete this._activeIndicators[id];
  }

  // ── Textura com fallback ──────────────────────────────────────────────────────

  _tex(url) {
    const u = url || PH;
    if (this._texCache[u]) return this._texCache[u];
    const t = this._texLoader.load(u, undefined, undefined, () => {
      this._texCache[u] = this._texLoader.load(PH);
    });
    this._texCache[u] = t;
    return t;
  }

  // ── Eventos ──────────────────────────────────────────────────────────────────

  _worldPos(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const pt = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(this._dragPlane, pt);
    return pt;
  }

  _cellPos(event) {
    const pt = this._worldPos(event);
    if (!pt) return null;
    return { x: pt.x / this.gridSize, y: pt.z / this.gridSize };
  }

  _hitTokenId(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const grupos = Object.values(this._tokenMeshes).map(m => m.grupo);
    const hits   = this._raycaster.intersectObjects(grupos, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.tokenId) obj = obj.parent;
    return obj?.userData.tokenId || null;
  }

  _hitMapaId(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = Object.entries(this._mapaPlanes).map(([id, m]) => ({ id, m }));
    for (const { id, m } of meshes) {
      if (this._raycaster.intersectObject(m).length) return id;
    }
    return null;
  }

  _onDown(e) {
    if (e.button !== 0) return;
    this._clickPos  = { x: e.clientX, y: e.clientY };
    this._dragging  = false;

    if (this._rulerMode) {
      const c = this._cellPos(e);
      if (c) this.onRulerDown?.(c.x, c.y);
      this._rulerDrag = true;
      this.controls.enabled = false;
      return;
    }

    if (this._mapaDragMode) {
      const mid = this._hitMapaId(e);
      if (mid && !this._mapaPlanes[mid]?.userData?.bloqueado) {
        this._dragMapa = mid;
        this.controls.enabled = false;
      }
      return;
    }

    const tid = this._hitTokenId(e);
    if (tid) {
      this._dragToken = tid;
      this.controls.enabled = false;
    }
  }

  _onMove(e) {
    if (this._rulerMode && this._rulerDrag) {
      const c = this._cellPos(e);
      if (c) this.onRulerMove?.(c.x, c.y);
      return;
    }

    if (this._dragMapa) {
      const pt = this._worldPos(e);
      if (!pt) return;
      this._dragging = true;
      const mesh = this._mapaPlanes[this._dragMapa];
      if (mesh) { mesh.position.x = pt.x; mesh.position.z = pt.z; }
      return;
    }

    if (!this._dragToken) return;
    const dx = Math.abs(e.clientX - this._clickPos.x), dy = Math.abs(e.clientY - this._clickPos.y);
    if (dx < 3 && dy < 3) return;
    this._dragging = true;

    const pt = this._worldPos(e);
    if (!pt) return;
    let nx = pt.x / this.gridSize, ny = pt.z / this.gridSize;
    if (this._snapGrid) { nx = Math.round(nx); ny = Math.round(ny); }
    const { grupo } = this._tokenMeshes[this._dragToken] || {};
    if (grupo) {
      grupo.position.x = nx * this.gridSize;
      grupo.position.z = ny * this.gridSize;
      if (this._activeIndicators[this._dragToken]) {
        this._activeIndicators[this._dragToken].position.x = grupo.position.x;
        this._activeIndicators[this._dragToken].position.z = grupo.position.z;
      }
    }
  }

  _onUp(e) {
    this.controls.enabled = true;

    if (this._rulerMode && this._rulerDrag) {
      const c = this._cellPos(e);
      if (c) this.onRulerUp?.(c.x, c.y);
      this._rulerDrag = false;
      return;
    }

    if (this._dragMapa) {
      const pt = this._worldPos(e);
      if (pt && this._dragging) {
        const gs = this.gridSize;
        this.onMapaMoved?.(this._dragMapa, pt.x / gs, pt.z / gs);
      }
      this._dragMapa = null;
      this._dragging = false;
      return;
    }

    const tid = this._dragToken;
    this._dragToken = null;
    if (!tid) return;

    const dx = Math.abs(e.clientX - this._clickPos.x), dy = Math.abs(e.clientY - this._clickPos.y);
    if (dx < 5 && dy < 5) { this.onTokenClick?.(tid); return; }

    const pt = this._worldPos(e);
    if (!pt) return;
    let nx = pt.x / this.gridSize, ny = pt.z / this.gridSize;
    if (this._snapGrid) { nx = Math.round(nx); ny = Math.round(ny); }
    this.onTokenMoved?.(tid, nx, ny);
    this._dragging = false;
  }

  _onDbl(e) {
    if (this._rulerMode) return;
    if (e.altKey) {
      const pt = this._worldPos(e);
      if (pt) this.onMapClick?.(pt.x, pt.z, e.clientX, e.clientY);
      return;
    }
    const tid = this._hitTokenId(e);
    if (tid) this.onTokenDblClick?.(tid);
  }

  _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    this._touchTimer = setTimeout(() => {
      const t = e.touches[0];
      this.onMapClick?.(0, 0, t.clientX, t.clientY);
    }, 800);
  }

  tokenParaTela(tokenId) {
    if (!this._tokenMeshes[tokenId]) return null;
    const pos = this._tokenMeshes[tokenId].grupo.position.clone().project(this.camera);
    return { x: (pos.x + 1) / 2 * this.container.clientWidth, y: -(pos.y - 1) / 2 * this.container.clientHeight };
  }

  getCamera()   { return this.camera; }
  getControls() { return this.controls; }
  getRenderer() { return this.renderer; }
}
