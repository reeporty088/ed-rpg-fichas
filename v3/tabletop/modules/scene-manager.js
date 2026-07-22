// Gerenciador de cenas — salva e carrega snapshots do estado da sessão
import { listenCenas, pushCena, saveCena, deleteCena, getSnapshot, restoreSnapshot } from './firebase-sync.js';

export class SceneManager {
  constructor(panelEl, campanhaId, isGM) {
    this.panel      = panelEl;
    this.campanhaId = campanhaId;
    this.isGM       = isGM;
    this.cenas      = {};

    this.render();
    if (isGM) {
      listenCenas(campanhaId, obj => { this.cenas = obj || {}; this._renderLista(); });
    }
  }

  render() {
    this.panel.innerHTML = `
      <div class="painel-header">
        <span class="painel-titulo">💾 Cenas</span>
        <button class="painel-fechar" id="cenasPanelFechar">✕</button>
      </div>

      ${this.isGM ? `
      <div class="cenas-salvar">
        <input type="text" id="cenaNome" placeholder="Nome da cena…" class="cenas-input" maxlength="40" />
        <button class="mp-btn-salvar" id="btnSalvarCena">Salvar</button>
      </div>
      ` : ''}

      <div id="cenasLista" class="mp-lista cenas-lista"></div>
    `;

    document.getElementById('cenasPanelFechar')?.addEventListener('click', () => {
      this.panel.classList.add('oculto');
    });

    document.getElementById('btnSalvarCena')?.addEventListener('click', async () => {
      const nome = document.getElementById('cenaNome')?.value.trim();
      if (!nome) { alert('Digite um nome para a cena.'); return; }
      const btn = document.getElementById('btnSalvarCena');
      btn.disabled = true; btn.textContent = '…';
      try {
        await this._salvar(nome);
        document.getElementById('cenaNome').value = '';
      } catch (e) { alert('Erro ao salvar: ' + e.message); }
      btn.disabled = false; btn.textContent = 'Salvar';
    });

    this._renderLista();
  }

  async _salvar(nome, cenaId = null) {
    const snap = await getSnapshot(this.campanhaId);
    const cena = { nome, ts: Date.now(), ...snap };
    if (cenaId) {
      await saveCena(this.campanhaId, cenaId, cena);
    } else {
      await pushCena(this.campanhaId, cena);
    }
  }

  async _carregar(cenaId) {
    const cena = this.cenas[cenaId];
    if (!cena) return;
    if (!confirm(`Carregar "${cena.nome}"?\nO estado atual será substituído.`)) return;
    await restoreSnapshot(this.campanhaId, cena);
  }

  async _sobrescrever(cenaId) {
    const cena = this.cenas[cenaId];
    if (!cena) return;
    if (!confirm(`Sobrescrever "${cena.nome}" com o estado atual?`)) return;
    const btn = this.panel.querySelector(`[data-overwrt="${cenaId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      await this._salvar(cena.nome, cenaId);
    } catch (e) { alert('Erro: ' + e.message); }
  }

  async _deletar(cenaId) {
    const cena = this.cenas[cenaId];
    if (!confirm(`Deletar cena "${cena?.nome || cenaId}"?`)) return;
    await deleteCena(this.campanhaId, cenaId);
  }

  _renderLista() {
    const el = document.getElementById('cenasLista');
    if (!el) return;
    const itens = Object.entries(this.cenas).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
    if (!itens.length) {
      el.innerHTML = '<p class="mp-vazio">Nenhuma cena salva.</p>';
      return;
    }
    el.innerHTML = itens.map(([id, c]) => {
      const data = c.ts
        ? new Date(c.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';
      return `
        <div class="cenas-item">
          <div class="cenas-info">
            <span class="cenas-nome">${c.nome || id}</span>
            <span class="cenas-data">${data}</span>
          </div>
          <div class="cenas-acoes">
            <button class="cenas-btn cenas-btn-load" data-load="${id}" title="Carregar cena">▶</button>
            ${this.isGM ? `
            <button class="cenas-btn cenas-btn-over" data-overwrt="${id}" title="Sobrescrever com estado atual">↩</button>
            <button class="cenas-btn cenas-btn-del"  data-del="${id}"     title="Deletar cena">🗑</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', () => this._carregar(btn.dataset.load));
    });
    el.querySelectorAll('[data-overwrt]').forEach(btn => {
      btn.addEventListener('click', () => this._sobrescrever(btn.dataset.overwrt));
    });
    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => this._deletar(btn.dataset.del));
    });
  }
}
