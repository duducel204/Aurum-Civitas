# Projeção e materialização das tarefas — 2026-10-08

O backlog conserva 100 IDs. `project_tasks.py` usa o motor estrutural do Trajecta
preservado em `structural.py`: busca backward sobre todas as dependências,
seleção local, forward e uma checagem independente da ordem por Kahn.
O recorte selecionado tem 40 tarefas em seis ondas. Ordem calculada não é
prova de gameplay; cada tarefa exige a evidência indicada no manifesto atual.
AC-001 acrescenta arquitetura e contratos mínimos, sem substituir os IDs DEV.

## O que foi materializado

- DEV-01/02/03: primeiro fluxo real em navegador, orientação de bloqueios e
  provas da cadeia finita madeira → serraria → depósito com conservação.
- DEV-09–28: guia visual, desenhos procedurais, direção e carga
  dos trabalhadores, fases da obra, camadas, minimapa, câmera, teclado, toque,
  foco visível, lista acessível, preferências, pausa, tutorial, enciclopédia,
  cadeia produtiva e linha do tempo.
- DEV-31/32/68: autosave local com cópia anterior, recuperação por reexecução,
  diagnóstico de incompatibilidade, exportação do original e diagnóstico.
- DEV-37/38/46/47/48: cobertura e alocação de energia, estimativa de obra no
  estado atual, contabilidade por compartimento, gargalos e cache de consultas.
- DEV-41/42: fontes e produção já presentes foram reaproveitadas e conferidas,
  com testes identificando entidades por ID estável, não posição em array.
- DEV-65/66/67: descarte visual de feições fora da câmera, medições de tick e
  desenho fora do gameplay, QA em Chromium desktop e emulação de toque móvel.
- DEV-71/72: workflow por commit/PR, pacote standalone com regras/fontes/limites
  e instruções de retorno, mais QA executável sobre o próprio pacote.
- DEV-81/87: registro explícito RM0–RMF para contribuições e relatório atual de
  rastreabilidade. Manifestos históricos permanecem intactos.

O estado de DEV-71 inclui o resultado remoto do workflow quando disponível;
arquivo YAML e testes locais, sozinhos, não comprovam execução no GitHub.

## Reproduzir

```bash
npm ci
python projection/project_tasks.py
npx tsc --noEmit
npm run lint -- --max-warnings 0
npm test
npm run build
npx playwright-core install --with-deps chromium
npm run qa:browser
npm run benchmark:tasks
npm run verify:drift
npm run package:release
```

Executar o pacote: extrair `.release/aurum-itaipu.tgz`, definir
`HOSTNAME=127.0.0.1` e `PORT=3000`, executar `node server.js`, abrir `/itaipu`.
Node 24 e pacote da mesma plataforma do build são necessários. O código fonte
continua sendo a alternativa para instalar em outra plataforma. Para QA do
pacote, usar `AURUM_RELEASE_SERVER=.release/app/server.js npm run qa:browser`.

## Limites e pendências preservadas

As 60 tarefas restantes não foram declaradas concluídas. O manifesto associa
cada ID a dependências e causa. Novas regras [S] exigem Seed diff com política
de cancelamento, perdas, upgrades, manutenção, agricultura, estações ou
infraestrutura digital; não receberam valores oficiais inventados. Integrações
de alimentação/regeneração/clima requerem ligar RM7/RM6 ao loop canônico e
versionar seus parâmetros, hoje abertos. Balanceamento precisa de comparação
e calibração próprias; QA de navegador não substitui playtests prolongados.

Multiplayer, identidade e persistência de produção precisam de bindings e
evidência de dois clientes, reinício e reconexão. Reconhecimento público precisa
de revisão independente e origem externa verificável. Playtests consentidos e
utilidade externa exigem participantes/consumidores reais; não foram simulados
como provas. DEV-07 permanece adiada. AC-006/008/009/012 continuam pendentes:
trabalhadores automáticos e câmera não comprovam um personagem controlável.

A QA cobre Chromium desktop e viewport móvel com toque emulado. Não certifica
Safari, Firefox, leitores de tela específicos ou um aparelho físico. O cache
foi medido em consultas repetidas e o renderer por feições consideradas; não
há promessa de FPS ou escala massiva. O juiz ainda compartilha a transição
canônica; replay não elimina erros determinísticos do modelo.

Nenhuma contribuição ou monumento foi autoatribuído por este trabalho.
