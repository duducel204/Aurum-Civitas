# Aurum Civitas

Aurum Civitas é um jogo de exploração e construção inspirado na cadeia de produção de The Settlers. A proposta é desenvolver comunidades a partir das características de cada região: recursos, infraestrutura, clima e oportunidades locais.

A direção do projeto é um mundo compartilhado, com ações verificáveis por outros participantes. **A versão atual executa uma simulação local; multiplayer e efeitos reais de clima ainda estão em desenvolvimento.**

## Como o jogo funciona

Construir exige uma cadeia de ações:

**Escolher um lote → reservar materiais → transportar pelas ruas → entregar → concluir a obra → atender a demanda da estrutura.**

Os materiais são finitos. Transportadores percorrem as ruas até a obra; a construção avança após receber os recursos. Uma casa pronta recebe moradores quando sua demanda de energia é atendida. Ter geração na região também exige cobertura e capacidade de distribuição no lote.

No cenário de Itaipu, **as ruas já existem e não precisam ser compradas**. A usina, duas subestações e uma instalação solar mapeadas também fazem parte da infraestrutura inicial. O jogador usa essa base para construir casas e expandir geração e distribuição.

## Instalação no computador

Você precisa de **Git e Node.js 24 ou superior**, com npm. Confira no terminal:

```powershell
git --version
node --version
npm --version
```

No Windows, abra o PowerShell na pasta onde deseja guardar o projeto. Para baixar a versão com Itaipu:

```powershell
git clone https://github.com/duducel204/Aurum-Civitas.git
cd Aurum-Civitas
npm ci
npm run dev
```

O cenário de Itaipu está integrado à branch principal (`main`).

