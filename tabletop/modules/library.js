// Biblioteca de assets — organiza mapas, tokens e itens em pastas
import { pushPasta, deletePasta, patchPasta, pushAsset, deleteAsset, patchAsset } from './firebase-sync.js';
import { comprimirImagem } from './image-compress.js';
import { uploadFile } from './firebase-sync.js';

export class Library {
  constructor(panelEl, campanhaId) {
    this.panel      = panelEl;
    this.campanhaId = campanhaId;
    this.dados      = { pastas: {}, assets: { mapas: {}, tokens: {}, itens: {} } };
    this._categoria  = null;   // 'mapas'|'tokens'|'itens'|null (null = home)
    this._pastaAtiva = null;   // id da pasta ou null
    this._busca      = '';

    this.onUploadProgress = null;
    // Callback quando usuário clica em um asset para usar
    this.onUsarAsset = null;  // (categoria, asset)

    this.render();
  }

  setDados(dados) {
    this.dados = {
      pastas: dados?.pastas  || {},
      assets: { mapas: dados?.assets?.mapas  || {},
                tokens: dados?.assets?.tokens || {},
                itens:  dados?.assets?.itens  || {} },
    };
    this._renderConteudo();
  }

  // ── Render principal ──────────────────────────────────────────────────────

  render() {
    this.panel.innerHTML = `
      <div class="painel-header">
        <span class="painel-titulo">📁 Biblioteca</span>
        <button class="painel-fechar" id="libFechar">✕</button>
      </div>

      <!-- Barra de busca + voltar -->
      <div class="lib-barra">
        <button class="lib-voltar oculto" id="libVoltar" title="Voltar">←</button>
        <input class="lib-busca" id="libBusca" placeholder="Pesquisar..." />
      </div>

      <!-- Conteúdo dinâmico -->
      <div class="lib-body" id="libBody"></div>

      <!-- Input de upload oculto -->
      <input type="file" id="libFileInput" accept="image/*" style="display:none" />
    `;

    document.getElementById('libFechar')?.addEventListener('click', () => {
      this.panel.classList.add('oculto');
    });
    document.getElementById('libVoltar')?.addEventListener('click', () => {
      if (this._pastaAtiva) {
        this._pastaAtiva = null;
      } else {
        this._categoria = null;
      }
      this._renderConteudo();
    });
    document.getElementById('libBusca')?.addEventListener('input', e => {
      this._busca = e.target.value.toLowerCase();
      this._renderConteudo();
    });

    this._renderConteudo();
  }

  // ── Render dinâmico ───────────────────────────────────────────────────────

