(() => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Não foi possível registrar o service worker do PWA.', error);
      });
    });
  }

  if (isStandalone) return;

  let deferredPrompt = null;
  let installButton = null;

  const createInstallButton = () => {
    if (installButton) return installButton;

    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-button {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        display: none;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border: 1px solid #9b1a1a;
        border-radius: 999px;
        background: linear-gradient(170deg, #4a1515 0%, #1e0808 100%);
        color: #f0cece;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .45), 0 0 20px rgba(155, 26, 26, .28);
        font-family: 'Raleway', 'Segoe UI', Tahoma, sans-serif;
        font-size: .9rem;
        font-weight: 700;
        letter-spacing: .03em;
        cursor: pointer;
      }
      .pwa-install-button:hover,
      .pwa-install-button:focus-visible {
        border-color: #cc2a2a;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .5), 0 0 26px rgba(155, 26, 26, .42);
        outline: none;
      }
      .pwa-install-button.is-visible { display: inline-flex; }
      @media (max-width: 640px) {
        .pwa-install-button {
          left: 16px;
          right: 16px;
          justify-content: center;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        }
      }
    `;
    document.head.appendChild(style);

    installButton = document.createElement('button');
    installButton.type = 'button';
    installButton.className = 'pwa-install-button';
    installButton.setAttribute('aria-label', 'Instalar Escória de Deus RPG como aplicativo');
    installButton.innerHTML = '<span aria-hidden="true">⬇️</span><span>Instalar app</span>';
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      installButton.classList.remove('is-visible');
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
    document.body.appendChild(installButton);
    return installButton;
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    createInstallButton().classList.add('is-visible');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.classList.remove('is-visible');
  });
})();
