// Painel de ordem de iniciativa com sincronização Firebase
import { saveInitiative } from './firebase-sync.js';

export class Initiative {
  constructor(campanhaId, isGM, panelEl) {
    this.campanhaId = campanhaId;
    this.isGM = isGM;
    this.panel = panelEl;
    this.lista = [];          // [{ id, nome, valor, ativo }]
    this.minimizado = false;
    this.onActiveChange = null; // callback(nomeAtivo) para destacar token
    this._dragSrc = null;
  }

  // Recebe snapshot do Firebase e re-renderiza
  setLista(arr) {
    this.lista = Array.isArray(arr) ? arr : [];
    this.render();
    if (this.onActiveChange) {
      const ativo = this.lista.find(e => e.ativo);
      this.onActiveChange(ativo ? ativo.nome : null);
    }
  }

  _save() {
    saveInitiative(this.campanhaId, this.lista);
  }

  addEntry(nome, valor) {
    if (!this.isGM) return;
    this.lista.push({ id: `init_${Date.now()}`, nome, valor: Number(valor), ativo: false });
    this.lista.sort((a, b) => b.valor - a.valor);
    if (this.lista.length === 1) this.lista[0].ativo = true;
    this._save();
  }

  removeEntry(id) {
    if (!this.isGM) return;
    const idx = this.lista.findIndex(e => e.id === id);
    if (idx === -1) return;
    const eraAtivo = this.lista[idx].ativo;
    this.lista.splice(idx, 1);
    if (eraAtivo && this.lista.length > 0) {
      this.lista[Math.min(idx, this.lista.length - 1)].ativo = true;
    }
    this._save();
  }

  nextTurn() {
    if (!this.isGM || this.lista.length === 0) return;
    const idx = this.lista.findIndex(e => e.ativo);
    const prox = (idx + 1) % this.lista.length;
    this.lista.forEach((e, i) => { e.ativo = i === prox; });
    this._save();
  }

  toggleMinimizar() {
    this.minimizado = !this.minimizado;
    this.render();
  }

  render() {
    if (!this.panel) return;
    const ativo = this.lista.find(e => e.ativo);

    this.panel.innerHTML = `
      <div class="init-header">
        <span class="init-title">⚔ Iniciativa</span>
        <div class="init-header-btns">
          ${this.isGM ? `<button class="init-btn-next" title="Próximo turno">▶</button>` : ''}
          <button class="init-btn-min" title="Minimizar">${this.minimizado ? '▲' : '▼'}</button>
        </div>
      </div>
      ${!this.minimizado ? `
        <div class="init-body">
          <div class="init-list" id="initList">
            ${this.lista.map((e, i) => `
              <div class="init-entry ${e.ativo ? 'init-ativo' : ''}" data-id="${e.id}" draggable="${this.isGM}">
                <span class="init-pos">${i + 1}</span>
                <span class="init-nome">${e.nome}</span>
                <span class="init-valor">${e.valor}</span>
                ${this.isGM ? `<button class="init-del" data-id="${e.id}">✕</button>` : ''}
              </div>
            `).join('')}
          </div>
          ${this.isGM ? `
            <div class="init-add">
              <input class="init-input" id="initNome" placeholder="Nome" />
              <input class="init-input init-input-num" id="initValor" placeholder="Val" type="number" />
              <button class="init-btn-add">+</button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    // Eventos
    this.panel.querySelector('.init-btn-min')?.addEventListener('click', () => this.toggleMinimizar());
    this.panel.querySelector('.init-btn-next')?.addEventListener('click', () => this.nextTurn());
    this.panel.querySelector('.init-btn-add')?.addEventListener('click', () => {
      const nome = this.panel.querySelector('#initNome').value.trim();
      const valor = this.panel.querySelector('#initValor').value;
      if (nome) this.addEntry(nome, valor || 0);
      this.panel.querySelector('#initNome').value = '';
      this.panel.querySelector('#initValor').value = '';
    });

    // Remover entradas
    this.panel.querySelectorAll('.init-del').forEach(btn => {
      btn.addEventListener('click', () => this.removeEntry(btn.dataset.id));
    });

    // Drag & drop para reordenar (GM)
    if (this.isGM) this._setupDragDrop();
  }

  _setupDragDrop() {
    const items = this.panel.querySelectorAll('.init-entry[draggable]');
    items.forEach(item => {
      item.addEventListener('dragstart', () => { this._dragSrc = item.dataset.id; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (this._dragSrc === item.dataset.id) return;
        const fromIdx = this.lista.findIndex(x => x.id === this._dragSrc);
        const toIdx   = this.lista.findIndex(x => x.id === item.dataset.id);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = this.lista.splice(fromIdx, 1);
        this.lista.splice(toIdx, 0, moved);
        this._save();
      });
    });
  }
}
