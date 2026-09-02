import { card, element } from '../../ui/components/elements.js';
export function renderHomeModule() {
  const page = element('section', { className: 'page' });
  page.append(element('p', { className: 'eyebrow', text: 'FUNDAÇÃO V5' }), element('h1', { text: 'Uma nova base para Escória de Deus.' }), element('p', { className: 'lead', text: 'A V5 começa isolada, modular e pronta para evoluir sem alterar as versões legadas.' }));
  const grid = element('div', { className: 'card-grid' });
  grid.append(card({ title: 'Módulos', content: 'Home, campanhas, compêndio, perfil, cronograma e configurações possuem pontos de entrada independentes.' }), card({ title: 'Segurança', content: 'A interface não concede acesso: regras do Firebase serão a autoridade para dados e permissões.' }));
  page.append(grid);
  return page;
}