  _renderConteudo() {
    const body = document.getElementById('libBody');
    if (!body) return;
    const voltar = document.getElementById('libVoltar');

    if (!this._categoria) {
      // Tela home: categorias
      if (voltar) voltar.classList.add('oculto');
      body.innerHTML = `
        <div class="lib-cats">
          <div class="lib-cat-btn" data-cat="mapas">🗺<span>Mapas</span></div>
          <div class="lib-cat-btn" data-cat="tokens">🧙<span>Tokens</span></div>
          <div class="lib-cat-btn" data-cat="itens">🪑<span>Itens</span></div>
        </div>
      `;
      body.querySelectorAll('.lib-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this._categoria = btn.dataset.cat;
          this._pastaAtiva = null;
          this._renderConteudo();
        });
      });
      return;
    }

    // Tela de categoria
    if (voltar) voltar.classList.remove('oculto');

    const pastas  = Object.entries(this.dados.pastas).filter(([, p]) => p.categoria === this._categoria);
    const assets  = Object.entries(this.dados.assets[this._categoria] || {});
    const filtrado = assets.filter(([, a]) => {
      const nomeBate = !this._busca || a.nome?.toLowerCase().includes(this._busca);
      const pastaBate = this._pastaAtiva ? a.pastaId === this._pastaAtiva : !a.pastaId;
      return nomeBate && pastaBate;
    });

    const nomeCat = { mapas: 'Mapas', tokens: 'Tokens', itens: 'Itens' }[this._categoria];
    const pastaNome = this._pastaAtiva ? (this.dados.pastas[this._pastaAtiva]?.nome || 'Pasta') : null;

    body.innerHTML = `
      <div class="lib-cat-header">
        <span>${pastaNome || nomeCat}</span>
        <div style="display:flex;gap:6px">
          ${!this._pastaAtiva ? `<button class="lib-btn-sm" id="libNovaPasta">+ Pasta</button>` : ''}
          <button class="lib-btn-sm lib-upload-btn" id="libUpload">📤 Subir</button>
        </div>
      </div>

      <!-- Pastas (só na raiz da categoria) -->
      ${!this._pastaAtiva ? `
        <div class="lib-pastas">
          ${pastas.map(([pid, p]) => `
            <div class="lib-pasta" data-pid="${pid}">
              📂 <span class="lib-pasta-nome" data-pid="${pid}">${p.nome}</span>
              <button class="lib-pasta-del" data-pid="${pid}" title="Deletar pasta">✕</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Assets -->
      <div class="lib-assets">
        ${filtrado.length ? filtrado.map(([aid, a]) => `
          <div class="lib-asset" data-aid="${aid}" title="${a.nome || aid}">
            <img class="lib-asset-img" src="${a.url || ''}" onerror="this.style.display='none'" />
            <span class="lib-asset-nome">${a.nome || aid}</span>
            <div class="lib-asset-acoes">
              <button class="lib-use-btn" data-aid="${aid}" title="Usar">✔</button>
              <button class="lib-del-btn" data-aid="${aid}" title="Deletar">🗑</button>
            </div>
          </div>
        `).join('') : `<p class="mp-vazio">Nenhum asset aqui.</p>`}
      </div>
    `;

    // Nova pasta
    document.getElementById('libNovaPasta')?.addEventListener('click', async () => {
      const nome = prompt('Nome da pasta:');
      if (!nome) return;
      await pushPasta(this.campanhaId, { nome, categoria: this._categoria, itens: {} });
    });

    // Upload
    document.getElementById('libUpload')?.addEventListener('click', () => {
      const inp = document.getElementById('libFileInput');
      inp.dataset.cat   = this._categoria;
      inp.dataset.pasta = this._pastaAtiva || '';
      inp.click();
    });

    // Pastas — clique para entrar
    body.querySelectorAll('.lib-pasta').forEach(div => {
      div.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        this._pastaAtiva = div.dataset.pid;
        this._renderConteudo();
      });
    });

    // Renomear pasta
    body.querySelectorAll('.lib-pasta-nome').forEach(span => {
      span.addEventListener('dblclick', async () => {
        const pid  = span.dataset.pid;
        const novo = prompt('Novo nome:', span.textContent);
        if (novo) await patchPasta(this.campanhaId, pid, { nome: novo });
      });
    });

    // Deletar pasta
    body.querySelectorAll('.lib-pasta-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Deletar pasta? (Os assets não serão removidos)')) return;
        await deletePasta(this.campanhaId, btn.dataset.pid);
      });
    });

    // Usar asset
    body.querySelectorAll('.lib-use-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const aid   = btn.dataset.aid;
        const asset = this.dados.assets[this._categoria]?.[aid];
        this.onUsarAsset?.(this._categoria, { id: aid, ...asset });
      });
    });

    // Deletar asset
    body.querySelectorAll('.lib-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover da biblioteca?')) return;
        await deleteAsset(this.campanhaId, this._categoria, btn.dataset.aid);
      });
    });

    document.getElementById('libFileInput')?.addEventListener('change', e => this._onUpload(e), { once: true });
  }

  async _onUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const cat   = e.target.dataset.cat;
    const pasta = e.target.dataset.pasta || null;

    this.onUploadProgress?.(5);
    const maxLado = cat === 'mapas' ? 2048 : 512;
    const blob = await comprimirImagem(file, maxLado, 0.85);
    this.onUploadProgress?.(20);

    const nome = file.name.replace(/\.[^.]+$/, '');
    const ref  = await pushAsset(this.campanhaId, cat, { nome, url: '', pastaId: pasta });
    const aid  = ref.key;
    const caminho = `tabletop/${this.campanhaId}/biblioteca/${cat}/${aid}`;
    const url  = await uploadFile(caminho, blob, p => this.onUploadProgress?.(20 + p * 0.78));
    await patchAsset(this.campanhaId, cat, aid, { url });
    this.onUploadProgress?.(100);
    e.target.value = '';
  }
}
