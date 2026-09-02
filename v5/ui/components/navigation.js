import { element } from './elements.js';
const links = [['/', 'Início'], ['/campaigns', 'Campanhas'], ['/compendium', 'Compêndio'], ['/schedule', 'Cronograma'], ['/profile', 'Perfil'], ['/settings', 'Configurações']];
export function createNavigation() {
  const nav = element('nav', { className: 'navigation', attributes: { 'aria-label': 'Navegação principal' } });
  links.forEach(([path, label]) => { const link = element('a', { text: label, attributes: { href: `#${path}` } }); nav.append(link); });
  return nav;
}
