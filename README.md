# Véu RPG - Sistema de Fichas de Personagem

Aplicação web para gerenciamento e criação de fichas de RPG, com design **Liquid Glass** (glassmorphism translúcido), suporte nativo a temas Claro/Escuro e autenticação completa via **Firebase v10+ (ES Modules)**.

---

## 📁 Arquitetura do Projeto

```text
/
├── index.html                  # Tela principal de autenticação (Login, Cadastro e Recuperação)
├── app.html                    # Painel principal (Gestão de Campanhas, Perfil e Configurações)
├── assets/
│   ├── css/
│   │   ├── global.css          # Design system Liquid Glass, tokens CSS e temas (dark/light)
│   │   ├── auth.css            # Estilização do card e abas de autenticação
│   │   └── dashboard.css       # Sidebar retrátil, bottom nav mobile, grid de campanhas e modais
│   └── js/
│       ├── firebase-config.js  # Módulo de inicialização do Firebase v10+ (Auth e Firestore)
│       ├── auth.js             # Lógica de login, cadastro, recuperação e feedback visual
│       ├── app.js              # Gestão de campanhas no Firestore, código de convite, perfil e SPA
│       └── campaign.js         # Workspace da Campanha (Fichas, GM Screen, Iniciativa, Compendium)
└── README.md                   # Documentação do projeto
```

---

## ⚡ Tecnologias Utilizadas

- **HTML5 Semântico**: Acessibilidade e tags adequadas para formulários e painéis.
- **CSS3 Moderno (Liquid Glass)**:
  - `backdrop-filter: blur(...)` e `-webkit-backdrop-filter` para o efeito de vidro fosco.
  - Efeito orgânico de esferas de luz ambientais (*ambient blobs*) animadas em segundo plano.
  - Paleta com variáveis CSS (`[data-theme="dark"]` e `[data-theme="light"]`) com alternância em tempo real e persistência no `localStorage`.
  - Design 100% responsivo para celulares, tablets e desktops.
- **JavaScript Moderno (ES6+ / ES Modules)**: Importação nativa sem necessidade de bundlers pesados para desenvolvimento rápido.
- **Firebase v10.8.0**:
  - **Firebase App**: Inicialização e configuração da aplicação `veu-rpg`.
  - **Firebase Authentication**: Gerenciamento de sessões, login, registro e redefinição de senha por e-mail.
  - **Cloud Firestore**: Banco NoSQL pronto para armazenamento das fichas e perfis de jogadores.

---

## 🔐 Módulos e Recursos de Autenticação

1. **Card de Acesso com Alternância de Abas**:
   - **Entrar**: Login com validação de campos e feedback instantâneo.
   - **Cadastrar**: Criação de conta com Nome de Jogador, E-mail, Senha e Confirmação.
   - **Recuperar**: Envio seguro de e-mail de redefinição de senha via Firebase.
2. **Tratamento Amigável de Erros (em Português)**:
   - Tradução de códigos de erro do Firebase (ex.: `auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`, `auth/user-not-found`, etc.).
   - Alertas visuais estilizados no padrão glassmorphism com ícones de sucesso ou erro.
3. **Alternador de Visibilidade de Senha**: Botão para exibir ou ocultar senhas digitadas.
4. **Proteção de Rotas (Auth Guard)**:
   - Em `index.html`: Usuários já autenticados são redirecionados automaticamente para `app.html`.
   - Em `app.html`: Usuários não autenticados são redirecionados automaticamente para `index.html`.
   - Botão de logout com suporte a encerramento seguro de sessão.

---

## 🎲 Painel Geral e Gestão de Campanhas (Fase 2)

1. **Layout Responsivo Adaptável**:
   - **PC / Desktop**: Barra lateral retrátil (*Sidebar*) com botão hambúrguer (☰) para alternar entre modo expandido e compacto (ícones), perfil do usuário, navegação rápida (Campanhas, Perfil, Configurações) e botão de Sair.
   - **Mobile**: Barra de navegação inferior flutuante (*Floating Bottom Navigation Bar*) em formato pílula com efeito Liquid Glass para alternância rápida entre seções.
2. **Seção de Campanhas**:
   - Botões principais: **Criar Nova Campanha** e **Entrar em Campanha**.
   - **Grid de Cards Quadrados com Liquid Glass**:
     - Capa com imagem de fundo e overlay escuro/translúcido suave.
     - Título em destaque, badges para papel do usuário (*Mestre* ou *Jogador*), sistema de regras (*Sistema A* ou *Sistema B*) e pílula com o código de convite.
     - Sincronização em tempo real via Cloud Firestore (`onSnapshot`).
   - **Painel de Gerenciamento da Campanha**:
     - Visualização expandida ao clicar no card da campanha.
     - Exibição em destaque do código de convite com botão de cópia com 1 clique.
     - Lista de jogadores membros e informações do Mestre.
3. **Modais de Ação**:
   - **Criar Campanha**: Nome da campanha, seletor de sistema (Sistema A / Sistema B), upload de capa a partir do dispositivo com **Cropper Interativo 16:9** (ajuste de zoom, reposicionamento livre e corte), drag & drop de arquivos na área de prévia, entrada alternativa por URL e geração de código de convite único de 6 caracteres (ex.: `VEU7K2`).
   - **Entrar em Campanha**: Entrada do código de 6 caracteres, validação no Firestore e inclusão automática do usuário na lista de jogadores (`players`).
