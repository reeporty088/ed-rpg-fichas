export function createRouter({ routes, outlet, getUser = () => null }) {
  const render = async () => {
    const path = location.hash.slice(1) || '/';
    const route = routes[path] ?? routes['/'];
    if (route.requiresAuth && !getUser()) {
      location.hash = '#/';
      return;
    }
    outlet.replaceChildren(await route.render());
    document.title = `${route.title} — Escória de Deus V5`;
  };
  window.addEventListener('hashchange', render);
  return { start: render, navigate: (path) => { location.hash = `#${path}`; } };
}
