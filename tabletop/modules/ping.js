// Sistema de pings visuais efêmeros no mapa
export class PingSystem {
  constructor(overlayEl) {
    // overlayEl: div absoluta sobre o canvas, para renderizar os pings
    this.overlay = overlayEl;
  }

  // Renderiza um ping animado nas coordenadas de TELA (px)
  renderPing(screenX, screenY, cor, nomeJogador) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ping-wrapper';
    wrapper.style.cssText = `
      position:absolute;
      left:${screenX}px;
      top:${screenY}px;
      transform:translate(-50%,-50%);
      pointer-events:none;
      z-index:9999;
    `;

    // Três anéis concêntricos com delays diferentes
    for (let i = 0; i < 3; i++) {
      const anel = document.createElement('div');
      anel.style.cssText = `
        position:absolute;
        border-radius:50%;
        border:2px solid ${cor};
        box-shadow:0 0 8px ${cor};
        width:20px; height:20px;
        top:50%; left:50%;
        transform:translate(-50%,-50%) scale(0);
        animation:pingExpand 1.4s ease-out ${i * 0.3}s forwards;
        opacity:0;
      `;
      wrapper.appendChild(anel);
    }

    // Ponto central
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;
      width:8px; height:8px;
      border-radius:50%;
      background:${cor};
      top:50%; left:50%;
      transform:translate(-50%,-50%);
      box-shadow:0 0 10px ${cor};
    `;
    wrapper.appendChild(dot);

    // Rótulo com nome do jogador
    const label = document.createElement('div');
    label.textContent = nomeJogador;
    label.style.cssText = `
      position:absolute;
      top:calc(50% + 16px);
      left:50%;
      transform:translateX(-50%);
      white-space:nowrap;
      color:${cor};
      font-size:11px;
      font-family:'Cinzel',serif;
      text-shadow:0 0 6px ${cor};
      animation:pingFade 1.4s ease-out forwards;
    `;
    wrapper.appendChild(label);

    this.overlay.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 1600);
  }
}
