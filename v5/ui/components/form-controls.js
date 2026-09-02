import { element, button } from './elements.js';

export function iconButton(label, icon, options = {}) {
  const node = button(icon, options);
  node.classList.add('icon-button');
  node.setAttribute('aria-label', label);
  return node;
}
export function input({ label, type = 'text', name, value = '' }) {
  const wrapper = element('label', { className: 'field' });
  wrapper.append(element('span', { text: label }));
  wrapper.append(element('input', { attributes: { type, name, value } }));
  return wrapper;
}
export function select({ label, name, options = [] }) {
  const wrapper = element('label', { className: 'field' });
  const control = element('select', { attributes: { name } });
  options.forEach(({ value, label: optionLabel }) => control.append(element('option', { text: optionLabel, attributes: { value } })));
  wrapper.append(element('span', { text: label }), control);
  return wrapper;
}