4. **Perfil e Configurações**:
   - **Upload e Ajuste de Foto de Perfil (Avatar Cropper)**: Suporte completo para subir ícone/foto de perfil com recorte circular interativo em HTML5 Canvas, ajuste de zoom (slider, botões +/- e roda do mouse), reposicionamento livre por arrasto (mouse e touch em celulares) e compressão otimizada salva no Firebase Auth e Firestore.
   - **Perfil**: Exibição do e-mail do usuário autenticado, atualização do Nome de Exibição e disparo de e-mail de redefinição de senha.
   - **Configurações**: Alternador manual de temas Claro / Escuro com persistência local.

---

## ⚔️ Painel da Campanha, Visão de Mestre e Jogador (Fase 3)

Ao clicar em qualquer card de campanha, o usuário é direcionado para o **Workspace da Campanha** (`assets/js/campaign.js`), onde o sistema detecta automaticamente seu papel (*Mestre* ou *Jogador*):

### 1. Visão do Mestre (GM Dashboard)
O Mestre tem controle completo sobre a mesa através de um menu de abas navegável:
- **Aba Fichas**:
  - Grid com todas as fichas de personagens da campanha em tempo real.
  - Criação rápida de novas fichas com definição de Raça, Classe, Nível, Pontos de Vida (HP), Mana (MP) e Classe de Armadura (CA/Defesa).
  - Modal para **atribuir a ficha** a qualquer jogador conectado na campanha ou deixá-la como não atribuída.
  - Modal de **confirmação de exclusão** de ficha para evitar exclusões acidentais.
- **Aba Jogadores**:
  - Exibição em destaque do código de convite de 6 caracteres com botão para copiar com 1 clique.
  - Listagem dos membros conectados com seus respectivos avatares e e-mails.
  - Modal para **remover jogador** da campanha com confirmação.
- **Aba Escudo do Mestre (GM Screen)**:
  - **Resumo dos Players (HUD Vital)**: Visão rápida dos status vitais (HP com barra de vida colorida dinâmica, Mana e CA) de todas as fichas dos jogadores, com botões interativos `-1` e `+1` de HP em tempo real que sincronizam direto no Firestore, além de atalho para **abrir a ficha completa**.
  - **NPCs e Inimigos Rápidos**: Painel para criar e visualizar fichas rápidas de monstros e NPCs (Nome, Tipo, HP atual/máximo, CA e notas de combate).
  - **Gerenciador de Iniciativa**: Controle completo de combate com adição de combatentes (nome, bônus e valor de iniciativa), botão para **Rolar Todos os d20** automaticamente, ordenação decrescente por iniciativa, e botões para avançar/retroceder o turno com destaque visual no participante da vez.
- **Aba Compendium**:
  - Catálogo de regras e conteúdos da campanha categorizado por pílulas filtráveis: *Raças*, *Classes*, *Itens*, *Magias*, *Habilidades* e *Monstros Prontos*.
  - Campo de busca instantânea por título e descrição.
  - Modal para criar novos verbetes com propriedades chave-valor e descrição.
- **Aba Configurações da Campanha**:
  - Edição do Nome da Campanha, Sistema de Regras (Sistema A / Sistema B) e **Upload e Ajuste de Nova Imagem de Capa** diretamente do dispositivo com o cropper 16:9 integrado ou por URL.
  - **Duplicar Campanha**: Modal para clonar a crônica com seleção granular do que replicar através de checkboxes (*Compendium*, *NPCs do Escudo do Mestre*, *Fichas de Jogadores*), gerando um novo código de convite único.
  - **Zona de Perigo (Excluir Campanha)**: Exclusão permanente com **dupla confirmação** obrigatória (exige que o Mestre digite o nome exato da campanha para autorizar a exclusão).

### 2. Visão do Jogador (Player Dashboard)
- Acesso simplificado e focado: abas restritas ao Mestre (*Escudo do Mestre* e *Configurações*) são automaticamente ocultadas.
- O jogador visualiza apenas as **fichas de sua autoria** ou fichas que foram atribuídas a ele pelo Mestre.
- Botão **"Criar Nova Ficha"**: cria a ficha já vinculada ao UID do jogador logado, ficando instantaneamente visível para o Mestre no Escudo do Mestre e no grid de fichas.

### 3. Modelo de Dados no Cloud Firestore
A persistência utiliza uma estrutura hierárquica e subcoleções para isolamento e escalabilidade:
```text
campaigns/{campaignId}
├── (campos: name, system, coverUrl, inviteCode, masterId, masterName, players, playerDetails, createdAt)
├── sheets/{sheetId}        # Fichas da campanha (ownerId, ownerName, name, race, class, level, currentHp, maxHp, currentMp, maxMp, ac)
├── npcs/{npcId}            # NPCs/Monstros rápidos do GM Screen (name, npcType, currentHp, maxHp, ac, notes)
└── compendium/{itemId}     # Verbetes do compendium (title, category, properties, description)
```

---

## 🚀 Como Executar Localmente

Como o projeto utiliza **ES Modules** (`import` / `export`), os navegadores exigem que os arquivos sejam servidos via protocolo HTTP/HTTPS (e não via `file://`).

Você pode utilizar qualquer servidor web simples:

### Opção 1: VS Code Live Server
1. Instale a extensão **Live Server** no VS Code.
2. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.

### Opção 2: Python 3
No terminal, dentro da pasta raiz do projeto:
```bash
python3 -m http.server 8000
```
Depois acesse `http://localhost:8000` no seu navegador.

### Opção 3: Node.js (npx serve)
```bash
npx serve .
```

---

## 🔮 Próximos Passos

- [ ] Tela detalhada de Ficha Completa (atributos 3D&T/D&D/Custom, perícias, inventário com peso/moedas e árvore de habilidades).
- [ ] Rolador de dados embutido com física e histórico no chat da campanha.
- [ ] Chat da mesa em tempo real integrado ao Escudo do Mestre com sussurros para o mestre.
