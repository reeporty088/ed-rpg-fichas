# Relatório de Revisão Técnica — Escória de Deus (v3)

Este documento apresenta uma revisão detalhada do sistema de gerenciamento de RPG de mesa "Escória de Deus", com foco na arquitetura, segurança, performance e experiência do usuário da versão atual (v3).

---

## 1. Arquitetura do Sistema

O sistema é construído sobre uma pilha moderna de tecnologias web descentralizadas, utilizando o **Firebase Realtime Database** como núcleo de sincronização em tempo real.

### Pontos Fortes:
- **Modularidade:** O código do Virtual Tabletop (VTT) está bem segmentado em módulos (`camera.js`, `tokens.js`, `renderer3d.js`), o que facilita a manutenção e escalabilidade.
- **Multi-versão:** A estrutura de dados no Firebase e os arquivos HTML são prefixados por versão (`v1`, `v2`, `v3`), permitindo que o sistema evolua sem quebrar compatibilidade com campanhas antigas.
- **PWA (Progressive Web App):** A presença de `manifest.webmanifest` e `sw.js` indica suporte para instalação e funcionamento offline básico (ou carregamento mais rápido).

### Pontos de Atenção:
- **Dependência de Lógica no Cliente:** Grande parte da inteligência de negócios (cálculos de ficha, regras de automação) reside no front-end, o que exige que o cliente esteja sempre sincronizado.

---

## 2. Segurança

Esta é a área que exige maior atenção imediata.

### Vulnerabilidades Críticas:
- **Senhas em Texto Plano:** O arquivo `auth.js` armazena e compara senhas sem qualquer tipo de hashing (criptografia). Um vazamento do banco de dados ou acesso ao `localStorage` expõe as credenciais de todos os usuários imediatamente.
- **Autorização Client-Side:** O sistema de permissões (`requireAuth`) é executado apenas no navegador. Usuários mal-intencionados podem contornar essas verificações manipulando o estado do JavaScript ou as variáveis do `localStorage`.
- **Regras de Segurança do Firebase:** A exposição das chaves de API é padrão em aplicações web, mas a segurança real deve ser garantida via *Security Rules* no console do Firebase, impedindo que um jogador altere dados de outro ou que um não-admin acesse o `sistema_auth`.

### Sugestões de Melhoria:
1. **Migrar para Firebase Auth:** Utilizar o provedor oficial do Firebase para gerenciar usuários, o que resolve o problema de hashing de senhas e autenticação segura.
2. **Implementar Security Rules:** Validar no servidor (Firebase) se o `UID` do usuário tentando gravar em `fichas_v3/ID` realmente corresponde ao dono da ficha.

---

## 3. Performance e Sincronização

O sistema é ágil para grupos pequenos, mas possui características que podem causar lentidão em escalas maiores.

### Observações Técnicas:
- **Overhead de Sincronização:** O uso de `onValue` em nós raiz (como em `tokens`) faz com que a lista completa de objetos seja reenviada do servidor para todos os clientes sempre que um único objeto é movido.
- **Renderização 3D:** No `renderer3d.js`, o cálculo de billboarding (fazer os tokens olharem para a câmera) é processado em um loop O(N) a cada frame. Com centenas de itens de cenário, isso pode impactar o FPS em dispositivos menos potentes.

### Sugestões de Melhoria:
1. **Listeners Granulares:** Substituir `onValue` por `onChildChanged` e `onChildMoved` para atualizar apenas o objeto que sofreu alteração.
2. **Otimização de Assets:** Embora já exista compressão via `canvas`, implementar *lazy loading* para texturas do VTT que não estão no campo de visão atual.

---

## 4. Experiência do Usuário (UX) e Funcionalidades

A versão 3 apresenta um salto significativo em qualidade de vida para o Mestre e Jogadores.

### Destaques:
- **Automação da Ficha:** O cálculo automático de atributos derivados e PV/PM sugeridos reduz erros matemáticos e agiliza a criação de personagens.
- **Gestão de NPCs:** O gerador aleatório com arquétipos (Lacaio, Elite, Chefe) é uma ferramenta poderosa para mestres que precisam improvisar combates.
- **Compêndio:** A importação/exportação via JSON/TXT permite que a comunidade crie e compartilhe conteúdo facilmente.

### Oportunidades de UX:
- **Feedback Visual no VTT:** Adicionar indicadores de carregamento mais persistentes para texturas pesadas.
- **Acessibilidade Mobile:** A ficha possui um modo mobile funcional, mas o Painel do Mestre e o Compêndio ainda são densos demais para telas pequenas.

---

## 5. Veredito

O sistema **Escória de Deus v3** é uma plataforma robusta e personalizada para RPG, superando as versões anteriores em automação e ferramentas de mestre. O uso de Three.js para um VTT híbrido (2D/3D) é inovador para ferramentas customizadas.

**Prioridade Máxima:** Implementar hashing de senhas e revisar as regras de escrita no Firebase para proteger os dados dos usuários.
