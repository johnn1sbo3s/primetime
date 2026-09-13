# Design: redesign do gráfico de momentum do scanner

Data: 2026-09-12 · Repo: jonebet-frontend · Status: aprovado pelo usuário (jone)
Decidido em sessão com visual companion (mockups em `.superpowers/brainstorm/94718-*/content/`).

## Contexto

O card do scanner (`app/components/scannerCard.vue`) renderiza o gráfico via
`app/components/momentumChart.vue` (SVG `viewBox 0 0 640 158`, dois painéis
1º/2ºT com `GAP 8`, centro `y=55`, barra valor 1.0 = 55px). Problemas:

1. Gol = círculo branco genérico sobre as barras, feio e fácil de confundir.
2. Chutes (C1–C4, já no payload) invisíveis no gráfico.
3. Sem detalhe por minuto (pressão, chute, gol, alerta juntos).
4. Barras grossas demais, linha central apagada, sem referência do que é
   "pressão interessante".

## Dados disponíveis (sem mudança de backend)

Tudo já chega no front, nada de VPS:

- `momentum[]`: `{minute, half, home, away}` — 1 barra/min, um lado > 0.
- `goals[]`: `{minute, stoppage_time, team, player, half}` — `player` é id
  opaco do Flashscore, não nome: popover mostra time + minuto, nunca nome.
- Chutes por minuto: `game.shot_events` é o **delta do ciclo**; o histórico
  completo por minuto vem da série xG merged (`mergeXgSeries` em
  `app/utils/scannerShots.js`, que o card já monta em `xgLiveSamples`).
  Evento: `{minute, team, xg_delta, tier C1–C4, label}`.
  Tiers: C1 ≥ 0.50 (grande chance), C2 0.20–0.50 (boa), C3 0.05–0.20
  (média), C4 < 0.05 (sem perigo).
- `notifications[]`: `{rule, label, minute, at}` — alertas de pressão,
  join por `minute`.

## Decisões (todas aprovadas no companion)

1. **Faixa de incidentes única** acima das barras, separada por linha —
   nada passa por cima das barras (estilo Sofascore).
2. **Chute = bola numerada**: bola escura, anel na cor do time, número branco
   = tier (1–3). **C4 fica de fora** do gráfico (igual às linhas do card).
3. **Gol = bola do Packball**: vetor colado no SVG (path 512, ver § Geometria),
   disco branco + bola na cor do time (gomos time, costuras brancas —
   camadas: disco branco embaixo, path na cor do time por cima).
4. **Colisão no mesmo minuto**: prioridade `gol > C1 > C2 > C3 > alerta`;
   só o vencedor aparece + badge `+N`; resto no popover. Minuto com SÓ
   alerta = losango âmbar (outline). Gol e chute no mesmo minuto é o caso
   comum (xG salta no minuto do gol), não exceção.
5. **Cluster em minutos vizinhos**: cascata — gol ancora no x exato, resto
   desloca pra esquerda com respiro mínimo de 30px e **linha-guia** fina até
   o x verdadeiro; balãozinho arredondado atrás de cada marcador
   (estilo Flashscore). Guarda de borda: x nunca negativo — se a cascata
   estourar a esquerda, desloca pra direita do gol em vez disso.
6. **Linha vermelha ao vivo**: tracejada no minuto atual + dot no topo.
7. **Barras**: largura 5 (status quo), linha central reforçada (`#52525b`,
   1.5px), **faixa de pressão 0.4**: tracejados em `centro ± 0.4·55` +
   sombreado sutil além deles.
8. **Popover do minuto**: hover no desktop, toque no marcador no mobile
   (`@click.stop`, não vira o card). Conteúdo: minuto, gol (time), chutes
   (tier + label + xG delta), alertas (labels), pressão casa × fora do minuto.
9. **Sem legenda** no card (rejeitada). Sem estrela (rejeitada).

## Geometria

- A faixa ocupa o topo do viewBox (altura ~56 unidades, calibrar na
  implementação); divisor `y=56`. O viewBox cresce (ex.: `640x158` →
  `640x214`); painéis, centro e ticks deslocam pra baixo juntos.
