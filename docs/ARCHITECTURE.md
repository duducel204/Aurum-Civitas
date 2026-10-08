# AC-001 — arquitetura e contratos mínimos

Fonte estrutural: Projection IR → AC-RS2/AC-IS1 → manifestos → código.
O recorte atual é calculado em `projection/task_seed.json`; a execução e as
lacunas ficam em `evidence/task-validation.json` e `docs/TASK_RESOLUTION.md`.

`RM0` valida regras obrigatórias, versionadas. `RM1.step` é a única transição
canônica: recebe estado, comandos ordenados e regras; devolve outro estado.
React e Canvas observam esse resultado. Relógio, câmera, preferências e som
nunca entram no estado de gameplay ou no hash.

`RM2` contabiliza estoque, insumos em processamento, carga e materiais
incorporados. `RM3` persiste rota e waypoint; a entrega não teleporta carga.
`RME` define mapa, células protegidas e ruas iniciais imutáveis. `RMF` calcula
geração, circuitos, alcance de distribuição, demanda e habitação.

`RM4` grava e reexecuta comandos com SHA-256; `RM5` deriva o resultado da
missão. Replay demonstra equivalência de execução; não é verificador físico
independente de todos os erros do motor. O journal local usa regras exatas,
origem e hash final, e só troca a sessão depois da reexecução.

`RMD` apresenta a região em `/itaipu`. `presentation.ts` deriva estoques,
prévia, gargalos e estimativas sem mutar o mundo. `camera.ts`, renderer e
painéis HTML oferecem mapa, minimapa, teclado e lista acessível. Fontes
mapeadas OSM mantêm atribuição; recursos exploráveis são virtuais declarados.

RM6/RM7/RM8/RM9/RMA/RMB/RMC têm contratos e testes próprios, mas não equivalem
a um multiplayer público integrado. Identidade, persistência de servidor,
revisão independente e dados externos continuam exigindo evidências reais.
RMA aceita os IDs do registro RM0–RMF, recusando strings desconhecidas.

Contribuidores: preservar IDs, usar a mesma transição na UI e nos testes,
registrar regras novas por Seed diff antes da implementação, executar
`npm test`, tipos, lint, build, QA e verificar rastreabilidade. Nunca contar
um arquivo existente como uma capacidade certificada.
