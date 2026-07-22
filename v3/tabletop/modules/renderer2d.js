// Renderizador 2D top-down — Konva.js
// Konva carregado como global via <script>

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23330a10" rx="4"/><text x="32" y="36" text-anchor="middle" fill="%23ff8ca0" font-size="14" font-family="serif">?</text></svg>';

export class Renderer2D {
  constructor(containerEl) {
    this.container = containerEl;
    this.gridSize  = 60;   // px por célula

    this.stage  = null;
    this.layers = { mapa: null, grid: null, fog: null, tokens: null, ui: null };

    this._tokenNodes = {};    // { [id]: Konva.Group }
    this._mapaImages = {};    // { [id]: Konva.Image }
    this._itemNodes  = {};    // { [id]: Konva.Group }
    this._imgCache   = {};
    this._activeIndicators = {};
    this._rulerLine  = null;
    this._rulerText  = null;
    this._rulerMode  = false;
    this._rulerStartPos = null;
    this._mapaDragMode  = false;
    this._snapGrid   = true;
    this._radialMenu = null;
    this._longPress  = null;

    // Callbacks
    this.onTokenClick    = null;
    this.onTokenDblClick = null;
    this.onTokenMoved    = null;
    this.onMapClick      = null;
    this.onMapaMoved     = null;
    this.onItemMoved     = null;
    this.onVariacaoSelect = null;
    this.onRulerDown  = null;
    this.onRulerMove  = null;
    this.onRulerUp    = null;
    this.onRulerClick = null;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  init() {
    const w = this.container.clientWidth  || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.stage = new Konva.Stage({ container: this.container, width: w, height: h });

    this.layers.mapa   = new Konva.Layer();
    this.layers.grid   = new Konva.Layer();
    this.layers.fog    = new Konva.Layer();
    this.layers.tokens = new Konva.Layer();
    this.layers.ui     = new Konva.Layer();
    this.stage.add(this.layers.mapa, this.layers.grid, this.layers.fog, this.layers.tokens, this.layers.ui);

    // Régua: eventos no fundo do stage
    this.stage.on('mousedown', e => {
      if (this._rulerMode) {
        const pos = this._stagePos();
        if (pos) { this._rulerStartPos = pos; this.onRulerDown?.(pos.x / this.gridSize, pos.y / this.gridSize); }
        return;
      }
      // Ping: Alt+click no fundo
    });
    this.stage.on('mousemove', () => {
      if (!this._rulerMode || !this._rulerStartPos) return;
      const pos = this._stagePos();
      if (pos) this.onRulerMove?.(pos.x / this.gridSize, pos.y / this.gridSize);
    });
    this.stage.on('mouseup', () => {
      if (this._rulerMode && this._rulerStartPos) {
        const pos = this._stagePos();
        if (pos) this.onRulerUp?.(pos.x / this.gridSize, pos.y / this.gridSize);
        this._rulerStartPos = null;
      }
    });
    this.stage.on('click', e => {
      if (this._rulerMode && e.target === this.stage) this.onRulerClick?.();
    });

    // Alt+dblclick → ping
    this.stage.on('dblclick', e => {
      if (!e.evt.altKey || e.target !== this.stage) return;
      const pos = this.stage.getPointerPosition();
      if (!pos) return;
      const world = this._pxToWorld(pos.x, pos.y);
      this.onMapClick?.(world.x, world.y, pos.x, pos.y);
    });

    // Long press touch → ping
    this.stage.on('touchstart', e => {
      if (e.target !== this.stage) return;
      this._longPress = setTimeout(() => {
        const pos = this.stage.getPointerPosition();
        if (!pos) return;
        const world = this._pxToWorld(pos.x, pos.y);
        this.onMapClick?.(world.x, world.y, pos.x, pos.y);
      }, 800);
    });
    this.stage.on('touchend touchmove', () => clearTimeout(this._longPress));

    window.addEventListener('resize', () => {
      this.stage.width(this.container.clientWidth);
      this.stage.height(this.container.clientHeight);
    });
  }

  dispose() { this.stage?.destroy(); }

  // ── Mapas ─────────────────────────────────────────────────────────────────

  upsertMapaItem(m) {
    const { id, imageUrl, posX = 0, posY = 0, escalaX = 1, escalaY = 1 } = m;
    const gs = this.gridSize;
    const w  = 20 * gs * escalaX, h = 20 * gs * escalaY;

    if (this._mapaImages[id]) {
      const img = this._mapaImages[id];
      img.x(posX * gs); img.y(posY * gs);
      img.width(w); img.height(h);
      this.layers.mapa.draw();
      return;
    }

    this._loadImg(imageUrl || PH, imgEl => {
      const img = new Konva.Image({
        image: imgEl, x: posX * gs, y: posY * gs, width: w, height: h,
        draggable: this._mapaDragMode,
      });
      img.setAttr('mapaId', id);

      img.on('dragend', () => {
        const nx = img.x() / gs, ny = img.y() / gs;
        this.onMapaMoved?.(id, nx, ny);
      });

      this.layers.mapa.add(img);
      this.layers.mapa.draw();
      this._mapaImages[id] = img;
    });
  }

  removeMapaItem(id) {
    if (!this._mapaImages[id]) return;
    this._mapaImages[id].destroy();
    delete this._mapaImages[id];
    this.layers.mapa.draw();
  }

  setGridVisible(v) { this.layers.grid.visible(v); this.layers.grid.draw(); }

  setMapaDragMode(v) {
    this._mapaDragMode = v;
    Object.values(this._mapaImages).forEach(img => img.draggable(v));
    this.layers.mapa.draw();
  }

  // Grid
  renderGrid(cols, rows) {
    this.layers.grid.destroyChildren();
    const w = cols * this.gridSize, h = rows * this.gridSize, cor = '#330015';
    for (let c = 0; c <= cols; c++)
      this.layers.grid.add(new Konva.Line({ points: [c * this.gridSize, 0, c * this.gridSize, h], stroke: cor, strokeWidth: 0.5, opacity: 0.6 }));
    for (let r = 0; r <= rows; r++)
      this.layers.grid.add(new Konva.Line({ points: [0, r * this.gridSize, w, r * this.gridSize], stroke: cor, strokeWidth: 0.5, opacity: 0.6 }));
    this.layers.grid.draw();
  }

  // Fog canvas como textura Konva
  setFogCanvas(fogCanvas) {
    this.layers.fog.destroyChildren();
    const gs = this.gridSize;
    const img = new Konva.Image({ image: fogCanvas, x: 0, y: 0, width: fogCanvas.width, height: fogCanvas.height });
    // Escalar para corresponder ao gridSize
    const escala = gs / (fogCanvas.width / (fogCanvas.width / gs));
    img.scaleX(gs / (fogCanvas.width / 20));
    img.scaleY(gs / (fogCanvas.height / 15));
    this.layers.fog.add(img);
    this.layers.fog.draw();
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  upsertToken(t) {
    const { id, posX, posY, escala, variacaoAtiva, variacoes, bloqueado, corBorda } = t;
    const v   = variacoes?.[variacaoAtiva || 0] || {};
    const url = v.img2d || PH;
    const gs  = this.gridSize;
    const sz  = (escala || 1.133) * gs;
    const x   = posX * gs - sz / 2, y = posY * gs - sz / 2;

    if (this._tokenNodes[id]) {
      const g = this._tokenNodes[id];
      g.x(x); g.y(y);
      const imgN = g.findOne('.timg');
      const bord = g.findOne('.tbord');
      if (imgN) this._loadImg(url, img => { imgN.image(img); g.getLayer()?.draw(); });
      if (bord) { bord.width(sz); bord.height(sz); bord.stroke(corBorda || '#ff8ca0'); }
      g.getLayer()?.draw();
      return;
    }

    const grupo = new Konva.Group({ x, y, draggable: !bloqueado && !this._rulerMode, id });
    grupo.setAttr('tokenId', id);

    const imgNode = new Konva.Image({ name: 'timg', x: 0, y: 0, width: sz, height: sz });
    this._loadImg(url, img => { imgNode.image(img); this.layers.tokens.draw(); });

    const borda = new Konva.Rect({ name: 'tbord', x: 0, y: 0, width: sz, height: sz,
      stroke: corBorda || '#ff8ca0', strokeWidth: 2, fill: 'transparent', cornerRadius: 4 });

    if (bloqueado) grupo.add(new Konva.Text({ name: 'lock', text: '🔒', fontSize: 14, x: sz - 18, y: 2 }));

    grupo.add(imgNode, borda);

    grupo.on('dragend', () => {
      const nx = grupo.x() / gs + sz / 2 / gs;
      const ny = grupo.y() / gs + sz / 2 / gs;
      let fx = nx, fy = ny;
      if (this._snapGrid) { fx = Math.round(nx - 0.5) + 0.5; fy = Math.round(ny - 0.5) + 0.5; grupo.x((fx - 0.5) * gs - sz/2 + 0.5 * gs); grupo.y((fy - 0.5) * gs - sz/2 + 0.5 * gs); }
      this.onTokenMoved?.(id, fx, fy);
      this.layers.tokens.draw();
    });

    grupo.on('click tap', () => this.onTokenClick?.(id));
    grupo.on('dblclick dbltap', () => this.onTokenDblClick?.(id));

    // Long press mobile → menu radial de variações
    let lpTimer;
    grupo.on('touchstart', () => { lpTimer = setTimeout(() => this._abrirRadial(id, t, grupo), 600); });
    grupo.on('touchend touchmove', () => clearTimeout(lpTimer));

    this._tokenNodes[id] = grupo;
    this.layers.tokens.add(grupo);
    this.layers.tokens.draw();
  }

  removeToken(id) {
    if (!this._tokenNodes[id]) return;
    this._tokenNodes[id].destroy();
    delete this._tokenNodes[id];
    this.removeActiveIndicator(id);
    this.layers.tokens.draw();
  }

  // ── Itens ─────────────────────────────────────────────────────────────────

  upsertItem(item) {
    const { id, posX = 0, posY = 0, escala = 0.667, texturas = [] } = item;
    const url = texturas[0]?.url || PH;
    const gs  = this.gridSize;
    const sz  = (escala || 0.667) * gs;
    const x   = posX * gs - sz / 2, y = posY * gs - sz / 2;

    if (this._itemNodes[id]) {
      const g = this._itemNodes[id];
      g.x(x); g.y(y);
      const imgN = g.findOne('.iimg');
      if (imgN) this._loadImg(url, img => { imgN.image(img); g.getLayer()?.draw(); });
      return;
    }

    const grupo = new Konva.Group({ x, y, draggable: true, id });
    grupo.setAttr('itemId', id);

    const imgNode = new Konva.Image({ name: 'iimg', x: 0, y: 0, width: sz, height: sz });
    this._loadImg(url, img => { imgNode.image(img); this.layers.tokens.draw(); });

    const borda = new Konva.Rect({ x: 0, y: 0, width: sz, height: sz,
      stroke: '#44cc88', strokeWidth: 1.5, fill: 'transparent', strokeDashArray: [4, 3], cornerRadius: 3 });

    grupo.add(imgNode, borda);

    grupo.on('dragend', () => {
      const nx = grupo.x() / gs + sz / 2 / gs;
      const ny = grupo.y() / gs + sz / 2 / gs;
      this.onItemMoved?.(id, nx, ny);
      this.layers.tokens.draw();
    });

    this._itemNodes[id] = grupo;
    this.layers.tokens.add(grupo);
    this.layers.tokens.draw();
  }

  removeItem(id) {
    if (!this._itemNodes[id]) return;
    this._itemNodes[id].destroy();
    delete this._itemNodes[id];
    this.layers.tokens.draw();
  }

  // ── Régua ─────────────────────────────────────────────────────────────────

  setRulerMode(v) {
    this._rulerMode = v;
    if (!v) this.clearRuler();
    // Desabilita drag dos tokens em modo régua
    Object.values(this._tokenNodes).forEach(g => g.draggable(!v));
  }

  setRuler(inicio, fim, metros) {
    this.clearRuler();
    const gs = this.gridSize;
    const x1 = inicio.x * gs, y1 = inicio.y * gs;
    const x2 = fim.x    * gs, y2 = fim.y    * gs;

    this._rulerLine = new Konva.Line({
      points: [x1, y1, x2, y2],
      stroke: '#ffdd44', strokeWidth: 2,
      dash: [8, 5],
    });

    this._rulerText = new Konva.Label({
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 16,
    });
    this._rulerText.add(new Konva.Tag({ fill: 'rgba(0,0,0,0.7)', cornerRadius: 4 }));
    this._rulerText.add(new Konva.Text({ text: `${metros}m`, fill: '#ffdd44', fontSize: 13, fontFamily: 'Cinzel,serif', padding: 5 }));

    this.layers.ui.add(this._rulerLine, this._rulerText);
    this.layers.ui.draw();
  }

  clearRuler() {
    this._rulerLine?.destroy(); this._rulerLine = null;
    this._rulerText?.destroy(); this._rulerText = null;
    this.layers.ui?.draw();
    this._rulerStartPos = null;
  }

  // ── Indicador de turno ────────────────────────────────────────────────────

  setActiveIndicator(tokenId, ativo) {
    this.removeActiveIndicator(tokenId);
    if (!ativo || !this._tokenNodes[tokenId]) return;
    const g   = this._tokenNodes[tokenId];
    const gs  = this.gridSize;
    const cx  = g.x() + gs / 2, cy = g.y() + gs / 2;
    const anel = new Konva.Circle({ x: cx, y: cy, radius: gs * 0.6, stroke: '#ff8ca0',
      strokeWidth: 3, fill: 'transparent', shadowColor: '#ff8ca0', shadowBlur: 12 });
    const anim = new Konva.Animation(f => { anel.opacity(0.5 + 0.5 * Math.sin(f.time / 600)); }, this.layers.ui);
    anim.start();
    anel.setAttr('_anim', anim);
    this._activeIndicators[tokenId] = anel;
    this.layers.ui.add(anel);
    this.layers.ui.draw();
  }

  removeActiveIndicator(id) {
    if (!this._activeIndicators[id]) return;
    this._activeIndicators[id].getAttr('_anim')?.stop();
    this._activeIndicators[id].destroy();
    delete this._activeIndicators[id];
    this.layers.ui?.draw();
  }

  // ── Menu radial de variações (mobile) ─────────────────────────────────────

  _abrirRadial(tokenId, tokenData, grupo) {
    this._radialMenu?.destroy(); this._radialMenu = null;
    const variacoes = tokenData.variacoes || [];
    if (!variacoes.length) return;
    const gs = this.gridSize;
    const cx = grupo.x() + gs / 2, cy = grupo.y() + gs / 2;
    const raio = 70;
    const menu = new Konva.Group({ x: cx, y: cy });

    variacoes.forEach((v, i) => {
      const ang = (i / variacoes.length) * Math.PI * 2 - Math.PI / 2;
      const vx = Math.cos(ang) * raio, vy = Math.sin(ang) * raio;
      const sz = 40;
      const circ = new Konva.Circle({ x: vx, y: vy, radius: sz/2+2, fill: '#2a0b10', stroke: '#ff8ca0', strokeWidth: 1.5 });
      const imgN = new Konva.Image({ x: vx-sz/2, y: vy-sz/2, width: sz, height: sz });
      this._loadImg(v.img2d || PH, img => { imgN.image(img); this.layers.ui.draw(); });
      const hit = new Konva.Circle({ x: vx, y: vy, radius: 28, fill: 'transparent' });
      hit.on('click tap', () => {
        this.onVariacaoSelect?.(tokenId, i);
        menu.destroy(); this._radialMenu = null; this.layers.ui.draw();
      });
      menu.add(circ, imgN, hit);
    });

    const bg = new Konva.Rect({ x: -500, y: -500, width: 1000, height: 1000, fill: 'transparent' });
    bg.on('click tap', () => { menu.destroy(); this._radialMenu = null; this.layers.ui.draw(); });
    menu.add(bg);
    this._radialMenu = menu;
    this.layers.ui.add(menu);
    this.layers.ui.draw();
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  _loadImg(url, cb) {
    const u = url || PH;
    if (this._imgCache[u]) { cb(this._imgCache[u]); return; }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { this._imgCache[u] = img; cb(img); };
    img.onerror = () => {
      const fb = new window.Image();
      fb.onload = () => cb(fb);
      fb.src = PH;
    };
    img.src = u;
  }

  _stagePos() {
    const ptr = this.stage.getPointerPosition();
    if (!ptr) return null;
    const sc = this.stage.scaleX();
    return { x: (ptr.x - this.stage.x()) / sc, y: (ptr.y - this.stage.y()) / sc };
  }

  _pxToWorld(sx, sy) {
    const sc = this.stage.scaleX();
    return { x: (sx - this.stage.x()) / sc / this.gridSize, y: (sy - this.stage.y()) / sc / this.gridSize };
  }

  getStage() { return this.stage; }
}