- Bolas de chute e gol: `r=10` (calibrar r10–r12 no navegador real).
- Badge `+N`: `r=9`, fundo `#52525b`, texto branco.
- Linha-guia: 1.2px `#a1a1aa`, do balão até o divisor da faixa no x do minuto.
- Linha ao vivo: 2px `#ef4444` tracejada + dot `r=6`.
- Faixa 0.4: linhas tracejadas `y = centro ± 22`, tint `#fafafa` 5% além delas.
- Path da bola (viewBox 512, escalar pro diâmetro do disco, centralizar):

```
M256 48C141.1 48 48 141.1 48 256c0 114.7 93.3 208 208 208 114.9 0 208-93.1 208-208 0-114.7-93.3-208-208-208zm127.3 80.7c8.5 8.5 16.1 17.7 22.6 27.5.7 1 .9 2.4.4 3.5L391.9 201c-.4 1-1.1 1.9-2.1 2.3l-57.5 26.2c-1.4.6-3 .4-4.2-.6l-56.6-47.6a4.1 4.1 0 0 1-1.4-3.1v-63.1c0-1.3.7-2.6 1.8-3.3l38.4-26.1c1-.7 2.3-.9 3.5-.5 25.8 8.9 49.6 23.6 69.5 43.5zm-73.9 297.6c-.4 1.2-1.4 2.1-2.6 2.4-16.3 4.8-33.4 7.2-50.8 7.2-17.5 0-34.5-2.5-50.8-7.2-1.2-.4-2.2-1.3-2.6-2.4l-16.4-43c-.4-1.1-.3-2.3.2-3.3l22.3-42.3c.7-1.3 2.1-2.1 3.5-2.1h87.5c1.5 0 2.8.8 3.5 2.1l22.3 42.3c.5 1 .6 2.2.2 3.3l-16.3 43zm-67.4-311v63.1c0 1.2-.5 2.3-1.4 3.1L183.9 229c-1.2 1-2.8 1.2-4.2.6l-57.5-26.2c-1-.5-1.8-1.3-2.1-2.3l-14.4-41.2c-.4-1.2-.3-2.5.4-3.5 6.5-9.8 14.1-19 22.6-27.5 19.9-19.9 43.7-34.6 69.6-43.3 1.2-.4 2.5-.2 3.5.5l38.4 26.1c1.1.5 1.8 1.7 1.8 3.1zM77.7 264.1l36.1-31.2c1.2-1 2.9-1.3 4.3-.6l52.4 23.8c1.1.5 1.9 1.5 2.2 2.7l14.6 57.3c.2 1 .1 2-.3 2.9l-23.2 43.9c-.7 1.3-2.1 2.2-3.6 2.1l-46-.6c-1.2 0-2.4-.6-3.2-1.6-20.5-27.7-32.5-60.6-34.7-95.4 0-1.3.5-2.5 1.4-3.3zm270.4 98.7L325 319c-.5-.9-.6-1.9-.3-2.9l14.6-57.3c.3-1.2 1.1-2.2 2.2-2.7l52.4-23.8c1.4-.6 3.1-.4 4.3.6l36.1 31.2c.9.8 1.5 2 1.4 3.3-2.1 34.8-14.2 67.6-34.7 95.4-.7 1-1.9 1.6-3.2 1.6l-46.1.6c-1.5-.1-2.9-.9-3.6-2.2z
```

## Componentes

| Arquivo | Mudança |
|---|---|
| `app/components/momentumChart.vue` | Faixa + marcadores + cascata + linha-guia + linha ao vivo + faixa 0.4 + popover. Novas props: `shots` (por minuto), `notifications`, `minute` (ao vivo; half inferido como nas barras). |
| `app/utils/scannerShots.js` (ou novo helper puro) | Agregação por minuto: `collectShots` → grupo `{minute → {shots[], goal?, alerts[]}}` + resolução de prioridade/cascata como função pura testável. |
| `app/components/scannerCard.vue` | Passa `shots` (da série merged), `notifications` e `minute` pro gráfico. |
| `tests/app/components/momentumChart.spec.ts` | Estende: faixa renderiza, prioridade +N, cascata/linha-guia, popover, faixa 0.4, linha ao vivo. |

## Calibragem pós-implementação (obrigatória)

Tamanhos finais (r bola, respiro, altura da faixa) são calibrados no
navegador real com o usuário após implementar — mock manual esgotou e erra
conta. Critério: cluster 42'/43' legível no card de 400px.

## Fora de escopo

Backend/VPS (zero mudança), C4 no gráfico, legenda, nome do jogador no
popover (id opaco), `xgLineChart.vue`, linhas de stat do card.
