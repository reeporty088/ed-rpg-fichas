import { element, button } from './elements.js';
export function createModal({ title, content }) {
  const dialog = element('dialog', { className: 'modal', attributes: { 'aria-label': title } });
  const close = button('Fechar', { variant: 'secondary', onClick: () => dialog.close() });
  dialog.append(element('h2', { text: title }), typeof content === 'string' ? element('p', { text: content }) : content, close);
  return dialog;
}
