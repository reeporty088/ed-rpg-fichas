// Régua de distância — 1 célula = 1,5 m
// Gerencia o estado da régua; o visual é delegado aos renderers via callbacks

export class Ruler {
  constructor() {
    this.METROS_POR_CELULA = 1.5;
    this.ativo    = false;
    this._inicio  = null;   // { x, y } em células
    this._fim     = null;
    this._fixado  = false;  // true quando a régua está exibida (drag concluído)

    // Callbacks definidos pelo caller
    this.onDraw  = null;   // ({ inicio, fim, metros }) → atualiza visual
    this.onClear = null;   // () → remove visual
  }

  ativar()    { this.ativo = true;  this._reset(); }
  desativar() { this.ativo = false; this._clear(); }

  // Chamado no pointerdown na posição em células
  iniciar(cx, cy) {
    if (!this.ativo) return;
    if (this._fixado) { this._clear(); return; }   // clique limpa régua fixada
    this._inicio = { x: cx, y: cy };
    this._fim    = { x: cx, y: cy };
    this._fixado = false;
  }

  // Chamado no pointermove
  atualizar(cx, cy) {
    if (!this.ativo || !this._inicio || this._fixado) return;
    this._fim = { x: cx, y: cy };
    this._emitir();
  }

  // Chamado no pointerup — congela a régua na tela
  finalizar(cx, cy) {
    if (!this.ativo || !this._inicio) return;
    this._fim    = { x: cx, y: cy };
    this._fixado = true;
    this._emitir();
    this._inicio = null;  // pronto para próxima régua
  }

  // Clique no mapa (fora de drag): limpa régua fixada
  clique() {
    if (this._fixado) this._clear();
  }

  _emitir() {
    if (!this._fim || !this._inicio) return;
    const dx = this._fim.x - (this._inicio?.x ?? this._fim.x);
    const dy = this._fim.y - (this._inicio?.y ?? this._fim.y);
    const metros = Math.sqrt(dx * dx + dy * dy) * this.METROS_POR_CELULA;
    this.onDraw?.({
      inicio: { ...this._inicio },
      fim:    { ...this._fim },
      metros: Math.round(metros * 10) / 10,
    });
  }

  _clear()  { this._reset(); this.onClear?.(); }
  _reset()  { this._inicio = null; this._fim = null; this._fixado = false; }
}
