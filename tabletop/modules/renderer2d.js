// Renderizador 2D top-down com Konva.js
// Konva é carregado como global via <script> no HTML

const PLACEHOLDER_URL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23330a10" rx="4"/><text x="32" y="36" text-anchor="middle" fill="%23ff8ca0" font-size="14" font-family="serif">?</text></svg>';

export class Renderer2D {
  constructor(containerEl) {
    this.container  = containerEl;
    this.stage      = null;
    this.layers     = {
      mapa:     null,
      grid:     null,
      fog:      null,
      tokens:   null,
      ui:       null,   // anéis de iniciativa, cadeados
      overlay:  null,
    };
    this.gridSize   = 60;    // px por célula
    this._snapGrid  = true;
    this._mapaCols  = 20;
    this._mapaRows  = 15;
    this._tokenNodes = {};   // { [id]: Konva.Group }
    this._imgCache   = {};
    this._selTokenId = null;
    this._activeIndicators = {};  // { [id]: Konva.Circle }
    this.onTokenClick    = null;
    this.onTokenDblClick = null;
    this.onMapClick      = null;  // (worldX, worldY, screenX, screenY)
    this.onTokenMoved    = null;  // (id, col, linha)
    this._dragToken      = null;
    this._longPressTimer = null;
    this._radialMenu     = null;  // referência ao menu radial aberto
  }

  // ── Inicialização ──────────────────────────────────────────────────────────

  init() {
    const w = this.container.clientWidth  || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.stage = new Konva.Stage({ container: this.container, width: w, height: h });

    this.layers.mapa    = new Konva.Layer();
    this.layers.grid    = new Konva.Layer();
    this.layers.fog     = new Konva.Layer();
    this.layers.tokens  = new Konva.Layer();
    this.layers.ui      = new Konva.Layer();
    this.stage.add(
      this.layers.mapa,
      this.layers.grid,
      this.layers.fog,
      this.layers.tokens,
      this.layers.ui
    );

    // Alt+dblclick no fundo → ping
    this.stage.on('dblclick', e => {
      if (!e.evt.altKey) return;
      if (e.target !== this.stage) return;
      const pos = this.stage.getPointerPosition();
      const world = this._screenToWorld(pos.x, pos.y);
      this.onMapClick?.(world.x, world.y, pos.x, pos.y);
    });

    // Touch longo no fundo → ping
    this.stage.on('touchstart', e => {
      if (e.target !== this.stage) return;
      this._longPressTimer = setTimeout(() => {
        const pos = this.stage.getPointerPosition();
        const world = this._screenToWorld(pos.x, pos.y);
        this.onMapClick?.(world.x, world.y, pos.x, pos.y);
      }, 800);
    });
    this.stage.on('touchend', () => clearTimeout(this._longPressTimer));

    window.addEventListener('resize', this._onResize.bind(this));
  }

  dispose() {
    if (this.stage) this.stage.destroy();
    window.removeEventListener('resize', this._onResize.bind(this));
  }

  _onResize() {
    if (!this.stage) return;
    this.stage.width(this.container.clientWidth);
    this.stage.height(this.container.clientHeight);
  }

  // ── Mapa ───────────────────────────────────────────────────────────────────

