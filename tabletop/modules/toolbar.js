// Toolbar do tabletop — gerencia ferramenta ativa e renderiza botões
export class Toolbar {
  constructor(containerEl, isGM, callbacks) {
    this.container = containerEl;
    this.isGM = isGM;
    this.cb = callbacks;  // { onTool, onToggleSnap, onToggle3D, onReset, onCenter, onUploadMapa, onAddToken, onToggleInitiativa, onToggleFog }
    this.ferramentaAtiva = 'selecionar';
    this.snapAtivo = true;
    this.modo3D = true;
    this.render();
  }

  setTool(nome) {
    this.ferramentaAtiva = nome;
    this._atualizarAtivos();
    this.cb.onTool && this.cb.onTool(nome);
  }

  setModo3D(val) {
    this.modo3D = val;
    this._atualizarAtivos();
  }

  setSnap(val) {
    this.snapAtivo = val;
    this._atualizarAtivos();
  }

  _atualizarAtivos() {
    this.container.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.toggle('ativo', btn.dataset.tool === this.ferramentaAtiva);
    });
    const snapBtn = this.container.querySelector('[data-toggle="snap"]');
    if (snapBtn) snapBtn.classList.toggle('ativo', this.snapAtivo);
    const modoBtn = this.container.querySelector('[data-toggle="modo3d"]');
    if (modoBtn) {
      modoBtn.textContent = this.modo3D ? '2D' : '3D';
      modoBtn.title = this.modo3D ? 'Alternar para 2D' : 'Alternar para 3D';
    }
  }

  render() {
    // Ferramentas disponíveis para todos
    const ferramentasBase = [
      { id: 'selecionar', icon: '⬡', label: 'Selecionar' },
      { id: 'pan',        icon: '✋', label: 'Mover câmera' },
      { id: 'regua',      icon: '📏', label: 'Régua de distância' },
    ];
    const ferramentasGM = [
      { id: 'fog',        icon: '🌫', label: 'Fog of War' },
      { id: 'uploadMapa', icon: '🖼', label: 'Upload de mapa' },
      { id: 'addToken',   icon: '➕', label: 'Adicionar token' },
    ];
    const acoesBase = [
      { id: 'reset',   icon: '⌂', label: 'Reset câmera',    action: true },
      { id: 'center',  icon: '⊞', label: 'Centralizar mapa', action: true },
    ];
    const toggles = [
      { id: 'snap',   icon: '⊹', label: 'Snap ao grid' },
      { id: 'modo3d', icon: '2D', label: 'Alternar 2D/3D' },
      { id: 'init',   icon: '⚔', label: 'Iniciativa', action: true },
    ];

    const toBtn = (item, isAction, isToggle) => {
      const attr = isAction ? `data-action="${item.id}"` : isToggle ? `data-toggle="${item.id}"` : `data-tool="${item.id}"`;
      return `<button class="tb-btn${item.id === 'selecionar' ? ' ativo' : ''}" ${attr} title="${item.label}">${item.icon}</button>`;
    };

    const gmHtml = this.isGM ? ferramentasGM.map(t => toBtn(t, false, false)).join('') : '';
    const sepHtml = this.isGM ? '<div class="tb-sep"></div>' : '';

    this.container.innerHTML = `
      <div class="tb-inner">
        ${ferramentasBase.map(t => toBtn(t, false, false)).join('')}
        ${sepHtml}
        ${gmHtml}
        <div class="tb-sep"></div>
        ${acoesBase.map(t => toBtn(t, true, false)).join('')}
        <div class="tb-sep"></div>
        ${toggles.map(t => toBtn(t, t.id === 'init', t.id !== 'init')).join('')}
      </div>
    `;

    // Ferramentas
    this.container.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
    });

    // Ações pontuais
    this.container.querySelector('[data-action="reset"]')?.addEventListener('click', () => this.cb.onReset?.());
    this.container.querySelector('[data-action="center"]')?.addEventListener('click', () => this.cb.onCenter?.());
    this.container.querySelector('[data-action="init"]')?.addEventListener('click', () => this.cb.onToggleInitiativa?.());
    this.container.querySelector('[data-action="uploadMapa"]')?.addEventListener('click', () => this.cb.onUploadMapa?.());
    this.container.querySelector('[data-action="addToken"]')?.addEventListener('click', () => this.cb.onAddToken?.());

    // Toggles
    this.container.querySelector('[data-toggle="snap"]')?.addEventListener('click', () => {
      this.snapAtivo = !this.snapAtivo;
      this._atualizarAtivos();
      this.cb.onToggleSnap?.(this.snapAtivo);
    });
    this.container.querySelector('[data-toggle="modo3d"]')?.addEventListener('click', () => {
      this.modo3D = !this.modo3D;
      this._atualizarAtivos();
      this.cb.onToggle3D?.(this.modo3D);
    });

    this._atualizarAtivos();
  }
}
