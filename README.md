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
  - [Recursos PV e PM](#recursos-pv-e-pm)
  - [Rolagem de Dados](#rolagem-de-dados)
  - [Defesa e Espaços de Proteção](#defesa-e-espaços-de-proteção)
  - [Raças e Linhagens Completo](#raças-e-linhagens-completo)
  - [Classes e Vertentes](#classes-e-vertentes)
  - [Progressão e XP](#progressão-e-xp)
  - [Proficiência em Armas](#proficiência-em-armas)
  - [Arcana e Técnicas](#arcana-e-técnicas)
  - [Ascensão Arcana e Pulso](#ascensão-arcana-e-pulso)
  - [Maldições e Dádivas](#maldições-e-dádivas)
- [Ficha V3 Estrutura HTML](#ficha-v3-estrutura-html)
- [Convenções de Código](#convenções-de-código)

---

## Visão Geral do Projeto

O sistema de fichas é uma aplicação web single-page (HTML + CSS + JavaScript vanilla com Firebase SDK via CDN). Não há framework front-end — toda a lógica é JavaScript puro com módulos ES6.

**Stack:**
- HTML5 / CSS3 / JavaScript ES6 (módulos)
- Firebase Realtime Database (SDK v10.8.0 via CDN)
- Google Fonts: Cinzel (títulos/labels) + Crimson Text (texto)
- Sem bundler, sem dependências npm na ficha em si

**Versões do sistema:**
| Versão | Arquivo | Coleção Firebase | Base de Regras |
|--------|---------|-----------------|----------------|
| 1ºE | ficha_v1.html | fichas_v1/ | 3DET Victory |
| 2ºE | ficha_v2.html | fichas_v2/ | Daggerheart modificado |
| 3ºE | ficha_v3.html | fichas_v3/ | Sistema próprio (atual) |

A ficha é identificada por um parâmetro de URL: `ficha_v3.html?p=nome_do_personagem`. Se nenhum parâmetro for passado, usa `personagem_padrao_v3`.

---

## Estrutura de Arquivos

```
/
├── ficha_v3.html          # Ficha principal do sistema 3ºE
├── banco_dados_v3.html    # Compêndio/admin do banco global da v3
├── ficha_v2.html          # Versão legada (2ºE) — não modificar
├── ficha_v1.html          # Versão legada (1ºE) — não modificar
├── auth.js                # Script de autenticação
├── README.md              # Este arquivo
└── overlay/               # Arquivos do overlay para OBS
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
  "ancestralidade": "Dragor",

  // Atributos (0-5)
  "poder": 3,
  "habilidade": 2,
  "resistencia": 2,

  // Recursos
  "hp_at": 15,
  "hp_max": 15,
  "mana_at": 20,       // PM atual — campo usa "mana" no código
  "mana_max": 20,      // PM máximo
  "pulso_at": 0,       // Pulso de Ascensão — zera por combate
  "pulso_max": 10,     // Teto visual da barra

  // XP e Pontos
  "xp_total": 0,       // Pontos de Despertar (evoluir Ascensão)
  "pp_total": 2,       // Pontos de Proficiência
  "pdt_total": 1,      // Pontos de Técnica

  // Espaços de Proteção
  "ep_max": 5,         // Espaços permanentes
  "ep_temp": 0,        // Espaços temporários
  "ep_used": {
    "s0": true,
    "s1": false
  },

  // Pericias (0-4 pontos cada)
  "pericias": {
    "Animais": 0,
    "Arte": 1,
    "Atirar": 2
  },

  // Proficiencias em armas (0-3 graus)
  "proficiencias": {
    "pesadas": 2,
    "ageis": 0,
    "distancia": 1,
    "focos": 0,
    "desarmado": 0
  },

  // Habilidades por categoria
  "habilidades": {
    "classe_hab": {
      "-NxID123": { "titulo": "Postura Inabalavel", "desc": "..." }
    },
    "raca_hab": {
      "-NxID456": { "titulo": "Baforada de Aurora", "desc": "..." }
    },
    "arcana_habs": {
      "-NxID789": {
        "titulo": "Projecao Curta",
        "caminho": "Emissor",
        "pericia": "Atirar",
        "custo_pm": "3",
        "desc": "..."
      }
    },
    "tecnicas": {
      "-NxIDabc": {
        "titulo": "Nome da Tecnica",
        "caminho": "Emissor",
        "pericia": "Mistica",
        "custo_pm": "8",
        "alcance": "4 blocos",
        "area": "2 blocos raio",
        "dados": "2d6",
        "duracao": "3 turnos",
        "desc": "Descricao do efeito..."
      }
    },
    "armas": {
      "-NxIDdef": {
        "titulo": "Espada Longa",
        "atributo": "Poder",
        "dano": "1d8",
        "alcance": "Corpo a corpo",
        "tipo": "Corte",
        "desc": "Versatil..."
      }
    },
    "inventario": {
      "-NxIDghi": { "titulo": "Pocao de Cura", "desc": "Recupera 1d6 PV." }
    }
  },

  // Ascensão Arcana
  "ascensao_habs": {
    "punho_negro": true,
    "fluxo_ininterrupto": false,
    "corpo_absoluto": false
  },

  // Toggles
  "toggles": {
    "linhagem_demon": true,
    "linhagem_beast": null,
    "linhagem_sacra": null,
    "forma_ativa": "demon",
    "asc_unlocked": true,
    "dadivas": {
      "mascara_lunar": true,
      "combustao_arcana": false
    },
    "dadivas_ativas": {
      "mascara_lunar": true
    }
  },

  // Imagens (base64 JPEG, max 600px)
  "char_img": "data:image/jpeg;base64,...",
  "overlay_img": "data:image/jpeg;base64,...",
  "overlay_linhagem": "data:image/jpeg;base64,...",
  "overlay_dadiva": "data:image/jpeg;base64,...",

  "color_theme": "sangue",
  "anotacoes": "Texto livre..."
}
```

### Banco de Dados Global

Lido em `banco_dados_v3/`. O painel de manutenção para mestre/ADM fica em `ed_sistemav3_bancodedados.html`:

```
banco_dados_v3/
├── classes/
├── racas/
├── equipamentos/
└── maldicoes_dadivas/
```

**Estrutura de uma raca no banco:**
```jsonc
{
  "titulo": "Dragor",
  "linhagem": "Animalesco",
  "desc": "Descricao geral...",
  "hab1_nome": "Baforada de Aurora",
  "hab1_desc": "Descricao completa...",
  "hab2_nome": "Poder Draconico",
  "hab2_desc": "Descricao completa...",
  "hab3_nome": "Heranca Fisica",
  "hab3_desc": "Descricao completa..."
}
```

**Estrutura de uma classe no banco:**
```jsonc
{
  "titulo": "Vanguarda",
  "dominios": "Aprimorar, Manipular",
  "desc": "Descricao geral...",
  "hab_nome": "Postura Inabalavel",
  "hab_desc": "Descricao da habilidade unica...",
  "hab2_nome": "Provocacao",
  "hab2_desc": "Descricao da habilidade de vertente..."
}
```

---

## Sistema de Regras — Referência Completa

### Atributos

Três atributos, valor de 0 a 5. Máximo inicial na criação: 3.

| Atributo | Abreviação | Função |
|----------|-----------|--------|
| Poder | P | Ataques pesados, força bruta, magias destrutivas |
| Habilidade | H | Ataques ágeis/distância, furtividade, magias de controle. Define PM máximo |
| Resistência | R | Resistência a condições, venenos, medo. Define PV máximo |

**Fórmulas derivadas:**
- PV máximo = 5 x Resistência + Vitalidade
- PM máximo = 10 x Habilidade + Energia
- Armadura Natural = 6 (fixo nível 1+)
- Defesa Total = AN + Resistência + Fortitude
- Limiar Menor = Resistência
- Limiar Maior = Resistência + 5
- Limiar Severo = Resistência + 10

---

### Perícias

20 perícias. Cada ponto vale +1d4 nos testes. Máximo 4 pontos por perícia.

Lista completa: Animais, Arte, Atirar, Conhecimento, Energia, Esquiva, Esporte, Fortitude, Influência, Intuição, Ladinagem, Luta, Máquinas, Medicina, Mente, Mística, Percepção, Sobrevivência, Vitalidade, Vontade

Na criação: 10 pontos, máximo 2 por perícia. Bônus de raça/classe podem ultrapassar.

---

### Recursos PV e PM

**Pontos de Vida:**
- Fórmula: 5 x Resistência + Vitalidade
- Recuperação: Tratamento Médico (descanso curto) ou automaticamente no Descanso Longo

**Pontos de Mana — campos Firebase: mana_at / mana_max:**
- Fórmula: 10 x Habilidade + Energia
- Em combate: +2d6 PM no início de cada turno; +1d6 PM em Sucesso Crítico
- Fora de combate: PM completamente restaurado no início de cada nova cena com intervalo razoável
- Não existe recuperação de PM em descanso curto ou longo

---

### Rolagem de Dados

Teste padrão: 2d6 + atributo + perícia (d4s) + bônus

**Modos:**
- Normal: rola 2d6, soma ambos
- Ganho: rola 3d6, soma os três
- Perda: rola 3d6, usa apenas o menor dos três

**Resultados especiais:**
| Resultado | Condição | Efeito |
|-----------|---------|--------|
| Sucesso Crítico | Dois dados iguais (ex: 4 e 4) | Dano dobrado; sucesso brilhante |
| Crítico Perfeito | 6 e 6 | Efeitos máximos |
| Falha Crítica | 1 e 1 | Consequências narrativas graves |

Ganho e Perda se anulam: 1 Ganho + 1 Perda = rolar normal.

---

### Defesa e Espaços de Proteção

**Armadura Natural:** 6 (fixo nível 1+).
**Defesa Total:** AN + Resistência + Fortitude — subtrai do dano ao usar Defender.

**Formas de defesa:**
1. Esquiva: 2d6 + Habilidade + Esquiva vs. resultado do ataque. Se maior, sem dano.
2. Defender: não se move; Defesa Total subtrai do dano.
3. Contra-Ataque: atacar o adversário; se vencer, cancela o ataque e causa 1 ataque básico. Tem Perda. Só corpo a corpo.

**Espaços de Proteção — campos: ep_max, ep_temp, ep_used:**
- Cada espaço gasto anula 1 ponto de dano
- Botão Descanso reseta ep_used (restaura espaços permanentes)
- Espaços temporários somem quando usados

---

### Raças e Linhagens Completo

---

#### LINHAGEM ANIMALESCO

**Habilidade Universal — Despertar Primordial**
Custo: 5 PM + 1 ação. 1x por cena. Após usar, fica incapaz de transformar por 2 cenas.
Enquanto ativo:
- Fúria Bestial: todos os ataques corpo a corpo recebem Ganho e causam +1d6 de dano extra.
- Couro Místico: o primeiro golpe recebido por rodada tem o dano reduzido pela metade.
- O Preço do Instinto: não pode conjurar magias complexas, apenas atacar, mover ou usar habilidades de dano direto.

---

**DRAGOR**
Descendentes dos dragões cristalinos de aurora. Chifres, cauda e poderes de fogo. Alguns desenvolvem asas, outros cauda maior.

Hab 1 — Baforada de Aurora:
1x por combate. Gasta 5 PM. Realiza um ataque elemental em área (raio de 3 blocos ao redor de um ponto dentro de alcance de 4 blocos). Funciona como magia conjurada: role 2d6 + Perícia Mística. Se resultar em Sucesso Crítico, recupera 5 PM instantaneamente.

Hab 2 — Poder Draconico:
Passivo. Você tem Ganho em testes de Influência que envolvam pura demonstração de força ou intimidação.

Hab 3 — Heranca Fisica (escolha uma ao criar):
- Asas: Pode voar, ignorando terrenos difíceis. Levantar voo gasta 2 PM e 1 ação; manter no ar não tem custo.
- Cauda Longa: Membro extra. 1x por rodada, realiza ação livre de interação com o cenário sem gastar Ação Principal.

---

**ETINARO**
Descendentes dos sátiros guardiões da Era de Paz. Orelhas grandes, chifres arredondados, garras, pernas com cascos e olho amarelo brilhante.

Hab 1 — Corpo Taurico (Investida):
Gasta 2 PM + 1 ação. Realiza uma investida percorrendo todo o deslocamento em linha reta, terminando com ataque corpo a corpo. Recebe Ganho no ataque. Se acertar, o alvo é empurrado 1 bloco para trás.

Hab 2 — Vigoroso:
Passivo. Você tem Ganho em testes de Fortitude para resistir a fadiga, doenças e venenos.

Hab 3 — Resiliencia Inabalavel:
1x por combate. Ao sofrer um ataque, gaste 3 PM como reação (após ver o resultado do dano) para reduzir o dano recebido pela metade.

Hab 4 — Espacos de Protecao Natural:
Passivo. Você possui 5 espaços de proteção natural permanentes que se recuperam completamente após um Descanso Longo.

---

**HARPIAN**
Descendentes de grifos. Grandes asas, garras no lugar dos pés, pelagem distribuída no corpo. Alguns têm asas nas costas; outros, no lugar dos braços.

Hab 1 — Voo Majestoso:
Passivo. Pode voar constantemente, ignorando obstáculos no chão. Harpians não precisam gastar PM para levantar voo.

Hab 2 — Graca Arcano-Aviaria:
1x por cena. Ao conjurar ou evocar uma magia, pode ignorar completamente o custo em PM daquela técnica.

Hab 3 — Garras de Grifo:
Passivo. Seus ataques desarmados causam dano cortante. Suas garras funcionam como Arma Corpo a Corpo de Acuidade: causam 1d6 de dano + HABILIDADE e utilizam a Perícia Luta.

---

**LYZAARDO**
Descendentes dos lagartos colossais que moldavam a terra. Pele escamosa, mandíbula grande, chifres e longa cauda.

Hab 1 — Cascudo:
Passivo. Você tem Ganho em testes de Fortitude E Ganho em testes de Vontade para resistir a encantos, ilusões e controle mental.

Hab 2 — Camuflagem Natural:
Passivo. Você tem Ganho em todos os testes de Sobrevivência e em testes de Ladinagem para se esconder.

Hab 3 — Escama Grossa:
Passivo. Você possui 6 espaços de proteção natural permanentes que se recuperam completamente após um Descanso Longo.

---

**MENCES**
Descendentes dos primatas guerreiros do Apocalipse. Ágeis, com excelente localização e lado cruel. Pelagem, longos cabelos e cauda peluda.

Hab 1 — Fisico Atletico:
Passivo. Recebe +1 na Perícia Esquiva permanentemente. Tem Ganho em testes de Esporte envolvendo acrobacias, escalada e saltos.

Hab 2 — Sentido Labirintico:
Passivo. Nunca se perde — sempre sabe o caminho de volta de qualquer lugar visitado. Tem Ganho em testes de Sobrevivência para rastrear e farejar pistas.

Hab 3 — Golpe Punitivo:
Passivo. Quando acerta com Sucesso Crítico, além do bônus de dano, aplica uma Punição à escolha: o alvo fica Atordoado por 1d4 turnos (não pode agir) OU tem o deslocamento reduzido pela metade até o próximo turno dele.

---

**MERMAIDS**
Descendentes de crias da Rainha do Mar. Humanoides com escamas, guelras e cauda. Respiram fora e dentro d'água. Alguns têm a cauda como saia enrolada nas pernas.

Hab 1 — Adaptacao Anfibia:
Passivo. Você respira, enxerga e luta perfeitamente debaixo d'água sem nenhuma penalidade. Ambientes aquáticos nunca são Terreno Difícil para você.

Hab 2 — Vigor das Profundezas:
Passivo. Você tem Ganho em testes de Fortitude que envolvam impacto físico extremo, asfixia ou resistência a condições ambientais severas.

Hab 3 — Vontade Abissal:
Em ambientes úmidos ou aquáticos, gaste 10 PM para ganhar uma Ação Principal extra naquele turno — pode usá-la imediatamente ou guardar para reagir fora do turno uma vez antes do próximo.

---

**NYTARA**
Descendentes dos imensos felinos do Apocalipse. Orelhas na cabeça, garras nas mãos, pernas de felino e cauda felpuda.

Hab 1 — Percepcao Apurada:
Passivo. Você tem Ganho em todos os testes de Percepção para perceber emboscadas, notar detalhes ocultos ou ouvir ruídos sutis. Você nunca é surpreendido enquanto estiver consciente.

Hab 2 — Predador Sanguinario:
Passivo. Sempre que derrotar (finalizar) um inimigo em combate corpo a corpo, você recupera imediatamente à escolha: 1d6 PM OU 1d4 PV.

Hab 3 — Explosao Felina:
1x por combate. Antes de rolar os dados para um ataque corpo a corpo, pode canalizar o instinto animal. O ataque recebe Ganho e, se acertar, role o dado de dano duas vezes e fique com o maior resultado.

---

#### LINHAGEM DEMONIACO

**Habilidade Universal — Chamado do Inferno**
Custo: 8 PM + 1 ação completa. 1x por sessão. Ativa até o fim da cena.
Enquanto ativo: ignora todas as condições negativas ativas no momento da ativação; custo em PM de todas as técnicas e habilidades de raça reduzido em 2 PM (mínimo 1 PM); rola todos os ataques com Ganho.
O Preço: após a cena, o personagem fica Exausto — Perda em todos os testes — até realizar um Descanso Longo.

---

**CARNITES**
Demônios que adoram violência. Olhos vermelhos, pele pálida desnutrida, orelhas pontudas e presas afiadas.

Hab 1 — Manipulacao Sanguinea:
Gasta 3 PM. Coagula sangue — seu ou do ambiente — e forma uma arma letal de porte médio que dura até o fim da cena. Ataques com ela usam Perícia Luta com PODER e causam 1d8 de dano + PODER. Se não houver sangue no ambiente, você pode usar o próprio, sofrendo 2 PV de dano para ativá-la.

Hab 2 — Controle Visceral:
Gasta 4 PM + 1 ação. Força um inimigo a até 2 blocos a fazer um teste de Resistência (dificuldade 9 + seu PODER). Se falhar, você dita o próximo movimento dele — para onde anda ou quem ataca — durante aquele turno. O mesmo alvo não pode ser afetado novamente na mesma cena.

Hab 3 — Talento Violento:
Passivo. Você tem Ganho em testes de Poder para destruir objetos, arrombar estruturas e intimidar inimigos que já estejam feridos ou em desvantagem.

---

**DUSA**
Demônios sedutores, carismáticos e um pouco frágeis. Possuem de 1 a 6 cabeças de cobra ligadas ao corpo.

Hab 1 — Fascinio Ofidico:
Passivo. Você tem Ganho automático em testes de Influência para seduzir, persuadir, enganar ou negociar com qualquer alvo que possa ver seu rosto ou ouvir sua voz.

Hab 2 — Olhar Atordoante:
Gasta 4 PM + 1 ação. Foca o olhar em um alvo a até 2 blocos. O alvo realiza um teste de Resistência (dificuldade 9 + seu PODER). Se falhar, fica Atordoado por 1 turno — não pode realizar ações, apenas se mover.

Hab 3 — Multiplas Cabecas:
Passivo. As serpentes servem como vigias constantes. Inimigos nunca ganham Ganho por te atacar furtivamente, pelas costas ou enquanto você estiver distraído.

---

**FILHO DE MIRAH**
Descendentes distantes com sangue puro do Rei Demônio.

Hab 1 — Bencao do Inferno (Escamas):
1x por combate. Ao ser atacado, gaste 3 PM como reação para endurecer a pele em escamas demoníacas instantaneamente. Concede 3 espaços de proteção temporários que absorvem o dano daquele ataque e desaparecem em seguida.

Hab 2 — Empatia Selvagem:
Passivo. Você tem Ganho constante em testes de Animais para interagir, acalmar ou domar animais e feras, incluindo criaturas místicas.

Hab 3 — Aura de Comando:
Passivo. Ao ajudar um aliado ativamente (gastando uma ação para auxiliar o teste dele), se o aliado obtiver um Sucesso Crítico, você recupera imediatamente 3 PM.

---

**INFERMO**
Mistura de várias capacidades do Rei Demônio em um corpo comum. Sofrem com deformações e anomalias. Possuem caudas, asas, chifres, manchas, deformidades e vários membros.

Hab 1 — Asas do Abismo:
Passivo. Você possui asas grotescas e funcionais, permitindo voo livre e ignorando terrenos difíceis. Levantar voo gasta 2 PM e 1 ação; manter no ar não tem custo.

Hab 2 — Anomalia Util:
Ao criar o personagem, escolha um tipo de ação específica que faça sentido com sua deformidade (escalar, arrombar, ouvir, intimidar, rastrear, etc.). Você sempre tem Ganho nesse teste específico.

Hab 3 — Teratismo (Dom Anomalo):
Ao criar o personagem, escolha um Caminho de Arcana que normalmente não poderia acessar pela sua classe. Você aprende uma habilidade desse caminho gratuitamente. A primeira vez que usar essa habilidade em cada cena, o custo em PM é reduzido pela metade.

---

**ONI**
Demônios abençoados — sem deformidades. Pele vermelha ou azulada, chifres e cauda longa com ponta em flecha.

Hab 1 — Elegancia Impecavel:
1x por cena. Se você rolar uma falha em qualquer teste, pode gastar 3 PM para rolar novamente um dos dados e aceitar o novo resultado.

Hab 2 — Natureza Mistica Intensa:
Passivo. Você tem Ganho em testes de Mística e Energia ao tentar identificar rituais mágicos, rastrear fontes de Arcana ou decifrar técnicas desconhecidas de inimigos.

Hab 3 — Chifres de Combate:
Se realizar uma investida antes de atacar corpo a corpo (movendo-se pelo menos 2 blocos em linha reta), pode gastar 2 PM para rolar o dado de dano duas vezes e ficar com o maior resultado.

---

**RECEPTACULO**
Um corpo artificial em que uma alma foi colocada. Pode ser de madeira, metal, porcelana, pedra ou outro material resistente.

Hab 1 — Corpo Abiotico:
Passivo. Você é um construto. Não precisa respirar, comer ou dormir. Imune a doenças orgânicas, venenos e efeitos mentais baseados em emoção ou medo. Em contrapartida, curas convencionais recuperam apenas metade do valor em você. Para recuperação total, precisa ser Consertado (Perícia Máquinas ou Medicina durante um descanso).

Hab 2 — Bateria Arcana:
Passivo. Você tem Ganho para resistir à exaustão física e efeitos de fadiga. Se seus PV chegarem a 0, você não morre — você apenas desliga e entra em estado inativo até ser recarregado ou consertado.

Hab 3 — Membros Artificiais Multiplos:
Passivo. Você possui braços ou apêndices extras integrados ao corpo. Pode interagir com itens, sacar ou guardar armas e usar itens consumíveis como ação livre, sem gastar Ações Principais.

---

**SANGUINARIO CARMESIM**
Antes apenas Sanguinários. Após a Guerra de Sangue, foram amaldiçoados novamente. Cabelos vermelhos e capacidades especiais ao ingerir sangue.

Hab 1 — Carnificina Brutal:
Passivo. Sempre que derrotar um oponente em combate OU causar o máximo de dano em uma única rolagem (todos os dados no valor máximo), você recupera imediatamente 1d6 PV e 3 PM.

Hab 2 — Bencao do Sangue:
Como ação livre, quando você fere um inimigo e ele sangra, pode lamber ou consumir aquele sangue. Até o final do combate, todos os seus ataques contra aquele alvo específico recebem Ganho. Pode ativar para alvos diferentes; o efeito vale separadamente para cada um.

Hab 3 — Pele Robusta:
Passivo. Você tem Ganho em testes de Fortitude que envolvam dor intensa, tortura física ou golpes incapacitantes. Além disso, você possui 3 espaços de proteção natural permanentes.

---

#### LINHAGEM SACRA

**Habilidade Universal — Vislumbre da Evolucao**
Custo: 6 PM. 1x por cena. Ativável quando você falha em um teste crucial ou quando um aliado cai.
Durante 1 rodada completa: todos os testes de Poder e Habilidade recebem Ganho e seus ataques causam +1d6 de dano extra.
O Preço: após essa rodada, o corpo rejeita a mutação. Você sofre 1d4 de dano não absorvível por espaços de proteção e perde 4 PM adicionais.

---

**EMARANHADO**
Humanos amaldiçoados pela raiz maldita que desenvolveram habilidades com vinhas e conexão com a natureza. Seus corpos são envoltos por vinhas vivas.

Hab 1 — Membros de Vinha:
1x por turno. Gaste 2 PM para realizar uma ação livre de utilidade sem gastar Ações Principais — puxar uma alavanca, segurar um aliado que cai, amarrar um inimigo momentaneamente ou interagir com qualquer objeto próximo.

Hab 2 — Exobiologia Arcano-Botanica:
1x por combate. Você pode ativar uma técnica ou habilidade de raça pagando apenas metade do custo em PM (arredondado para baixo).

Hab 3 — Raizes do Vazio:
Passivo. Você tem Ganho automático em qualquer teste de Sobrevivência, rastreio ou Ladinagem para furtividade em ambientes selvagens, florestas, pântanos ou ruínas abandonadas.

---

**ESFEU**
Humanos amaldiçoados por um plano dimensional incompreensível. Seu corpo tem funções biológicas estranhas, capacidade de regeneração e pode se morfar em um tecido místico. Possuem marcações e tatuagens que mudam de posição com o tempo.

Hab 1 — Transmorfo de Miasma:
Gasta 5 PM. Assume essa forma até o fim da cena. Enquanto no Transmorfo, seus ataques corpo a corpo passam a usar HABILIDADE em vez de PODER, causam dano mágico, e a primeira vez que você acertar cada alvo, ele fica com Perda no próximo turno dele.

Hab 2 — Regeneracao Anomala:
Passivo. No início de cada um dos seus turnos, se você estiver com PV abaixo da metade do máximo, você recupera 1d4 PV automaticamente, sem gastar ações ou PM.

Hab 3 — Desfavor:
Como reação, gaste 3 PM para forçar um inimigo a até 2 blocos a rolar seu próximo teste de ataque ou defesa com Perda. Pode ser ativado fora do seu turno.

---

**ESTRELA FANTASMA**
O corpo de um espírito preso que volta à vida. Durante a gestação, foram amaldiçoados por um espírito que ficou com um corpo imaterial. Precisam usar Arcana para ficar em forma física. Possuem marcas e tatuagens vermelhas que brilham ao mudar de estado.

Hab 1 — Corpo Imaterial:
Gasta 4 PM + 1 ação. Você se torna intangível por 1 rodada completa. Nesse estado, é imune a danos físicos mundanos (Corte, Impacto, Perfurante) e pode atravessar paredes, grades e obstáculos físicos — mas só pode atacar usando técnicas ou habilidades mágicas. Ao retornar ao estado físico, qualquer efeito contínuo de dano físico ativo é cancelado.

Hab 2 — Aura de Paralisia:
1x por combate. Force um inimigo a até 3 blocos a fazer um teste de Vontade (dificuldade 12). Se falhar, ele fica Paralisado de medo — não pode agir ou se mover — até sofrer qualquer dano.

Hab 3 — Imunidade Espectral:
Passivo. Você é imune a doenças orgânicas, venenos e não possui necessidades biológicas básicas. Além disso, você tem Ganho em testes de Vontade para resistir a efeitos de medo e corrupção mental.

---

**LUNARIANO AMALDICADO**
Abençoados pela lua, amaldiçoados pelo Ninho Coagulante durante o nascimento. Pele roxa ou acinzentada e marcas pretas no rosto que brilham levemente sob luz fraca.

Hab 1 — Conceder Desejos:
Passivo. Sempre que um aliado pedir para você usar uma técnica ou habilidade benéfica nele, o custo dessa habilidade é reduzido em 3 PM. O pedido pode ser feito como ação livre durante o turno de qualquer um.

Hab 2 — Fascinio Lunar:
Passivo. Você tem Ganho automático em testes de Influência para persuadir, encantar ou negociar com qualquer pessoa que ainda não tenha te visto antes.

Hab 3 — Codigo da Gratidao:
Passivo. Se alguém te salva ou te faz um favor imenso, você cria um vínculo. Enquanto estiver ajudando ativamente seu Amo, você recupera 2 PM extras a cada vez que usar sua recuperação normal de turno (2d6 + 2). O vínculo dura até a dívida ser considerada quitada pelo mestre e pelo jogador.

---

**PINÁCULO DE MATERIA ESCURA**
Humanos amaldiçoados com uma pele que imita as rochas do Ninho Coagulante. Chifres cristalinos, pele completamente preta e cauda longa e afiada. Após a segunda grande guerra, passaram a ter cabelos esbranquiçados e marcas brancas pelo corpo.

Hab 1 — Pele de Rocha Negra:
Passivo. Você tem Ganho em testes de Fortitude contra doenças, exaustão física e impactos. Além disso, você possui 4 espaços de proteção natural permanentes que se recuperam após um Descanso Longo.

Hab 2 — Destruidor:
Passivo. Em combate, quando você consegue um Sucesso Crítico ao atacar corpo a corpo, pode gastar 3 PM para somar seu PODER uma segunda vez ao dano total do ataque.

Hab 3 — Obstinacao Obscura:
Passivo. Se você não tiver PM suficiente para usar uma habilidade, pode escolher sofrer 1d4 de dano direto (não absorvível por espaços de proteção) no lugar do custo em PM. Pode usar quantas vezes quiser por cena, mas o dano se acumula.

---

**SACRA CONTIDO**
Sacras com Arcana infinito que quase os corrói por dentro. Seus corpos não foram feitos para aguentar tanta mana. Geralmente cobertos com equipamentos para conter o Arcana ao máximo possível.

Hab 1 — Nucleos Inibidores:
Passivo. Você é considerado um Construto para efeitos de condições biológicas — imune a venenos, doenças e necessidades físicas básicas — mas técnicas de cura convencionais recuperam apenas metade do valor em você. Além disso, para usar qualquer técnica ou habilidade de raça, você gasta 2 PM a mais do que o custo normal.

Hab 2 — Fora de Contencao (A Quebra do Limite):
1x por cena. Gasta uma ação completa (consome todas as 3 Ações Principais do turno). Asas de Arcana puro rasgam suas costas. Até o final da cena: você ganha Voo, todas as suas técnicas e habilidades custam 0 PM, e seus ataques mágicos causam +2d6 de dano extra.
O Preço: ao fim da cena, você cai a 0 PV (inconsciente) e precisa ser resgatado e consertado ou descansar para voltar à luta.

---

**SACRA LIBERTO**
Descendência direta da Era de Paz. O Arcana flui em seu corpo como fluía no passado, mas o corpo não aguenta tanta mana de forma sustentada.

Hab 1 — Recarga Absoluta:
1x por combate. Ao derrotar um inimigo, você pode absorver a energia residual dele e recuperar imediatamente 2d6 PM e 1d4 PV.

Hab 2 — Arrebatar:
Gasta 2 PM como ação livre. Você concede Ganho no próximo teste de um aliado que você consiga ver. Pode ser feito fora do seu turno como reação, sem gastar Ações Principais.

Hab 3 — Libertacao:
1x por cena. Gaste 6 PM para fazer uma técnica funcionar como se você tivesse rolado um Sucesso Crítico automático — dobrando todos os efeitos numéricos. Imediatamente após, você sofre 1d6 de dano direto pela sobrecarga carnal, não absorvível por espaços de proteção.

---

#### DISCENTE (SANGUE MISTO)

Personagens com descendência de múltiplas raças. Não possuem entrada própria no banco — são montados combinando habilidades de outras raças.

Sangue-Duplo (2 raças):
- Escolhe 3 habilidades divididas livremente entre as duas raças
- Se as duas raças pertencerem a linhagens diferentes: recebe a Habilidade Universal de ambas
- Se as duas raças forem da mesma linhagem: recebe apenas a Habilidade Universal daquela linhagem

Quimera (3 raças):
- Escolhe exatamente 1 habilidade de cada raça (total: 3)
- Independentemente de quantas linhagens, só pode ter 1 Habilidade Universal (jogador escolhe qual)

---

### Classes e Vertentes

9 classes, cada uma com Habilidade Única + 3 Vertentes.

| Classe | Habilidade Única |
|--------|-----------------|
| Vanguarda | Postura Inabalável (absorve 1d4 dano ou redireciona ataque, sem PM; escala para 1d6 no nível 5) |
| Arruaceiro | Golpe Sujo (Ganho + 1d6 em condições favoráveis; +2d6 nível 5 e +3d6 nível 9) |
| Monge | Fluxo Elemental (3 PM imbui elemento, efeito secundário no crítico; 2 elementos no nível 5) |
| Tecelante | Fios do Destino (3 PM, até 3 fios: aliado/inimigo/preso) |
| Arauto Dominante | Legião do Túmulo (servo permanente, 3 PM: atacar/proteger/perturbar; 2 servos no nível 5) |
| Teurgo | Sobrecarga Mística (1d4 dano direto para: máximo/alvo extra/PM grátis; 1 ponto fixo no nível 7) |
| Performante | O Show Tem que Continuar (crítico = aliado +5 PM; 6 PM = Performance de Guerra) |
| Discípulo da Fé | Evangelho Doloroso (efeito negativo = cura 1d4 PV OU +1 turno OU Ganho aliado) |
| Bruxo | Imantar Equipamento (4 PM, elemento à escolha; 3 PM extras força efeito secundário) |

**Vertentes por classe:**
| Classe | Vertente 1 | Vertente 2 | Vertente 3 |
|--------|-----------|-----------|-----------|
| Vanguarda | Cavaleiro Inabalável | Mercenário de Ferro | Guardião Arcano |
| Arruaceiro | Assassino das Sombras | Caçador de Recompensas | Ladino de Rua |
| Monge | Monge Elemental | Monge do Vento | Monge Interior |
| Tecelante | Marionete | Caçador de Fios | Tecedor de Venenos |
| Arauto Dominante | Necromante | Arauto do Abismo | Dominador de Almas |
| Teurgo | Arcanista | Ilusionista | Engenheiro Arcano |
| Performante | Bardo de Batalha | Ilusionista Performático | Dançarino de Lâminas |
| Discípulo da Fé | Arauto da Punição | Clérigo da Cura | Penitente Obscuro |
| Bruxo | Caçador de Maldições | Guerreiro Arcano | Bruxo das Terras Selvagens |

---

### Progressão e XP

10 níveis + sistema "Além do Nível 10" (bônus +1, +2, etc.).

**Tiers:**
| Tier | Níveis |
|------|--------|
| Despertar | 1-3 |
| Sobrevivente | 4-6 |
| Herói de Eko | 7-9 |
| Lenda Viva | 10 |

**O que se ganha por nível:**
- Todo nível (2-10): +1 PDT + +2 pontos de perícia
- Níveis pares: +1 atributo + +1 habilidade de caminho (a partir do nível 6: qualquer caminho)
- Níveis ímpares — Melhoria de Combate (escolha uma): Couro Espesso (+1 espaço permanente), Reserva Expandida (+5 PM máximo), Vitalidade Forjada (+3 PV máximo), Reflexos Treinados (1x/sessão rerrola um dado)
- Níveis 5 e 9: também concedem Especialização de Vertente (~50% de melhoria)

PP (Pontos de Proficiência): 2 na criação, +1 a cada nível par.

**Além do Nível 10:**
- Bônus ímpares (+1,+3...): +1 PDT, +2 perícia, Melhoria de Combate
- Bônus pares (+2,+4...): +1 PDT, +2 perícia, +1 atributo, +1 habilidade caminho, +1 PP

---

### Proficiência em Armas

5 categorias, 3 graus cada. Custo: 1 PP por grau. Campos Firebase: proficiencias.pesadas/ageis/distancia/focos/desarmado.

| Grau | Nome | Bônus |
|------|------|-------|
| 0 | Sem proficiência | Apenas dano base |
| 1 | Treinado | +1d4 dano extra |
| 2 | Experiente | +1d6 dano extra; crítico = dado de dano 2x |
| 3 | Mestre | +1d8 dano extra; crítico = dado 3x; Golpe de Mestre (1x/combate): Ganho + ignora todos espaços de proteção |

Categorias: pesadas (PODER), ageis (HABILIDADE), distancia (HABILIDADE), focos (HABILIDADE ou PODER), desarmado (PODER ou HABILIDADE).

---

### Arcana e Técnicas

**Os 6 Caminhos de Arcana Desperto:**
| Caminho | Foco | Habilidades |
|---------|------|-------------|
| Aprimorar | Fortalecer corpo/objetos | Reforço, Barreira, Revestir Algo |
| Transmutação | Converter Arcana em propriedades | Propriedade Geral, Conversão, Propriedade Única |
| Emissor | Projeta Arcana para fora | Projeção Curta, Projeção Independente, Encobrir Objeto |
| Conjurar | Cria formas/efeitos físicos | Forma Simples, Efeito Único, Forma Adaptável |
| Manipular | Controla coisas vivas ou não | Controle Direto, Reposicionar, Prender |
| Sensorial | Influencia ambiente e percepções | Leitura, Pressão, Influência |

**Campos de uma técnica no Firebase (habilidades/tecnicas/{id}):**
```jsonc
{
  "titulo": "Nome da Técnica",
  "caminho": "Emissor",
  "pericia": "Mística",
  "custo_pm": "8",
  "alcance": "4 blocos",
  "area": "2 blocos raio",
  "dados": "2d6",
  "duracao": "3 turnos",
  "desc": "Descrição do efeito completo..."
}
```

**Parâmetros e custos PM:**
| Parâmetro | Custo base |
|-----------|------------|
| Alcance (1-10 blocos) | 1-20 PM |
| Área (1-6 blocos raio) | 2-18 PM (+3 PM para excluir aliados) |
| Alvos múltiplos (2-5) | 3-15 PM |
| Dados (d3 a d20) | 1-20 PM (dobra no 2º dado) |
| Intensidade (+1 a +9) | 1-25 PM |
| Duração (1 turno a cena inteira) | 1-20 PM |
| Carregamento (redução): 1 ação=0, 2 ações=-2, turno completo=-5 | Redução |

---

### Ascensão Arcana e Pulso

Requisitos: nível 7+ E pelo menos 1 atributo em 5.

**Pulso de Ascensão — campo: pulso_at:**
- Começa em 0 no início de cada combate
- Zera ao fim do combate
- Sem máximo real de jogo

**Ganhos de Pulso (+1 cada):**
- Acertar um ataque que cause dano
- Sofrer dano de um inimigo
- Rolar Sucesso Crítico em qualquer teste
- Um aliado cair inconsciente no campo de visão

**Habilidades de Ascensão — campo: ascensao_habs:**
| ID Firebase | Atributo | Nome | Custo | Tipo | Efeito |
|-------------|----------|------|-------|------|--------|
| punho_negro | Poder 5 | Punho Negro | 1 Pulso | Ação livre antes de atacar | Ignora todos espaços de proteção; dano não pode ser reduzido; crítico = derruba e atura por 1 turno |
| fluxo_ininterrupto | Habilidade 5 | Fluxo Ininterrupto | 1 Pulso | Reação ao ser atacado | Esquiva automática sem dados; move 2 blocos; se adjacente, contra-ataque com Ganho. 1x/rodada |
| corpo_absoluto | Resistência 5 | Corpo Absoluto | 1 Pulso | Reação ao sofrer dano | Dano reduzido à metade; se fosse cair, fica com 1 PV e ganha +1 Pulso; imune a condições por 1 turno. 1x/rodada |

Na ficha: pulso_container e xp_section aparecem quando toggles.asc_unlocked === true.

**Decadência Arcana** (tentar sem requisitos):
- Poder Corroído: Perda permanente em Luta com força; -1d4 fixo no dano físico
- Habilidade Fragmentada: Perda permanente em Esquiva e Atirar; Sucesso Crítico apenas com 6+6
- Resistência Erodida: Perda permanente em Fortitude e Vontade; -5 PM máximo a cada nível subido

---

### Maldições e Dádivas

Obtidas exclusivamente em campanha. Limite: 1 Maldição + 1 Dádiva por personagem.

Controladas via toggles.dadivas (quais o personagem tem) e toggles.dadivas_ativas (quais estão ativas).

| ID Firebase | Nome | Tipo | Cor |
|------------|------|------|-----|
| mascara_lunar | Máscara Lunar | Maldição | #9999ff |
| lodo_corrompido | Lodo Corrompido | Maldição | #66cc66 |
| marca_do_abismo | Marca do Abismo | Maldição | #aaaaaa |
| combustao_arcana | Combustão Arcana | Dádiva | #ff8833 |
| escarcha_absoluta | Escarcha Absoluta | Dádiva | #66ddff |
| tremor_abissal | Tremor Abissal | Dádiva | #cc88ff |

---

## Ficha V3 Estrutura HTML

O arquivo ficha_v3.html é organizado em 3 colunas com navegação mobile.

### Coluna 1 — Personagem (col-0, ativa por padrão)
- Avatar circular + nome + botões de linhagem
- Classe e Raça (readonly, abrem compêndio)
- Atributos: Poder, Habilidade, Resistência
- Perícias com dots clicáveis (0-4)
- Barras de PV, PM (mana) e Pulso de Ascensão
- Defesa: Armadura Natural + Defesa Total
- Espaços de Proteção com slots clicáveis + botão Descanso
- Limiares de dano calculados automaticamente
- Tema e picker de cores

### Coluna 2 — Habilidades e Técnicas (col-1)
- Habilidades de Classe (preenchidas via compêndio)
- Habilidades de Raça (preenchidas via compêndio)
- Caminhos de Arcana (arcana_habs) com campos de caminho e perícia
- Técnicas com todos os campos de parâmetros
- Grid visual dos 6 caminhos disponíveis
- Seção de Ascensão Arcana (oculta até asc_unlocked)
- Seção de Maldições e Dádivas (oculta se sem nenhuma)

### Coluna 3 — Combate e Inventário (col-2)
- Rolador 2d6 com modos Normal/Ganho/Perda + seletor de perícia
- Detecção de Crítico (dados iguais), Crítico Perfeito (6+6) e Falha Crítica (1+1)
- Proficiências em Armas com dots clicáveis (0-3 graus)
- Arsenal de Equipamentos (compêndio ou manual)
- Inventário Geral
- XP (Pontos de Despertar) + botão Evoluir (abre modal de Ascensão)
- Anotações livres

### Variáveis CSS principais

```css
:root {
    --bg: #0a0a0a;
    --text: #e8e0d5;
    --theme-main: #7a1a1a;
    --theme-card: #1a0a08;
    --theme-border: #4a1a18;
    --theme-input: #120605;
    --theme-light: #e8a090;
    --theme-accent: #c0392b;
    --gold: #c9a84c;
    --gold-dim: #7a6030;
}
```

### Temas disponíveis

```javascript
const THEMES = {
    sangue, oceano, floresta, ametista, sombra,
    rubi, ouro, esmeralda, cobalto, violeta, magenta, aurora, obsidiana
};
```

Cada tema altera: theme-main, theme-card, theme-border, theme-input, theme-light.

### Linhagem body classes

```css
body.forma-demon { /* neon vermelho */ }
body.forma-beast { /* neon verde */ }
body.forma-sacra { /* neon ciano */ }
```

---

## Convenções de Código

### Campos simples salvos via event listener

```javascript
const SIMPLE_FIELDS = [
    'char_name', 'nivel', 'florins',
    'hp_at', 'hp_max',
    'mana_at', 'mana_max',       // PM usa "mana" no código
    'pulso_at', 'pulso_max',
    'poder', 'habilidade', 'resistencia',
    'xp_total', 'pdt_total', 'pp_total',
    'anotacoes'
];
```

### Salvamento no Firebase

```javascript
// Campo raiz da ficha
update(ref(db, dbPath), { campo: valor });

// Campo aninhado
update(ref(db, `${dbPath}/habilidades/${cat}/${id}`), { titulo: 'Nome' });

// Helper usado em onchange dos inputs
window.saveHab = (cat, id, field, val) => {
    update(ref(db, `${dbPath}/habilidades/${cat}/${id}`), { [field]: val });
};
```

### Adicionar item a uma lista

```javascript
push(ref(db, `${dbPath}/habilidades/${categoria}`), { titulo: '', desc: '' });
```

### Remover item

```javascript
remove(ref(db, `${dbPath}/habilidades/${categoria}/${id}`));
```

### Toggles de linhagem — campos Firebase

```javascript
// CORRETO (versão atual v3):
'toggles/linhagem_demon'   // boolean | null
'toggles/linhagem_beast'   // boolean | null
'toggles/linhagem_sacra'   // boolean | null
'toggles/forma_ativa'      // "demon" | "beast" | "sacra" | null

// LEGADO (v2 — nao usar na v3):
// 'toggles/linhagem_1', 'toggles/linhagem_2', 'toggles/linhagem_3'
```

### IDs de elementos importantes

| ID | Elemento |
|----|---------|
| col-0, col-1, col-2 | Colunas (mobile: só a .active aparece) |
| avatar_display | Avatar circular |
| char_name | Input do nome |
| linhagem_btn_container | Container dos botões de linhagem |
| bar_hp, bar_mana, bar_pulso | Fills das barras de recurso |
| ep_slots | Container dos espaços de proteção |
| an_val | Valor da Armadura Natural |
| defesa_val | Valor da Defesa Total |
| pericias-grid | Grid das perícias com dots |
| proficiencias_container | Container das proficiências |
| list_classe_hab | Habilidades de classe |
| list_raca_hab | Habilidades de raça |
| list_arcana_habs | Habilidades de Arcana (caminhos) |
| list_tecnicas | Técnicas com parâmetros |
| list_armas | Arsenal de equipamentos |
| list_inventario | Inventário geral |
| asc_hab_list | Habilidades de Ascensão desbloqueadas |
| pulso_container | Bloco da barra de Pulso (oculto por padrão) |
| xp_section | Seção de XP e Ascensão (oculta por padrão) |
| dadivas_section | Seção de Dádivas (oculta se sem nenhuma) |
| die1, die2 | Boxes visuais dos dados |
| die1_val, die2_val | Valores dos dados |
| roll_result_text | Descrição do resultado da rolagem |
| roll_outcome | Outcome (crítico/falha/total) |
| pdt_display | Contador de PDT |
| pp_display | Contador de PP |
| display_xp | Pontos de Despertar exibidos |
| modal_choice, modal_db, modal_asc, modal_img | Modais |
| colorPicker | Picker de cores de tema |

---

*Ultima atualizacao: sistema 3E completo — 9 capitulos de regras, 21 racas com habilidades completas, 9 classes.*
