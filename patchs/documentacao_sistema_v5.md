# Arquitetura inicial — Sistema V5

## Objetivo e escopo

A V5 inicia uma aplicação isolada em [`/v5`](../v5), sem alterar V1, V2, V3 ou V4. Essas versões são legadas, permanecem fora desta arquitetura e não tiveram seus dados migrados. Este PR entrega somente a fundação: não há login visual, OAuth executado, campanhas, fichas, compêndio, cronograma, perfil, configurações, VTT ou regras de RPG.

## Estrutura

```text
v5/
├── core/
│   ├── auth/             # Fachada do Firebase Authentication
│   ├── config/           # Configuração da aplicação e Firebase Web
│   ├── firebase/         # Único ponto de inicialização do Firebase
│   ├── notifications/    # Modelo serializável de notificações
│   ├── permissions/      # API central de papéis/autorização
│   ├── router/           # Router hash simples e guardas de rota
│   └── storage/          # Caminhos e referências do Firebase Storage
├── modules/              # Pontos de entrada independentes por área
├── ui/
│   ├── components/       # Componentes pequenos reutilizáveis
│   └── styles/           # Tokens e estilos compartilhados
├── index.html
└── main.js
```

## Responsabilidades e decisões

- **UI → Core → Firebase:** módulos renderizam interfaces; serviços do core concentram dados e infraestrutura. A UI não inicializa Firebase.
- **Firebase:** `core/firebase/firebase.js` cria/reutiliza a única Firebase App da V5 e disponibiliza Authentication, Realtime Database e Storage. A configuração Web é pública por definição; chaves administrativas, tokens privados, service accounts e senhas nunca pertencem ao cliente.
- **Autenticação:** a fachada está preparada para email/senha e declara Google, Microsoft e Discord como provedores futuros. Senhas são tratadas exclusivamente pelo Firebase Authentication; o modelo de perfil V5 não possui campo `password`.
- **Modelo de usuário futuro:** `v5/users/{uid}` utilizará o UID do Firebase Authentication e poderá conter `username`, `email`, `photoURL`, `bannerURL`, `description`, `createdAt` e `updatedAt`.
- **Permissões:** `permissions.js` centraliza OWNER, MASTER e PLAYER, evitando verificações dispersas. Isso serve apenas à ergonomia da interface: Firebase Security Rules devem ser a autoridade final para usuários, campanhas, fichas, compêndio e associações.
- **Router:** hash routing mantém compatibilidade com hospedagem estática e evita múltiplos HTMLs. Rotas podem declarar `requiresAuth`; a autenticação real será conectada ao estado do Firebase em PR futuro.
- **Storage:** imagens usam caminhos no Firebase Storage, nunca blobs grandes no Realtime Database.
- **Notificações:** o modelo inclui ID, usuário, tipo, título, mensagem, data, leitura, campanha e recurso relacionado. A futura apresentação será overlay da Home, não uma página.
- **Tema e responsividade:** `core/config/theme.js` altera e persiste o tema centralmente; tokens CSS em propriedades customizadas aplicam claro/escuro sem duplicar a folha. A navegação é uma sidebar no desktop e dock horizontal rolável no mobile.
- **Componentes:** Button, IconButton, Card, Modal, Input, Select, Avatar, Badge, Toast, Loading, EmptyState e Navigation são funções DOM pequenas em `ui/components`, sem framework ou abstração excessiva.

## Segurança e Firebase Rules

A ocultação de botões, páginas ou menus não é segurança. Antes de qualquer módulo gravar dados, um PR futuro deve adicionar e validar Firebase Security Rules que limitem leituras/gravações por `auth.uid`, membros de campanha e papéis. A raiz de dados reservada para a V5 é `v5`, sem renomear nem tocar em nós legados como `fichas_v3`, `fichas_v4`, `banco_dados_v4` ou calendário.

## Deliberadamente adiado

CRUD de usuário, telas de autenticação, execução de OAuth, persistência de módulos, regras do Firebase, migração da V4, PWA V5 dedicado e toda regra de domínio/RPG serão tratados em PRs específicos. A V5 não adiciona dependências, Cloud Functions, serviços pagos nem APIs comerciais.

## Validação sugerida

Sirva o repositório por HTTP estático e abra `/v5/`. Confirme que a Home renderiza, os imports ES Modules carregam, a navegação responsiva aparece e a indisponibilidade de Firebase não quebra a interface. Abra também as entradas existentes V1–V4 para confirmar que a adição isolada não alterou seus arquivos.
