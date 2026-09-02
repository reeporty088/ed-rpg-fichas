export function element(tag, { className, text, attributes = {} } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}
export function button(label, { variant = 'primary', icon = null, onClick } = {}) {
  const node = element('button', { className: `button button--${variant}`, text: `${icon ? `${icon} ` : ''}${label}`, attributes: { type: 'button' } });
  if (onClick) node.addEventListener('click', onClick);
  return node;
}
export function card({ title, content }) {
  const node = element('section', { className: 'card' });
  if (title) node.append(element('h2', { className: 'card__title', text: title }));
  node.append(typeof content === 'string' ? element('p', { text: content }) : content);
  return node;
}
export function emptyState(title, description) {
  const node = element('section', { className: 'empty-state' });
  node.append(element('h2', { text: title }), element('p', { text: description }));
  return node;
}
export function avatar(label = '?') { return element('span', { className: 'avatar', text: label.slice(0, 1).toUpperCase(), attributes: { 'aria-label': label } }); }
export function badge(label) { return element('span', { className: 'badge', text: label }); }
export function loading(label = 'Carregando…') { return element('p', { className: 'loading', text: label, attributes: { role: 'status' } }); }