  setMapa(imageUrl, gridCols, gridRows) {
    this._mapaCols = gridCols;
    this._mapaRows = gridRows;
    const w = gridCols * this.gridSize;
    const h = gridRows * this.gridSize;

    this.layers.mapa.destroyChildren();
    if (imageUrl) {
      Konva.Image.fromURL(imageUrl, img => {
        img.setAttrs({ x: 0, y: 0, width: w, height: h });
        this.layers.mapa.add(img);
        this.layers.mapa.draw();
      });
    } else {
      const bg = new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: '#1a0a0a' });
      this.layers.mapa.add(bg);
      this.layers.mapa.draw();
    }
    this._renderGrid(gridCols, gridRows);
  }

  setGridVisible(vis) {
    this.layers.grid.visible(vis);
    this.layers.grid.draw();
  }

  _renderGrid(cols, rows) {
    this.layers.grid.destroyChildren();
    const w = cols * this.gridSize;
    const h = rows * this.gridSize;
    const cor = '#330015';

    for (let c = 0; c <= cols; c++) {
      this.layers.grid.add(new Konva.Line({
        points: [c * this.gridSize, 0, c * this.gridSize, h],
        stroke: cor, strokeWidth: 0.5, opacity: 0.6
      }));
    }
    for (let r = 0; r <= rows; r++) {
      this.layers.grid.add(new Konva.Line({
        points: [0, r * this.gridSize, w, r * this.gridSize],
        stroke: cor, strokeWidth: 0.5, opacity: 0.6
      }));
    }
    this.layers.grid.draw();
  }

  // ── Fog canvas ────────────────────────────────────────────────────────────

  setFogCanvas(fogCanvas) {
    this.layers.fog.destroyChildren();
    const img = new Konva.Image({
      image: fogCanvas,
      x: 0, y: 0,
      width:  this._mapaCols * this.gridSize,
      height: this._mapaRows * this.gridSize,
    });
    this.layers.fog.add(img);
    this.layers.fog.draw();
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────

  upsertToken(tokenData) {
    const { id, posX, posY, escala, variacaoAtiva, variacoes, bloqueado, corBorda } = tokenData;
    const variacao = variacoes?.[variacaoAtiva || 0] || {};
    const imgUrl = variacao.img2d || PLACEHOLDER_URL;
    const sz = (escala || 1) * this.gridSize;
    const x  = posX * this.gridSize - sz / 2;
    const y  = posY * this.gridSize - sz / 2;

    if (this._tokenNodes[id]) {
      const grupo = this._tokenNodes[id];
      grupo.x(x); grupo.y(y);
      // Atualiza imagem e borda
      const imgNode = grupo.findOne('.token-img');
      const borda   = grupo.findOne('.token-borda');
      if (imgNode) {
        this._carregarImagem(imgUrl, img => { imgNode.image(img); grupo.getLayer()?.draw(); });
      }
      if (borda) { borda.width(sz); borda.height(sz); borda.stroke(corBorda || '#ff8ca0'); }
      grupo.getLayer()?.draw();
      return;
    }

    // Cria grupo do token
    const grupo = new Konva.Group({ x, y, draggable: true, id });
    grupo.setAttr('tokenId', id);

    // Placeholder enquanto carrega
    const imgNode = new Konva.Image({ name: 'token-img', x: 0, y: 0, width: sz, height: sz });
    this._carregarImagem(imgUrl, img => { imgNode.image(img); this.layers.tokens.draw(); });

    const borda = new Konva.Rect({
      name: 'token-borda',
      x: 0, y: 0, width: sz, height: sz,
      stroke: corBorda || '#ff8ca0',
      strokeWidth: 2, fill: 'transparent', cornerRadius: 4,
    });

    // Ícone de cadeado se bloqueado
    if (bloqueado) {
      const cadeado = new Konva.Text({
        name: 'token-lock', text: '🔒', fontSize: 14,
        x: sz - 18, y: 2
      });
      grupo.add(cadeado);
    }

    grupo.add(imgNode, borda);
    this.layers.tokens.add(grupo);

    // Drag events
    grupo.on('dragstart', () => {
      if (bloqueado) { grupo.stopDrag(); return; }
      this._dragToken = id;
    });
    grupo.on('dragend', () => {
      if (!this._dragToken) return;
      let nx = grupo.x() / this.gridSize + 0.5;
      let ny = grupo.y() / this.gridSize + 0.5;
      if (this._snapGrid) {
        nx = Math.round(nx - 0.5) + 0.5;
        ny = Math.round(ny - 0.5) + 0.5;
        grupo.x((nx - 0.5) * this.gridSize);
        grupo.y((ny - 0.5) * this.gridSize);
      }
      this.onTokenMoved?.(id, nx, ny);
      this._dragToken = null;
      this.layers.tokens.draw();
    });

    // Clique / double click / long press mobile
    grupo.on('click tap', () => this.onTokenClick?.(id));
    grupo.on('dblclick dbltap', () => this.onTokenDblClick?.(id));

    // Tecla 1-9 para variações (registrado em tabletop.js)
    // Long press mobile → menu radial
    let longTimer;
    grupo.on('touchstart', () => {
      longTimer = setTimeout(() => this._abrirMenuRadial(id, tokenData, grupo), 600);
    });
    grupo.on('touchend touchmove', () => clearTimeout(longTimer));

    this._tokenNodes[id] = grupo;
    this.layers.tokens.draw();
  }

  removeToken(id) {
    if (!this._tokenNodes[id]) return;
    this._tokenNodes[id].destroy();
    delete this._tokenNodes[id];
    this.removeActiveIndicator(id);
    this.layers.tokens.draw();
  }

  clearTokens() {
    Object.keys(this._tokenNodes).forEach(id => this.removeToken(id));
  }

  // Menu radial de variações (mobile)
  _abrirMenuRadial(tokenId, tokenData, grupo) {
    // Remove menu anterior se existir
    if (this._radialMenu) { this._radialMenu.destroy(); this._radialMenu = null; }
    const variacoes = tokenData.variacoes || [];
    if (variacoes.length === 0) return;
    const cx = grupo.x() + this.gridSize / 2;
    const cy = grupo.y() + this.gridSize / 2;
    const raio = 70;
    const menuGrupo = new Konva.Group({ x: cx, y: cy });

    variacoes.forEach((v, i) => {
      const ang = (i / variacoes.length) * Math.PI * 2 - Math.PI / 2;
      const vx  = Math.cos(ang) * raio;
      const vy  = Math.sin(ang) * raio;
      const sz  = 40;

      const circulo = new Konva.Circle({ x: vx, y: vy, radius: sz / 2 + 2, fill: '#2a0b10', stroke: '#ff8ca0', strokeWidth: 1.5 });
      const imgNode = new Konva.Image({ x: vx - sz / 2, y: vy - sz / 2, width: sz, height: sz, cornerRadius: sz });
      this._carregarImagem(v.img2d || PLACEHOLDER_URL, img => { imgNode.image(img); this.layers.ui.draw(); });

      const hitArea = new Konva.Circle({ x: vx, y: vy, radius: 28, fill: 'transparent' });
      hitArea.on('click tap', () => {
        // Seleciona variação — callback externo
        if (this.onVariacaoSelect) this.onVariacaoSelect(tokenId, i);
        menuGrupo.destroy();
        this._radialMenu = null;
        this.layers.ui.draw();
      });

      menuGrupo.add(circulo, imgNode, hitArea);
    });

    // Clique fora fecha o menu
    const fechar = new Konva.Rect({ x: -500, y: -500, width: 1000, height: 1000, fill: 'transparent' });
    fechar.on('click tap', () => { menuGrupo.destroy(); this._radialMenu = null; this.layers.ui.draw(); });
    menuGrupo.add(fechar);

    this._radialMenu = menuGrupo;
    this.layers.ui.add(menuGrupo);
    this.layers.ui.draw();
  }

  // Anel de iniciativa ativa
  setActiveIndicator(tokenId, ativo) {
    this.removeActiveIndicator(tokenId);
    if (!ativo || !this._tokenNodes[tokenId]) return;
    const grupo = this._tokenNodes[tokenId];
    const sz = this.gridSize;
    const anel = new Konva.Circle({
      x: grupo.x() + sz / 2,
      y: grupo.y() + sz / 2,
      radius: sz * 0.6,
      stroke: '#ff8ca0',
      strokeWidth: 3,
      fill: 'transparent',
      shadowColor: '#ff8ca0',
      shadowBlur: 15,
      opacity: 0.9,
    });
    this._activeIndicators[tokenId] = anel;
    this.layers.ui.add(anel);

    // Animação de pulso
    const anim = new Konva.Animation(frame => {
      anel.opacity(0.5 + 0.5 * Math.sin(frame.time / 600));
    }, this.layers.ui);
    anim.start();
    anel.setAttr('_anim', anim);
    this.layers.ui.draw();
  }

  removeActiveIndicator(tokenId) {
    if (!this._activeIndicators[tokenId]) return;
    const anel = this._activeIndicators[tokenId];
    const anim = anel.getAttr('_anim');
    if (anim) anim.stop();
    anel.destroy();
    delete this._activeIndicators[tokenId];
    this.layers.ui.draw();
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  _carregarImagem(url, cb) {
    const u = url || PLACEHOLDER_URL;
    if (this._imgCache[u]) { cb(this._imgCache[u]); return; }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { this._imgCache[u] = img; cb(img); };
    img.onerror = () => {
      const fallback = new window.Image();
      fallback.src = PLACEHOLDER_URL;
      fallback.onload = () => cb(fallback);
    };
    img.src = u;
  }

  _screenToWorld(sx, sy) {
    const scale = this.stage.scaleX();
    return {
      x: (sx - this.stage.x()) / scale / this.gridSize,
      y: (sy - this.stage.y()) / scale / this.gridSize,
    };
  }

  getStage() { return this.stage; }
}
