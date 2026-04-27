// Renderizador 3D com Three.js r128 — standees 2.5D com billboarding
// THREE e THREE.OrbitControls são carregados como globais via <script> no HTML

const PLACEHOLDER_URL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 64 96"><rect width="64" height="96" fill="%23330a10"/><text x="32" y="52" text-anchor="middle" fill="%23ff8ca0" font-size="12" font-family="serif">?</text></svg>';

export class Renderer3D {
  constructor(containerEl) {
    this.container = containerEl;
    this.scene      = null;
    this.camera     = null;
    this.renderer   = null;
    this.controls   = null;
    this.gridSize   = 1.2;         // unidades Three.js por célula
    this._tokenMeshes = {};        // { [tokenId]: { frente, verso, grupo } }
    this._mapaPlane   = null;
    this._gridHelper  = null;
    this._texLoader   = new THREE.TextureLoader();
    this._texCache    = {};
    this._ativo       = false;
    this._animId      = null;
    this._activeIndicators = {};   // { [tokenId]: mesh de anel de iniciativa }
    this.onTokenClick  = null;     // callback(tokenId)
    this.onTokenDblClick = null;   // callback(tokenId)
    this.onMapClick    = null;     // callback(worldX, worldZ) para pings
    this._raycaster    = new THREE.Raycaster();
    this._mouse        = new THREE.Vector2();
    this._clickPos     = null;
    this._dragToken    = null;
    this._dragPlane    = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._dragOffset   = new THREE.Vector3();
    this._snapGrid     = true;
    this.onTokenMoved  = null;     // callback(tokenId, col, linha)
  }

  // ── Inicialização ──────────────────────────────────────────────────────────

