# Escória de Deus RPG — Sistema de Fichas V3

> Repositório do sistema de fichas digitais do **Escória de Deus RPG (3ºE)**, conectado ao Firebase Realtime Database. As fichas rodam no navegador e em dispositivos móveis, com salvamento em tempo real.

---

## Índice

- [Visão Geral do Projeto](#visão-geral-do-projeto)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Firebase — Configuração e Estrutura do Banco](#firebase--configuração-e-estrutura-do-banco)
- [Sistema de Regras — Referência Completa](#sistema-de-regras--referência-completa)
  - [Atributos](#atributos)
  - [Perícias](#perícias)
  - [Recursos (PV e PM)](#recursos-pv-e-pm)
  - [Rolagem de Dados](#rolagem-de-dados)
  - [Defesa e Espaços de Proteção](#defesa-e-espaços-de-proteção)
  - [Raças e Linhagens](#raças-e-linhagens)
  - [Classes e Vertentes](#classes-e-vertentes)
  - [Progressão e XP](#progressão-e-xp)
  - [Proficiência em Armas](#proficiência-em-armas)
  - [Arcana e Técnicas](#arcana-e-técnicas)
  - [Ascensão Arcana e Pulso](#ascensão-arcana-e-pulso)
  - [Maldições e Dádivas](#maldições-e-dádivas)
- [Ficha V3 — Estrutura HTML](#ficha-v3--estrutura-html)
- [Convenções de Código](#convenções-de-código)

---

## Visão Geral do Projeto

O sistema de fichas é uma aplicação web single-page (HTML + CSS + JavaScript vanilla com Firebase SDK via CDN). Não há framework front-end — toda a lógica é JavaScript puro com módulos ES6.

**Stack:**
- HTML5 / CSS3 / JavaScript ES6 (módulos)
- Firebase Realtime Database (SDK v10.8.0 via CDN)
- Google Fonts: Cinzel (títulos) + Crimson Pro (texto)
- Sem bundler, sem dependências npm na ficha em si

**Versões do sistema:**
| Versão | Arquivo | Coleção Firebase | Base de Regras |
|--------|---------|-----------------|----------------|
| 1ºE | `ficha_v1.html` | `fichas_v1/` | 3DET Victory |
| 2ºE | `ficha_v2.html` | `fichas_v2/` | Daggerheart modificado |
| **3ºE** | `ficha_v3.html` | `fichas_v3/` | **Sistema próprio (atual)** |

A ficha é identificada por um parâmetro de URL: `ficha_v3.html?p=nome_do_personagem`. Se nenhum parâmetro for passado, usa `personagem_padrao_v3`.

---

## Estrutura de Arquivos

```
/
├── ficha_v3.html          # Ficha principal do sistema 3ºE (arquivo central)
├── ficha_v2.html          # Versão legada (2ºE) — não modificar
├── ficha_v1.html          # Versão legada (1ºE) — não modificar
├── auth.js                # Script de autenticação (carregado via <script src>)
├── README.md              # Este arquivo
└── overlay/               # Arquivos do overlay para OBS (se existir)
```

---

## Firebase — Configuração e Estrutura do Banco

### Config Firebase

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCvxxwfsonP5a45nbcz34cxYhXaWBZVhwQ",
    authDomain: "ed-rpg---sistema-de-fichas.firebaseapp.com",
    databaseURL: "https://ed-rpg---sistema-de-fichas-default-rtdb.firebaseio.com",
    projectId: "ed-rpg---sistema-de-fichas",
    storageBucket: "ed-rpg---sistema-de-fichas.firebasestorage.app",
    messagingSenderId: "350999444010",
    appId: "1:350999444010:web:d89f31d13e449b8fbfa153"
};
```

### Caminho base de uma ficha

```
fichas_v3/{fichaID}/
```

### Estrutura completa de uma ficha no banco

```jsonc
{
  "char_name": "Nome do Personagem",
  "nivel": 1,
  "florins": 500,
  "classe": "Vanguarda",
  "ancestralidade": "Dragór",
  "vertente": "Cavaleiro Inabalável",

  // Atributos (0-5)
  "poder": 3,
  "habilidade": 2,
  "resistencia": 2,

  // Recursos
  "hp_at": 15,
  "hp_max": 15,
  "pm_at": 20,
  "pm_max": 20,
  "pulso_at": 0,   // Pulso de Ascensão — começa em 0, não tem máximo fixo

  // XP e Pontos
  "xp_total": 0,
  "pp_total": 2,   // Pontos de Proficiência
  "pdt_total": 1,  // Pontos de Técnica

  // Defesa
  "armor_max": 5,        // Espaços de proteção permanentes
  "armor_temp": 0,       // Espaços temporários
  "armor_used": {
    "s0": true,          // Espaço 0 gasto
    "s1": false
  },

  // Perícias (0-4 pontos cada)
  "pericias": {
    "Animais": 0,
    "Arte": 1,
    "Atirar": 2,
    // ... todas as 20 perícias
  },

  // Proficiências em armas (0-3 graus)
  "proficiencias": {
    "pesadas": 2,
    "ageis": 0,
    "distancia": 1,
    "arcanos": 0,
    "desarmado": 0
  },

  // Habilidades organizadas por categoria
  "habilidades": {
    "classe_hab": {
      "-NxID123": { "titulo": "Postura Inabalável", "desc": "..." }
    },
    "raca_hab": {
      "-NxID456": { "titulo": "Baforada de Aurora", "desc": "..." }
    },
    "passivas": {
      "-NxID789": { "titulo": "Nome", "desc": "...", "custo": "" }
    },
    "especiais": {
      "-NxIDabc": { "titulo": "Nome", "desc": "...", "custo": "" }
    },
    "armas": {
      "-NxIDdef": {
        "titulo": "Espada Longa",
        "atributo": "Poder",
        "dano_slots": "1d8",
        "alcance": "Corpo a corpo",
        "tipo_dano": "Corte",
        "desc": "Versátil..."
      }
    },
    "inventario": {
      "-NxIDghi": { "titulo": "Poção de Cura", "desc": "...", "custo": "150F" }
    }
  },

  // Técnicas (sistema próprio da 3ºE)
  "tecnicas": {
    "-NxIDjkl": {
      "nome": "Nome da Técnica",
      "pm": "8",
      "caminho": "Emissor",
      "alcance": "4 blocos",
      "dados": "2d6",
      "desc": "Descrição do efeito..."
    }
  },

  // Ascensão Arcana (desbloqueada no nível 7+ com atributo 5)
  "ascensao": {
    "-NxIDmno": {
      "nome": "Punho Negro",
      "atributo": "Poder (Punho Negro)",
      "pulso": "1",
      "desc": "Ignora espaços de proteção..."
    }
  },

  // Toggles e estados especiais
  "toggles": {
    "linhagem_1": true,       // Habilidade Universal Demoníaco desbloqueada
    "linhagem_2": null,       // Habilidade Universal Animalesco — null = não tem
    "linhagem_3": null,       // Habilidade Universal Sacra
    "forma_ativa": "demon",   // Qual forma de linhagem está ativa agora (null se nenhuma)
    "dadivas": {
      "mascara_lunar": true,  // Personagem tem esta maldição/dádiva
      "combustao_arcana": false
    },
    "dadivas_ativas": {
      "mascara_lunar": true   // Maldição/dádiva está ativa no momento
    }
  },

  // Imagens (base64 JPEG/PNG, comprimidas a max 600px)
  "char_img": "data:image/jpeg;base64,...",
  "overlay_img": "data:image/jpeg;base64,...",

  // UI
  "color_theme": "sangue",
  "anotacoes": "Texto livre..."
}
```

### Banco de Dados Global (compêndio)

Lido em `banco_dados_v2/` (compartilhado entre versões):

```
banco_dados_v2/
├── classes/         # Dados de cada classe
├── racas/           # Dados de cada raça
├── passivas/        # Vantagens passivas disponíveis
├── equipamentos/    # Armas e armaduras do catálogo
└── maldicoes_dadivas/ # Maldições e Dádivas com lore e efeitos
```

---

## Sistema de Regras — Referência Completa

### Atributos

Três atributos, valor de **0 a 5**. Máximo inicial na criação: **3**.

| Atributo | Abreviação | Função principal |
|----------|-----------|-----------------|
| Poder | P | Ataques pesados, força bruta, magias destrutivas |
| Habilidade | H | Ataques ágeis/distância, furtividade, magias de controle. Define PM máximo |
| Resistência | R | Resistência a condições, venenos, medo. Define PV máximo |

**Fórmulas derivadas:**
- `PV máximo = 5 × Resistência + perícia Vitalidade`
- `PM máximo = 10 × Habilidade + perícia Energia`
- `Armadura Natural = 6` (fixo para personagens nível 1+)
- `Limiar Leve = 1`
- `Limiar Grave = 5 + (Resistência × 2)`
- `Limiar Massivo = 10 + (Resistência × 3)`

---

### Perícias

20 perícias no total. Cada ponto vale **+1d4** nos testes. Máximo de **4 pontos** por perícia.

**Lista completa:**
`Animais`, `Arte`, `Atirar`, `Conhecimento`, `Energia`, `Esquiva`, `Esporte`, `Fortitude`, `Influência`, `Intuição`, `Ladinagem`, `Luta`, `Máquinas`, `Medicina`, `Mente`, `Mística`, `Percepção`, `Sobrevivência`, `Vitalidade`, `Vontade`

Na criação: **10 pontos**, máximo **2** por perícia. Limite de criação de 2 só se aplica ao distribuir pontos — bônus de raça/classe podem ultrapassar.

---

### Recursos (PV e PM)

**Pontos de Vida (PV):**
- Fórmula: `5 × R + Vitalidade`
- Recuperação: apenas via Tratamento Médico (descanso curto) ou automaticamente no Descanso Longo

**Pontos de Mana (PM):**
- Fórmula: `10 × H + Energia`
- Recuperação em combate: `+2d6 PM` no início de cada turno; `+1d6 PM` extra em Sucesso Crítico
- Recuperação fora de combate: PM completamente restaurado no início de cada nova cena (com intervalo razoável entre cenas)
- **Não existe recuperação de PM em descanso curto ou longo** — o PM se restaura naturalmente fora de combate

---

### Rolagem de Dados

**Teste padrão:** `2d6 + atributo + perícia (d4s)`

**Modos de rolagem:**
- **Normal:** rola 2d6, soma ambos
- **Ganho (Vantagem):** rola 3d6, soma os dois maiores
- **Perda (Desvantagem):** rola 3d6, soma os dois menores (ou apenas 1d6 em situações extremas)

**Resultados especiais:**
| Resultado | Condição | Efeito |
|-----------|---------|--------|
| Sucesso Crítico | Os dois dados mostram o mesmo valor (ex: 4 e 4) | Dano dobrado em ataques; sucesso brilhante em testes |
| Crítico Perfeito | 6 e 6 | Efeitos máximos, dobra benefícios |
| Falha Crítica | 1 e 1 | Consequências narrativas graves (mestre decide) |

Ganho e Perda **se anulam**: 1 Ganho + 1 Perda = rolar normal.

---

### Defesa e Espaços de Proteção

**Armadura Natural (AN):** valor fixo **6** para personagens nível 1+. Para acertar um personagem sem defesa ativa, o atacante precisa tirar **igual ou maior** que a AN nos dados.

**Formas de defesa (uma por ataque recebido):**
1. **Esquiva:** teste de 2d6 + Habilidade + Esquiva vs. resultado do ataque. Se maior, não recebe dano.
2. **Defender:** não se move; recebe o ataque mas subtrai `AN + Resistência + Fortitude` do dano.
3. **Contra-Ataque:** ataca o adversário; se vencer, cancela o ataque inimigo e causa 1 ataque básico. Tem Perda. Só corpo a corpo.

**Espaços de Proteção:**
- Concedidos por armaduras, escudos, habilidades e magias
- Cada espaço gasto **anula 1 ponto de dano**
- Quando todos os espaços acabam, o item se quebra
- Espaços temporários (de magias) somem quando usados ou ao fim da cena
- Recuperação: Descanso Curto restaura espaços de armaduras e escudos; Descanso Longo restaura espaços naturais de raça

---

### Raças e Linhagens

Três linhagens, cada uma com uma **Habilidade Universal** e raças específicas:

#### Animalesco
**Universal — Despertar Primordial** (5 PM, 1x/cena, 2 cenas de recarga): frenesi bestial, +1d6 dano, dano reduzido pela metade, sem magias complexas.

Raças: `Dragór`, `Etínaro`, `Harpian`, `Lyzaardo`, `Mence's`, `Mermaid's`, `Nytára`

#### Demoníaco
**Universal — Chamado do Inferno** (8 PM + ação completa, 1x/sessão): ignora condições, -2 PM em técnicas, Ganho em ataques. Fica Exausto depois.

Raças: `Carnítes`, `Dusa`, `Filho de Mirah`, `Infermo`, `Oní`, `Receptáculo`, `Sanguinário Carmesim`

#### Sacra
**Universal — Vislumbre da Evolução** (6 PM, 1x/cena): Ganho em P e H + 1d6 dano por 1 rodada. Depois: 1d4 dano direto + perde 4 PM.

Raças: `Emaranhado`, `Esféu`, `Estrela Fantasma`, `Lunariano Amaldiçoado`, `Pináculo de Matéria Escura`, `Sacra Contido`, `Sacra Liberto`

#### Discente (Sangue Misto)
- **Sangue-Duplo** (2 raças): escolhe 3 habilidades divididas livremente + Habilidades Universais de ambas se linhagens diferentes
- **Quimera** (3 raças): 1 habilidade de cada raça + apenas 1 Habilidade Universal

**Na ficha:** os toggles `linhagem_1` (Demoníaco), `linhagem_2` (Animalesco) e `linhagem_3` (Sacra) controlam quais botões de forma aparecem. Definidos automaticamente ao selecionar raça no compêndio.

---

### Classes e Vertentes

9 classes, cada uma com:
- **Habilidade Única:** exclusiva da classe, fora do sistema de técnicas
- **3 Vertentes:** cada uma define Caminhos de Arcana, bônus de perícias e habilidade de vertente
- **Equipamento básico**
- **Origem:** definida narrativamente com o mestre

| Classe | Habilidade Única |
|--------|-----------------|
| Vanguarda | Postura Inabalável (absorve 1d4 dano ou redireciona ataque, sem PM) |
| Arruaceiro | Golpe Sujo (Ganho + 1d6 em condições favoráveis, escala 5/9) |
| Monge | Fluxo Elemental (3 PM imbui elemento, efeito secundário no crítico) |
| Tecelante | Fios do Destino (3 PM, até 3 fios: aliado/inimigo/preso) |
| Arauto Dominante | Legião do Túmulo (servo permanente, 3 PM: atacar/proteger/perturbar) |
| Teurgo | Sobrecarga Mística (1d4 dano direto: máximo/alvo extra/PM grátis) |
| Performante | O Show Tem que Continuar (crítico = aliado +5 PM; 6 PM = Performance de Guerra) |
| Discípulo da Fé | Evangelho Doloroso (efeito negativo = cura 1d4 PV ou +1 turno ou Ganho aliado) |
| Bruxo | Imantar Equipamento (4 PM, elemento à escolha, 3 PM força efeito secundário) |

---

### Progressão e XP

10 níveis + sistema "Além do Nível 10" (bônus +1, +2, etc.).

**Tiers:**
| Tier | Níveis | Descrição |
|------|--------|-----------|
| Despertar | 1–3 | Ameaças locais, Arcana instável |
| Sobrevivente | 4–6 | Facções, ameaças regionais |
| Herói de Eko | 7–9 | Reconhecido, Ascensão possível |
| Lenda Viva | 10 | Ápice mortal |

**O que se ganha por nível:**

Todo nível (2–10): `+1 PDT` + `+2 pontos de perícia`

Níveis pares (2,4,6,8,10): `+1 atributo` + `+1 habilidade de caminho` (a partir do 6: qualquer caminho)

Níveis ímpares (3,5,7,9): Melhoria de Combate (escolha uma):
- Couro Espesso: +1 espaço de proteção permanente
- Reserva Expandida: +5 PM máximo
- Vitalidade Forjada: +3 PV máximo
- Reflexos Treinados: 1x/sessão rerrola um dado

Níveis 5 e 9 também concedem: **Especialização de Vertente** (~50% de melhoria na habilidade de vertente)

**PP (Pontos de Proficiência):** 2 na criação, +1 a cada nível par.

**Além do Nível 10:**
Bônus ímpares (+1,+3...): +1 PDT, +2 perícia, Melhoria de Combate
Bônus pares (+2,+4...): +1 PDT, +2 perícia, +1 atributo, +1 habilidade caminho, +1 PP

---

### Proficiência em Armas

5 categorias, 3 graus cada. Custo: 1 PP por grau.

| Grau | Nome | Bônus |
|------|------|-------|
| 0 | Sem proficiência | Apenas dano base |
| 1 | Treinado | +1d4 dano extra |
| 2 | Experiente | +1d6 dano extra; crítico = dado de dano 2x |
| 3 | Mestre | +1d8 dano extra; crítico = dado 3x; Golpe de Mestre (1x/combate): Ganho + ignora todos espaços de proteção |

**Categorias:**
- `pesadas` — Espadas 2H, machados, martelos, lanças. Usa PODER.
- `ageis` — Adagas, floretes, chicotes. Usa HABILIDADE.
- `distancia` — Arcos, bestas, armas de fogo. Usa HABILIDADE.
- `arcanos` — Cajados, grimórios, orbes, instrumentos. Usa HABILIDADE ou PODER.
- `desarmado` — Socos, chutes, técnicas marciais. Usa PODER ou HABILIDADE.

---

### Arcana e Técnicas

**Arcana Dormente (3 habilidades passivas):**
- **Envolver:** emite aura passivamente, cria AN, percebe outros usuários de Arcana
- **Suprimir:** corta emissão de aura; não pode usar Arcana; oculta presença
- **Emissão:** fluxo constante e controlado; pré-requisito para os 6 Caminhos

**Os 6 Caminhos de Arcana Desperto:**

| Caminho | Foco | Habilidades |
|---------|------|-------------|
| Aprimorar | Fortalecer corpo/objetos | Reforço, Barreira, Revestir Algo |
| Transmutação | Converter Arcana em propriedades | Propriedade Geral, Conversão, Propriedade Única |
| Emissor | Projeta Arcana para fora | Projeção Curta, Projeção Independente, Encobrir Objeto |
| Conjurar | Cria formas/efeitos físicos | Forma Simples, Efeito Único, Forma Adaptável |
| Manipular | Controla coisas vivas ou não | Controle Direto, Reposicionar, Prender |
| Sensorial | Influencia ambiente e percepções | Leitura, Pressão, Influência |

**Sistema de Técnicas — Parâmetros e Custos em PM:**

Toda técnica é montada com parâmetros. O custo total é a soma de todos os parâmetros escolhidos.

| Parâmetro | O que faz | Custo base |
|-----------|----------|------------|
| Alcance | Distância até o alvo (1–10 blocos) | 1–20 PM |
| Área | Raio de efeito (1–6 blocos) | 2–18 PM |
| Alvos | Múltiplos alvos distintos (sem área) | 3–15 PM |
| Dados | d3 a d20 de dano/cura/proteção/magnitude | 1–20 PM (dobra no 2º dado) |
| Intensidade | Bônus fixo ao resultado (+1 a +9) | 1–25 PM |
| Duração | Quantos turnos dura (1 turno a cena inteira) | 1–20 PM |
| Carregamento | Reduz custo: 1 ação=0, 2 ações=−2, turno completo=−5 | Redução |

**Tipos de dados (o que representam):** Dano, Cura, Proteção (espaços temporários), Magnitude de efeito (turnos preso, redução de deslocamento, etc.)

Na ficha, cada técnica tem: `nome`, `pm` (custo total), `caminho` (principal), `alcance`, `dados`, `desc`.

---

### Ascensão Arcana e Pulso

Sistema de alto nível. **Requisitos:** nível 7+ e pelo menos 1 atributo em 5.

**Pulso de Ascensão:**
- Recurso próprio, separado do PM
- Começa em **0** no início de cada combate
- Zera ao fim do combate (não carrega entre cenas)
- Sem máximo fixo

**Ganhos de Pulso (+1 cada):**
- Acertar um ataque que cause dano
- Sofrer dano de um inimigo
- Rolar Sucesso Crítico em qualquer teste
- Um aliado cair inconsciente no campo de visão

**As 3 Habilidades (1 Pulso cada):**

| Atributo 5 | Habilidade | Tipo de ação | Efeito principal |
|------------|-----------|-------------|-----------------|
| Poder | Punho Negro | Ação livre antes de atacar | Ignora todos os espaços de proteção; dano não pode ser reduzido; crítico = atordoa |
| Habilidade | Fluxo Ininterrupto | Reação ao ser atacado | Esquiva automática sem dados + movimento 2 blocos + contra-ataque com Ganho se adjacente (1x/rodada) |
| Resistência | Corpo Absoluto | Reação ao sofrer dano | Dano reduzido à metade; se fosse cair, fica com 1 PV + ganha 1 Pulso; imune a condições por 1 turno (1x/rodada) |

**Ascensão Prematura:** personagem abaixo do nível 7 pode acessar se tiver atributo 5 + treinamento direto com usuário de Ascensão + aprovação narrativa do mestre.

**Decadência Arcana** (se tentar ascender sem requisitos):
- **Poder Corroído:** Perda permanente em testes de Luta com força; −1d4 fixo no dano físico
- **Habilidade Fragmentada:** Perda permanente em Esquiva e Atirar; Sucesso Crítico apenas com 6+6
- **Resistência Erodida:** Perda permanente em Fortitude e Vontade; −5 PM máximo a cada nível subido

Na ficha: o bloco de Pulso e a seção de Ascensão aparecem **automaticamente** quando `nivel >= 7` e algum atributo `>= 5`.

---

### Maldições e Dádivas

Obtidas exclusivamente em campanha. Limite: 1 Maldição + 1 Dádiva por personagem.

**Maldições disponíveis:**
| ID Firebase | Nome | Como se obtém |
|------------|------|--------------|
| `mascara_lunar` | Máscara Lunar | Colocar a máscara pela primeira vez |
| `lodo_corrompido` | Lodo Corrompido | Sobreviver às águas de Yasharam |
| `marca_abismo` | Marca do Abismo | Sobreviver a contato com o Elísio |

**Dádivas disponíveis:**
| ID Firebase | Nome | Portador original |
|------------|------|------------------|
| `combustao_arcana` | Combustão Arcana | Meteoro de Magmar |
| `escarcha_absoluta` | Escarcha Absoluta | Ghélida, Soberana da Escarcha |
| `tremor_abissal` | Tremor Abissal | O Quebrador |

Na ficha: controladas via `toggles.dadivas` (quais o personagem tem) e `toggles.dadivas_ativas` (quais estão ativas no momento). A seção de Dádivas só aparece se o personagem tiver pelo menos uma.

---

## Ficha V3 — Estrutura HTML

O arquivo `ficha_v3.html` é organizado em **3 colunas** com navegação mobile:

### Coluna 1 — Personagem (`col-0`)
- Avatar + nome + botões de linhagem
- Classe, Raça, Vertente/Origem
- Atributos (Poder, Habilidade, Resistência)
- Barras de PV, PM e Pulso de Ascensão
- Defesa (Armadura Natural + Espaços de Proteção + slots clicáveis)
- Limiares de dano (derivados automaticamente)
- XP + PP + PDT
- Anotações livres

### Coluna 2 — Arcana & Técnicas (`col-1`)
- Rolador 2d6 com modos Normal/Ganho/Perda
- Detecção de Crítico, Crítico Perfeito e Falha Crítica
- Perícias com pontos clicáveis (0–4 dots)
- Habilidades de Classe (preenchidas via compêndio)
- Habilidades de Raça (preenchidas via compêndio)
- Técnicas com campos: nome, PM, caminho, alcance, dados, descrição
- Seção de Ascensão Arcana (oculta até requisitos atingidos)
- Seção de Maldições & Dádivas (oculta se não tiver nenhuma)

### Coluna 3 — Equipamentos & Combate (`col-2`)
- Vantagens Passivas
- Habilidades Especiais
- Arsenal de Armas (campos: nome, atributo, dano, alcance, tipo, efeito)
- Proficiências em Armas (5 categorias, 3 graus)
- Inventário Geral

### Variáveis CSS principais

```css
:root {
    --bg: #0a0a0c;
    --text: #e8e0d5;
    --accent: #c0392b;        /* Cor principal — muda com o tema */
    --accent2: #8b2318;
    --accent-light: #e8786a;
    --gold: #c9a84c;
    --gold-light: #e8c97a;
    --card: #12111a;
    --border: #2a2535;
    --input-bg: #0d0c14;
    --hp: #c0392b;
    --pm: #2980b9;
    --pulso: #8b5cf6;
}
```

### Temas disponíveis

```javascript
const THEMES = {
    sangue, oceano, floresta, ametista,
    sombra, ouro, carmesim, violeta
};
```

Cada tema altera: `--accent`, `--accent2`, `--accent-light`, `--gold`, `--card`, `--border`.

---

## Convenções de Código

### Salvamento no Firebase

Toda alteração de campo usa `update()` com o caminho relativo:

```javascript
// Campo raiz da ficha
update(ref(db, dbPath), { campo: valor });

// Campo aninhado
update(ref(db, `${dbPath}/habilidades/armas/${id}`), { titulo: 'Novo nome' });

// Helper genérico usado na ficha
window.saveField = (path, field, val) => {
    update(ref(db, `${dbPath}/${path}`), { [field]: val });
};
```

### Adicionar novo item a uma lista

```javascript
push(ref(db, `${dbPath}/habilidades/${categoria}`), { titulo: '', desc: '' });
```

### Remover item

```javascript
remove(ref(db, `${dbPath}/habilidades/${categoria}/${id}`));
```

### Escape de strings para HTML inline

Usar `escJS()` em todos os valores vindos do banco que são colocados em `innerHTML`:

```javascript
function escJS(s) {
    return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}
```

### Campos salvos automaticamente via `input` event listener

```javascript
const CAMPOS = [
    'char_name','nivel','florins','hp_at','hp_max',
    'pm_at','pm_max','pulso_at','poder','habilidade',
    'resistencia','vertente','anotacoes','xp_total',
    'pp_total','pdt_total'
];
```

### Estrutura de renderização

Todo `render*()` lê de `charData` (estado local sincronizado via `onValue`) e reescreve o HTML do container correspondente. Nunca leia diretamente do DOM para lógica de negócio — use sempre `charData`.

### IDs de elementos importantes

| ID | Elemento |
|----|---------|
| `col-0`, `col-1`, `col-2` | Colunas (mobile: só uma ativa) |
| `avatar-display` | Avatar circular |
| `char_name` | Input do nome |
| `linhagem-btns` | Container dos botões de linhagem |
| `bar-hp`, `bar-pm`, `bar-pulso` | Fills das barras |
| `slots-container` | Container dos espaços de proteção |
| `an-val` | Valor da Armadura Natural |
| `pericias-grid` | Grid das perícias |
| `proficiencias-list` | Lista de proficiências |
| `list-classe_hab` | Habilidades de classe |
| `list-raca_hab` | Habilidades de raça |
| `list-passivas`, `list-especiais` | Habilidades genéricas |
| `list-armas` | Arsenal de equipamentos |
| `list-tecnicas` | Técnicas |
| `list-ascensao` | Habilidades de Ascensão |
| `ascensao-section` | Card inteiro da Ascensão (hidden por padrão) |
| `pulso-block` | Barra de Pulso (hidden por padrão) |
| `dadivas-section` | Card de Dádivas (hidden por padrão) |
| `dice-vals`, `dice-total`, `dice-status` | Resultado da rolagem |
| `xp-display`, `pp-display`, `pdt-display` | Contadores de XP/PP/PDT |
| `modal-choice`, `modal-db`, `modal-img` | Modais |

---

*Última atualização do README: sistema 3ºE completo com 9 capítulos de regras.*
