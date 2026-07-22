# 📜 Documentação Interna do Sistema & Patch v4

> **Documento Privado de Controle Interno**  
> **Sistema**: Escória de Deus — Sistema de RPG  
> **Versão Ativa**: v4 (Patch: `patch-v4`)  
> **Data de Atualização**: 22 de Julho de 2026

---

## 1. 🏗️ Visão Geral da Arquitetura do Sistema

O sistema de RPG **Escória de Deus** é uma aplicação web desacoplada construída com HTML5, CSS Vanilla moderno e JavaScript ES6+, integrada ao **Firebase Realtime Database** e **Firebase Authentication**.

### 📁 Estrutura de Pastas e Arquivos Principais

```text
/workspaces/ed-rpg-fichas/
├── index.html                   # Hub central de acesso, autenticação e listagem de fichas (V3 / V4)
├── perfil.html                  # Perfil do jogador e configurações da conta
├── configs/                     # Arquivos globais de configuração e autenticação
│   ├── auth.js                  # Inicialização do Firebase e persistência de login
│   ├── sw.js                    # Service Worker (PWA)
│   └── manifest.webmanifest     # Manifesto da aplicação PWA
├── v1/                          # Arquivos legados da Versão 1 (Fichas, Grimório, Calendário V1)
├── v2/                          # Arquivos legados da Versão 2
├── v3/                          # Versão 3 do sistema (Fichas V3, Banco de Dados V3, Tabletop)
├── v4/                          # Versão 4 ATIVA do sistema
│   ├── ed_sistemav4_ficha.html          # Ficha de Personagem v4 (PM em bolinhas, Habilidades, Recursos)
│   ├── ed_sistemav4_bancodedados.html    # Compêndio v4 (Técnicas v4, Deuses, Raças, Classes, Equipamentos)
│   ├── ed_sistemav4_criadordetecnicas.html # Criador visual de técnicas v4
│   ├── ed_sistemav4_calendario.html      # Calendário e relógio do mundo de jogo
│   ├── ed_sistemav4_mestre.html          # Painel de controle do Mestre e Gerenciador de NPCs
│   ├── ed_sistemav4_overlay.html         # Overlays para transmissões (OBS)
│   └── ed_sistemav4_painelcentral.html   # Painel central da campanha
└── patchs/                      # Registro e documentação privada de atualizações do sistema
    └── documentacao_sistema_v4.md # Este documento
```

---

## 2. 🗄️ Estrutura do Banco de Dados (Firebase Realtime DB)

O banco de dados é estritamente separado por versão para evitar conflito de dados ou perda de fichas legadas:

- **`fichas_v3/`**: Fichas cadastradas e utilizadas na Versão 3 do sistema.
- **`fichas_v4/`**: Novas fichas exclusivas da Versão 4 do sistema.
  - Subcaminhos principais: `/atributos`, `/habilidades/tecnicas`, `/habilidades/armas`, `/recurso_custom`, `/status`.
- **`banco_dados_v4/`**: Banco de dados público do Compêndio V4.
  - `/racas`: Linhagens e habilidades raciais.
  - `/classes`: Classes e habilidades de classe.
  - `/tecnicas_v4`: Técnicas cadastradas pelo ADM (Física, Feitiço, Clamor).
  - `/deuses`: Panteão de deuses cadastrados no compêndio.
  - `/equipamentos`, `/caminhos_arcanos`, `/ascensao_arcana`, `/efeitos_secundarios`.
- **`calendario/`**: Registro global do tempo da campanha (dia, mês, ano, período do dia, relógio).

---

## 3. 🎯 Detalhamento das Alterações do Patch V4 (`patch-v4`)

### 3.1. Hub Central (`index.html`)
- **Separação de Dados**: O Hub identifica a versão ativa escolhida pelo usuário (`currentActiveVersion = 'v3'` ou `'v4'`).
- **Alternância V3 ↔ V4**: O botão superior no Hub altera a versão ativa sem redirecionar para painéis antigos.
- **Roteamento**: Fichas V3 abrem em `v3/ed_sistemav3_ficha.html` e Fichas V4 em `v4/ed_sistemav4_ficha.html`.

