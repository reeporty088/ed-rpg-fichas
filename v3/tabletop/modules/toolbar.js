// Toolbar do tabletop — nova estrutura com sub-painéis
export class Toolbar {
  constructor(containerEl, isGM, cb) {
    this.container = containerEl;
    this.isGM = isGM;
    this.cb = cb;
    // cb: { onTool, onToggleSnap, onToggle3D, onReset, onCenter,
    //       onOpenMapa, onOpenToken, onOpenItens, onOpenBiblioteca,
    //       onOpenCenas, onOpenCeu }
    this.ferramenta  = 'selecionar';
    this.snapAtivo   = true;
    this.modo3D      = true;
    this._subPainel  = null;   // qual sub-painel está aberto
    this.render();
  }

  setFerramenta(nome) {
    this.ferramenta = nome;
    this._atualizarAtivos();
    this.cb.onTool?.(nome);
  }

  setModo3D(v) { this.modo3D = v; this._atualizarAtivos(); }
  setSnap(v)   { this.snapAtivo = v; this._atualizarAtivos(); }

  // Abre/fecha sub-painel (clique duplo no mesmo fecha)
  _togglePainel(nome) {
    const mesmo = this._subPainel === nome;
    this._subPainel = mesmo ? null : nome;
    this._atualizarAtivos();
    const cbMap = {
      mapa:       this.cb.onOpenMapa,
      token:      this.cb.onOpenToken,
      itens:      this.cb.onOpenItens,
      biblioteca: this.cb.onOpenBiblioteca,
      cenas:      this.cb.onOpenCenas,
      ceu:        this.cb.onOpenCeu,
    };
    cbMap[nome]?.(this._subPainel === nome);
  }

  _atualizarAtivos() {
    this.container.querySelectorAll('[data-tool]').forEach(b =>
      b.classList.toggle('ativo', b.dataset.tool === this.ferramenta)
    );
    this.container.querySelectorAll('[data-painel]').forEach(b =>
      b.classList.toggle('ativo', b.dataset.painel === this._subPainel)
    );
    const snap = this.container.querySelector('[data-toggle="snap"]');
    if (snap) snap.classList.toggle('ativo', this.snapAtivo);
    const modo = this.container.querySelector('[data-toggle="modo3d"]');
    if (modo) { modo.textContent = this.modo3D ? '2D' : '3D'; }
  }

  render() {
    this.container.innerHTML = `
      <div class="tb-inner">
        <!-- Ferramentas -->
        <button class="tb-btn ativo" data-tool="selecionar" title="Selecionar">⬡</button>
        <button class="tb-btn"       data-tool="regua"      title="Régua de distância">📏</button>
        ${this.isGM ? `<button class="tb-btn" data-tool="fog" title="Fog of War">🌫</button>` : ''}

        <div class="tb-sep"></div>

        <!-- Sub-painéis -->
        ${this.isGM ? `
          <button class="tb-btn" data-painel="mapa"  title="Mapa">🗺</button>
          <button class="tb-btn" data-painel="cenas" title="Cenas">💾</button>
          <button class="tb-btn" data-painel="token" title="Tokens">🧙</button>
          <button class="tb-btn" data-painel="itens" title="Itens de cenário">🪑</button>
        ` : ''}

        <div class="tb-sep"></div>

        <!-- Ações de câmera -->
        <button class="tb-btn" data-action="reset"  title="Reset câmera">⌂</button>
        <button class="tb-btn" data-action="center" title="Centralizar mapa">⊞</button>

        <div class="tb-sep"></div>

        <!-- Toggles -->
        <button class="tb-btn" data-toggle="snap"  title="Snap ao grid">⊹</button>
        <button class="tb-btn" data-toggle="modo3d" title="Alternar 2D/3D">2D</button>

        <div class="tb-sep"></div>

        <!-- Biblioteca e ambiente -->
        <button class="tb-btn" data-painel="biblioteca" title="Biblioteca de assets">📁</button>
        <button class="tb-btn" data-painel="ceu"        title="Cor do Céu / Ambiente">🌅</button>
      </div>
    `;

    // Ferramentas
    this.container.querySelectorAll('[data-tool]').forEach(b =>
      b.addEventListener('click', () => this.setFerramenta(b.dataset.tool))
    );
    // Sub-painéis
    this.container.querySelectorAll('[data-painel]').forEach(b =>
      b.addEventListener('click', () => this._togglePainel(b.dataset.painel))
    );
    // Ações
    this.container.querySelector('[data-action="reset"]')?.addEventListener('click',  () => this.cb.onReset?.());
    this.container.querySelector('[data-action="center"]')?.addEventListener('click', () => this.cb.onCenter?.());
    // Toggles
    this.container.querySelector('[data-toggle="snap"]')?.addEventListener('click', () => {
      this.snapAtivo = !this.snapAtivo;
      this.cb.onToggleSnap?.(this.snapAtivo);
      this._atualizarAtivos();
    });
    this.container.querySelector('[data-toggle="modo3d"]')?.addEventListener('click', () => {
      this.modo3D = !this.modo3D;
      this.cb.onToggle3D?.(this.modo3D);
      this._atualizarAtivos();
    });

    this._atualizarAtivos();
  }
}