  init() {
    const w = this.container.clientWidth  || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 60, 120);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.set(0, 18, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Iluminação
    const amb = new THREE.AmbientLight(0xfff0f0, 0.7);
    const dir = new THREE.DirectionalLight(0xffeeff, 1);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    this.scene.add(amb, dir);

    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

    // Grid de referência (substituído por gridHelper sobre o mapa)
    this._gridHelper = new THREE.GridHelper(100, 100, 0x330a1a, 0x220a12);
    this.scene.add(this._gridHelper);

    // Eventos
    this.renderer.domElement.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.renderer.domElement.addEventListener('pointerup',   this._onPointerUp.bind(this));
    this.renderer.domElement.addEventListener('dblclick',    this._onDblClick.bind(this));

    // Touch
    this.renderer.domElement.addEventListener('touchstart',  this._onTouchStart.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchend',    this._onTouchEnd.bind(this),   { passive: false });

    window.addEventListener('resize', this._onResize.bind(this));

    this._ativo = true;
    this._animar();
  }

  dispose() {
    this._ativo = false;
    if (this._animId) cancelAnimationFrame(this._animId);
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    window.removeEventListener('resize', this._onResize.bind(this));
  }

  // ── Loop de animação ───────────────────────────────────────────────────────

  _animar() {
    if (!this._ativo) return;
    this._animId = requestAnimationFrame(() => this._animar());
    if (this.controls) this.controls.update();

    // Billboarding: standees sempre voltados para a câmera
    Object.values(this._tokenMeshes).forEach(({ frente, verso }) => {
      if (frente) frente.quaternion.copy(this.camera.quaternion);
      if (verso)  verso.quaternion.copy(this.camera.quaternion);
    });

    // Pulso nos anéis de iniciativa ativa
    const t = Date.now() / 600;
    Object.values(this._activeIndicators).forEach(anel => {
      anel.material.opacity = 0.5 + 0.5 * Math.sin(t);
    });

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Mapa ───────────────────────────────────────────────────────────────────

  setMapa(imageUrl, gridCols, gridRows) {
    if (this._mapaPlane) this.scene.remove(this._mapaPlane);

    this._mapaCols = gridCols;
    this._mapaRows = gridRows;
    const w = gridCols * this.gridSize;
    const h = gridRows * this.gridSize;

    const geo = new THREE.PlaneGeometry(w, h);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshLambertMaterial({ color: 0x1a0a0a });
    if (imageUrl) {
      const tex = this._carregarTextura(imageUrl);
      mat.map = tex;
      mat.needsUpdate = true;
    }
    this._mapaPlane = new THREE.Mesh(geo, mat);
    this._mapaPlane.position.set(w / 2, 0, h / 2);
    this._mapaPlane.receiveShadow = true;
    this.scene.add(this._mapaPlane);

    // Reposicionar grid
    if (this._gridHelper) this.scene.remove(this._gridHelper);
    this._gridHelper = new THREE.GridHelper(Math.max(w, h) * 2, Math.max(gridCols, gridRows) * 2, 0x550020, 0x330015);
    this._gridHelper.position.set(w / 2, 0.01, h / 2);
    this.scene.add(this._gridHelper);
  }

  setGridVisible(vis) {
    if (this._gridHelper) this._gridHelper.visible = vis;
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────

  // Cria ou atualiza standee de um token
  upsertToken(tokenData) {
    const { id, posX, posY, escala, variacaoAtiva, variacoes, bloqueado } = tokenData;
    const variacao = variacoes?.[variacaoAtiva || 0] || {};

    if (this._tokenMeshes[id]) {
      // Atualiza posição e textura
      const { grupo } = this._tokenMeshes[id];
      grupo.position.set(
        posX * this.gridSize,
        (escala || 1) * this.gridSize / 2,
        posY * this.gridSize
      );
      this._atualizarTexturaToken(id, variacao, escala);
    } else {
      this._criarStandee(tokenData, variacao);
    }

    // Ícone de cadeado
    // (simplificado: apenas muda opacidade do grupo)
    const mesh = this._tokenMeshes[id];
    if (mesh) {
      [mesh.frente, mesh.verso].forEach(m => {
        if (m) m.material.opacity = bloqueado ? 0.7 : 1;
      });
    }
  }

  _criarStandee(tokenData, variacao) {
    const { id, posX, posY, escala } = tokenData;
    const h = (escala || 1) * this.gridSize;
    const w = h * 0.6;

    const geo = new THREE.PlaneGeometry(w, h);
    const matFrente = new THREE.MeshBasicMaterial({
      map: this._carregarTextura(variacao.img3d_frente),
      transparent: true, side: THREE.FrontSide, alphaTest: 0.1
    });
    const matVerso = new THREE.MeshBasicMaterial({
      map: this._carregarTextura(variacao.img3d_verso || variacao.img3d_frente),
      transparent: true, side: THREE.BackSide, alphaTest: 0.1
    });

    const meshFrente = new THREE.Mesh(geo, matFrente);
    const meshVerso  = new THREE.Mesh(geo, matVerso);

    const grupo = new THREE.Group();
    grupo.add(meshFrente, meshVerso);
    grupo.position.set(posX * this.gridSize, h / 2, posY * this.gridSize);
    grupo.userData.tokenId = id;

    this.scene.add(grupo);
    this._tokenMeshes[id] = { frente: meshFrente, verso: meshVerso, grupo };
  }

  _atualizarTexturaToken(id, variacao, escala) {
    const { frente, verso } = this._tokenMeshes[id];
    if (frente) frente.material.map = this._carregarTextura(variacao.img3d_frente);
    if (verso)  verso.material.map  = this._carregarTextura(variacao.img3d_verso || variacao.img3d_frente);
    if (frente) frente.material.needsUpdate = true;
    if (verso)  verso.material.needsUpdate  = true;
  }

  removeToken(id) {
    if (!this._tokenMeshes[id]) return;
    this.scene.remove(this._tokenMeshes[id].grupo);
    delete this._tokenMeshes[id];
    this.removeActiveIndicator(id);
  }

  clearTokens() {
    Object.keys(this._tokenMeshes).forEach(id => this.removeToken(id));
  }

  // Anel de iniciativa ativa sobre o token
  setActiveIndicator(tokenId, ativo) {
    this.removeActiveIndicator(tokenId);
    if (!ativo || !this._tokenMeshes[tokenId]) return;
    const r = this.gridSize * 0.55;
    const geo = new THREE.RingGeometry(r, r + 0.08, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8ca0, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const anel = new THREE.Mesh(geo, mat);
    const { grupo } = this._tokenMeshes[tokenId];
    anel.position.set(grupo.position.x, 0.05, grupo.position.z);
    this.scene.add(anel);
    this._activeIndicators[tokenId] = anel;
  }

  removeActiveIndicator(tokenId) {
    if (this._activeIndicators[tokenId]) {
      this.scene.remove(this._activeIndicators[tokenId]);
      delete this._activeIndicators[tokenId];
    }
  }

  // ── Carregamento de textura com fallback ──────────────────────────────────

  _carregarTextura(url) {
    const u = url || PLACEHOLDER_URL;
    if (this._texCache[u]) return this._texCache[u];
    const tex = this._texLoader.load(u, undefined, undefined, () => {
      // Erro: usa placeholder
      if (this._texCache[u]) {
        this._texCache[u] = this._texLoader.load(PLACEHOLDER_URL);
      }
    });
    this._texCache[u] = tex;
    return tex;
  }

  // ── Eventos de mouse/touch ─────────────────────────────────────────────────

  _getTokenIdAt(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const grupos = Object.values(this._tokenMeshes).map(m => m.grupo);
    const hits = this._raycaster.intersectObjects(grupos, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.tokenId) obj = obj.parent;
    return obj?.userData.tokenId || null;
  }

  _onPointerDown(e) {
    if (e.button !== 0) return;
    const id = this._getTokenIdAt(e);
    this._clickPos = { x: e.clientX, y: e.clientY };
    if (id) {
      this._dragToken = id;
      this.controls.enabled = false;
    }
  }

  _onPointerMove(e) {
    if (!this._dragToken) return;
    const dx = e.clientX - this._clickPos.x;
    const dy = e.clientY - this._clickPos.y;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;

    // Projeta posição do mouse no plano Y=0 para mover token
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const pt = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(this._dragPlane, pt);
    if (!pt) return;

    let nx = pt.x / this.gridSize;
    let ny = pt.z / this.gridSize;
    if (this._snapGrid) {
      nx = Math.round(nx);
      ny = Math.round(ny);
    }
    if (this._tokenMeshes[this._dragToken]) {
      const { grupo } = this._tokenMeshes[this._dragToken];
      grupo.position.x = nx * this.gridSize;
      grupo.position.z = ny * this.gridSize;
      // Atualiza anel de iniciativa se existir
      if (this._activeIndicators[this._dragToken]) {
        this._activeIndicators[this._dragToken].position.x = grupo.position.x;
        this._activeIndicators[this._dragToken].position.z = grupo.position.z;
      }
    }
  }

  _onPointerUp(e) {
    this.controls.enabled = true;
    if (!this._dragToken) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const pt = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(this._dragPlane, pt);

    if (pt && this.onTokenMoved) {
      let nx = pt.x / this.gridSize;
      let ny = pt.z / this.gridSize;
      if (this._snapGrid) { nx = Math.round(nx); ny = Math.round(ny); }
      this.onTokenMoved(this._dragToken, nx, ny);
    }

    const dx = Math.abs(e.clientX - this._clickPos.x);
    const dy = Math.abs(e.clientY - this._clickPos.y);
    if (dx < 5 && dy < 5 && this.onTokenClick) {
      this.onTokenClick(this._dragToken);
    }

    this._dragToken = null;
  }

  _onDblClick(e) {
    // Alt+dblclick no mapa → ping
    if (e.altKey) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this._mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      this._mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      this._raycaster.setFromCamera(this._mouse, this.camera);
      const pt = new THREE.Vector3();
      this._raycaster.ray.intersectPlane(this._dragPlane, pt);
      if (pt && this.onMapClick) this.onMapClick(pt.x, pt.z, e.clientX, e.clientY);
      return;
    }
    const id = this._getTokenIdAt(e);
    if (id && this.onTokenDblClick) this.onTokenDblClick(id);
  }

  _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    this._touchTimer = setTimeout(() => {
      // Toque longo → ping
      const touch = e.touches[0];
      const id = this._getTokenIdAt(touch);
      if (!id && this.onMapClick) {
        this.onMapClick(0, 0, touch.clientX, touch.clientY); // posição aproximada
      }
    }, 800);
  }

  _onTouchEnd() {
    clearTimeout(this._touchTimer);
  }

  // Posição de tela de um token (para pings no overlay)
  tokenParaTela(tokenId) {
    if (!this._tokenMeshes[tokenId]) return null;
    const { grupo } = this._tokenMeshes[tokenId];
    const pos = grupo.position.clone();
    pos.project(this.camera);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return {
      x: (pos.x + 1) / 2 * w,
      y: -(pos.y - 1) / 2 * h
    };
  }

  getCamera()   { return this.camera; }
  getControls() { return this.controls; }
  getRenderer() { return this.renderer; }
}