Abra [http://localhost:3000/itaipu](http://localhost:3000/itaipu). Se o terminal indicar outra porta, use a porta exibida e acrescente `/itaipu`.

Mantenha o terminal aberto durante a partida. Use `Ctrl+C` para encerrar o servidor.

Se já clonou o projeto, entre na pasta dele e execute:

```powershell
git fetch origin
git switch main
git pull --ff-only
npm ci
npm run dev
```

## Primeiros passos em Itaipu

1. Abra `/itaipu`, ou clique em **Jogar em Itaipu** na tela inicial.
2. O primeiro lote já vem selecionado. Clique em **Construir casa**.
3. Observe os transportadores buscar materiais no depósito e percorrer as ruas até a obra.
4. Acompanhe a conclusão da casa e os indicadores de energia e moradores.
5. Selecione outros lotes para construir casas, geração solar ou subestações locais. Uma obra precisa de acesso ao depósito; terrenos ocupados, água e áreas bloqueadas recusam construção.
6. Use os controles para pausar, avançar ticks, mover o mapa e ajustar o zoom.

A primeira missão é ter uma casa construída e abastecida com energia. Você pode continuar explorando depois de concluí-la.

| Estrutura | Materiais | Tempo de obra | Efeito no jogo |
| --- | --- | --- | --- |
| Casa | 4 tábuas + 2 pedras | 12 ticks | 4 vagas; demanda 2 unidades de energia por tick |
| Geração solar | 2 tábuas + 2 pedras + 6 metal | 24 ticks | Gera 8 unidades por tick |
| Subestação local | 2 tábuas + 4 pedras + 4 metal | 20 ticks | Distribui até 24 unidades por tick |

Um tick é um passo da simulação. Na execução automática, cada passo ocorre a cada 250 ms; o transporte leva tempo além da obra. O depósito inicial tem 60 tábuas, 40 pedras e 24 unidades de metal.

**Os números são parâmetros experimentais de jogo**, sem equivalência com MW ou capacidade real de Itaipu. A expansão é limitada pelo estoque inicial; este cenário ainda não oferece reposição contínua de materiais.

## Salvar e carregar

Clique em **Verificar e salvar partida** para exportar um arquivo com o estado inicial, regras, comandos e hashes. Guarde esse arquivo no computador.

**Carregar partida** reexecuta os comandos e verifica o resultado. Arquivos com mapa ou regras incompatíveis são recusados. O replay permite conferir a partida; a sessão atual não usa um servidor compartilhado.

## A lógica por trás do código

O projeto separa regras, simulação, economia, transporte e verificação. A interface envia comandos ao núcleo; o núcleo decide se cada ação é válida e calcula o próximo estado.

Com o mesmo estado inicial, regras e comandos, o replay deve produzir o mesmo resultado. Isso torna as ações auditáveis e prepara a base para resultados verificáveis por outros jogadores.

A construção do próprio projeto segue **Projection IR → System Seed IR → Materialização**: o objetivo vira uma representação compacta de capacidades, restrições e dependências; o cálculo seleciona uma trajetória; essa trajetória é expandida em código, testes, missões e evidências com IDs rastreáveis. A extensão de Itaipu calcula dependências estruturais; não prevê engajamento nem tempo de desenvolvimento.

## Estado atual e próximos passos

Já existem economia local, transporte, construção, casas com energia e replay verificável. Itaipu usa um snapshot cartográfico real como base, com regras virtuais de ocupação e energia.

Ainda faltam multiplayer de produção, balanceamento com jogadores, reposição de recursos neste cenário e efeitos regionais como temperatura, chuva, agricultura e irradiância. A partida local não representa propriedade de terrenos nem uma simulação elétrica de engenharia.

## Melhorar o jogo: tarefas para participantes

**Itaipu é o mapa base de todo o desenvolvimento inicial.** A [listagem de tarefas para issues](docs/TAREFAS_ITAIPU.md) cobre visual, jogabilidade, construção, economia, população, cooperação e contribuição, comparando as necessidades com a projeção e a materialização existentes. A matriz DEV-09 a DEV-88 e a extensão digital DEV-89 a DEV-100 complementam os oito abaixo; cada tarefa tem entrega, critério de conclusão e dependências. A extensão planeja data centers, hardware, energia, refrigeração, fibra e projeção de demanda futura no mesmo mapa; ainda não está implementada.

O jogo precisa evoluir com quem joga. Participantes podem contribuir com testes, relatos de bugs, documentação, dados regionais, arte ou código. A tabela abaixo transforma as necessidades atuais em tarefas escolhíveis. **É um plano de contribuição; essas tarefas ainda não são missões disponíveis dentro do jogo.**

Os IDs DEV identificam propostas de trabalho. Ao implementar uma delas, vincule-a aos IDs do Seed, aos arquivos alterados e à evidência de conclusão. A ordem prioriza tornar a experiência local sustentável antes de ampliar o mundo compartilhado.

| ID | Tarefa e resultado esperado | Como comprovar a conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-01 | **Testar a primeira partida.** Registrar dificuldades para instalar, escolher um lote, construir e salvar. | Relato com versão/commit, passos, resultado esperado e observado; replay quando disponível. Outra pessoa consegue reproduzir o problema ou seguir o guia corrigido. | — |
| DEV-02 | **Explicar bloqueios na interface.** Mostrar por que uma obra ou casa não funciona: acesso, materiais, cobertura ou capacidade elétrica. | Cada bloqueio exibe sua causa calculada pelo núcleo e uma orientação útil; conferir os casos no mapa. | — |
| DEV-03 | **Repor materiais em Itaipu.** Conectar fontes e cadeias de produção à logística do cenário, aproveitando a economia existente. | Uma partida produz e entrega novos materiais após consumir o estoque inicial; fontes finitas não ficam negativas; replay conserva os recursos. | — |
| DEV-04 | **Balancear construção e energia.** Ajustar custos, tempos, estoques e alcance com base em partidas registradas. | Comparar cenários antes/depois com métricas de tempo de construção, consumo e casas atendidas; versionar regras e justificar mudanças. | DEV-01, DEV-03 |
| DEV-05 | **Dar função aos moradores.** Definir uma primeira necessidade, como alimentação, e sua cadeia de atendimento. | Necessidade, consumo e efeito da falta ficam explícitos; uma missão demonstra abastecimento e escassez, sem criar recursos do nada. | DEV-03 |
| DEV-06 | **Adicionar características regionais.** Implementar primeiro um fator, como irradiância afetando geração solar, com dados e premissas declarados. | Duas condições regionais produzem efeitos diferentes e reproduzíveis; fonte, unidade, versão e regra de dados ausentes estão documentadas. | DEV-04 |
| DEV-07 | **Adicionar outra região jogável — adiada.** Todo o desenvolvimento inicial usa o mapa de Itaipu. | Retomar apenas após definir uma fase de expansão; preservar fontes, regras e compatibilidade. | Fora da fase inicial |
| DEV-08 | **Criar uma sessão compartilhada mínima.** Fazer dois participantes agir no mesmo mundo sob validação de um servidor. | Ambos observam o mesmo estado; comandos inválidos e duplicados são tratados; reconexão recupera a sessão e o histórico pode ser verificado. | Contrato de sessão, identidade, persistência e ordem de comandos definidos antes da implementação |

### Escolher e entregar uma tarefa

1. Escolha um ID e consulte as [issues](https://github.com/duducel204/Aurum-Civitas/issues) e os PRs para evitar trabalho duplicado. Abra uma issue descrevendo o recorte que pretende resolver.
2. Para código, crie uma branch a partir da versão de trabalho acordada. Se não tiver permissão de escrita, use um fork e envie um PR.
3. Faça uma melhoria pequena e revisável. Descreva o comportamento esperado antes de alterar as regras; preserve ruas existentes, estoques e reprodução determinística.
4. Inclua evidência apropriada: passos e imagens para interface; teste de regra ou replay para simulação; fonte e versão para dados regionais. Para mudanças de código, execute os comandos de verificação abaixo que se aplicarem.
5. No PR, informe o ID da tarefa, o que mudou, como testar e os limites conhecidos. A revisão confirma a contribuição antes de integrá-la.

**Bom primeiro passo:** DEV-01 para quem quer jogar e relatar; DEV-02 para quem quer começar pela interface. A cadeia de reposição DEV-03 é o próximo avanço que permite continuar construindo quando o depósito inicial acaba.

Contribuições ficam rastreáveis por issues, commits, PRs e evidências. Reconhecimento dentro do jogo, títulos e benefícios para contribuidores ainda precisam de regras e implementação; esta lista não concede recompensas automaticamente.


## Comandos para desenvolvimento

```sh
npm test
npm run demo:itaipu
npm run build
npm run verify:materialization
```

Para executar a versão compilada, use `npm run build` e depois `npm start`.

## Documentação

- [Cenário de Itaipu: regras, fontes e limites](docs/ITAIPU.md)
- [Arquitetura, mecânicas e lacunas](docs/MATERIALIZATION.md)
- [Projeção do repositório](projection/REPOSITORY_PROJECTION.md)
- [Seed da extensão de Itaipu](projection/itaipu_seed.json)
- [Evidência de execução de Itaipu](evidence/itaipu.json)

Cartografia: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Dados cartográficos e base derivada sob ODbL 1.0.