### 3.2. Menu de Navegação Global (`☰`)
- Adicionado o botão flutuante com três barras (`☰`) e menu deslizante em todas as páginas das versões V3 e V4.
- Permite retornar ao Hub, acessar o Compêndio, Calendário ou realizar Logout a qualquer momento.

### 3.3. Sistema de Pontos de Mana (PM) na Ficha V4 (`v4/ed_sistemav4_ficha.html`)
- **Redesign Visual**: Substituída a barra de mana por orbes brilhantes interativos (bolinhas de PM).
- **Fórmula de PM Base**:
  $$\text{PM Base} = \max(1, \min(10, \text{Habilidade} \times 2))$$
  - Caso o atributo Habilidade seja 0 ou menor, a quantia mínima é sempre 1.
  - O valor base máximo calculado via atributo Habilidade é sempre 10.
- **Integração com Recurso Customizável**: O campo `mana_adicional` do Recurso Customizável soma-se ao PM base, permitindo atingir valores acima de 10.
- **Controles de Seleção**: Suporte a incremento (`+`), decremento (`−`) e clique direto em qualquer orbe para definir o gasto de mana atual.

### 3.4. Compêndio V4 (`v4/ed_sistemav4_bancodedados.html`)
- **Remoção de Abas Legadas**: Removidas as abas *Técnicas old*, *Técnicas v2* e *Lógica de Técnicas*.
- **Aba de Técnicas v4**:
  - Fluxo de criação com seleção obrigatória do tipo: **FÍSICA**, **FEITIÇO** ou **CLAMOR**.
  - Especificações por tipo:
    - **Física**: *Nome, Tipo, Alcance, Teste, Custo PM (campo numérico em destaque), Exigências, Descrição e Imagem*.
    - **Feitiço**: *Nome, Tipo, Alcance, Teste, Custo PM, Exigências, Foco Arcano, Descrição e Imagem*.
    - **Clamor**: *Nome, Tipo, Alcance, Teste, Custo PM, Exigências, Conexão Divina (Dropdown), Descrição e Imagem*.
  - Botão de *"Não possui"* em campos opcionais para preenchimento rápido.
- **Aba de Deuses (`deuses`)**:
  - Cadastro de Deuses com *Nome, Alcunha, Domínio, Descrição/Dogmas e Imagem*.
  - O campo *Conexão Divina* da técnica do tipo Clamor carrega automaticamente a lista de Deuses cadastrados nesta aba.

### 3.5. Integração e Filtros de Técnicas na Ficha V4
- **Remoção de Criação Direta**: Removido o botão de criação manual direta na ficha do jogador para manter a integridade das regras do compêndio.
- **Botão `📚 Banco`**:
  - Abre o modal do banco de técnicas da V4 (`tecnicas_v4`).
  - Filtro por palavra-chave (*Nome, Descrição ou Exigências*).
  - Filtro por Tipagem (*Todas, Física, Feitiço, Clamor*).
  - Filtro por Custo de PM (*Qualquer PM, 0 PM, 1 PM, 2 PM, 3 PM, 4 PM, 5+ PM*).
- **Cards de Técnicas na Ficha**:
  - Imagem de ilustração nítida e visível na prévia.
  - Insígnia do Tipo (*Física / Feitiço / Clamor*), Custo de PM e Nome em destaque.
  - Ao clicar no card, abre a janela de detalhes com um cabeçalho vertical organizado de especificações (*Alcance, Teste, Exigências, Foco Arcano, Conexão Divina*) e a imagem em tamanho completo via tag `<img>`.

### 3.6. Correções de Bugs e Interface
- **Calendário (`v1` e `v4`)**: Corrigido erro de sintaxe JS no `setCustomTime` que travava o aplicativo na tela "CARREGANDO...". Removida a rolagem automática de tela ao alterar dia/hora/período.
- **Títulos das Páginas**: Atualizada a tag `<title>` do navegador de *"Ficha V3"* para *"Ficha - Escória de Deus"*.

---

## 4. 🔒 Controle de Alterações Git

- **Branch de Desenvolvimento**: `patch-v4`
- **Pull Request GitHub**: [#52 - patch-v4](https://github.com/reeporty088/ed-rpg-fichas/pull/52)
