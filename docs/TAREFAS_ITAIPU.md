# Desenvolvimento de Aurum Civitas em Itaipu: tarefas para issues

Status: **LISTAGEM PARA ISSUES**, não implementação nem certificação. Não foram executados testes ou alterações de gameplay para produzir esta listagem. A matriz original contém **80 tarefas adicionais, DEV-09 a DEV-88**. A extensão digital acrescenta **12 tarefas, DEV-89 a DEV-100**. Os oito IDs DEV-01 a DEV-08 do README são preservados; o total passa a 100 IDs, com DEV-07 adiada.

## Mapa base e direção

**Todo o jogo será inicialmente desenvolvido no mapa de Itaipu já incorporado ao repositório.** Casas, produção, população, preservação, cooperação e melhorias gráficas devem evoluir ao redor desse mesmo território. Novos mapas e expansão mundial ficam fora desta fase.

Preservar a cartografia de origem e suas versões. As ruas mapeadas são infraestrutura inicial, sem compra ou edição pelo jogador. Lotes, recursos exploráveis, capacidades e assentamentos são elementos virtuais de jogo. Quando uma função exigir nova fonte de dados ou área jogável, declarar a premissa e a versão; não modificar a fonte OSM silenciosamente.

A comparação usa capacidades esperadas de um jogo de construção desenvolvido: leitura visual, controles confortáveis, aprendizado, ciclo econômico sustentável, decisões com consequências, recuperação de partida e cooperação. Não é uma análise empírica de outro título nem uma exigência de copiar suas funções. O foco é exploração local e colaboração.

## Comparação com o que já existe

Fontes consultadas: [README](../README.md), [materialização](MATERIALIZATION.md), [plano](../projection/MATERIALIZATION_PLAN.md), [lacunas](../projection/MATERIALIZATION_GAPS.json), [projeção](../projection/REPOSITORY_PROJECTION.md), manifestos AC-M2/AC-IM1 e contratos RMA/RMB.

| Capacidade de um jogo desenvolvido | Base materializada | Trabalho necessário neste mapa | Tarefas |
| --- | --- | --- | --- |
| Mundo legível, animação e feedback | Canvas, câmera, zoom e estruturas funcionais | Refinar apresentação e comunicação; manter UI como observadora | DEV-09–16 |
| Controles confortáveis e acessíveis | Clique, arraste, seleção e botões | Teclado, toque, foco, lista acessível e preferências | DEV-17–24 |
| Aprender, continuar e recuperar partida | Primeira casa e exportação/importação por replay | Tutorial, metas, autosave e diagnóstico | DEV-25–32 |
| Planejamento urbano com consequências | Obras finitas e atendimento elétrico | Filas, cancelamento, upgrade, cobertura e manutenção | DEV-33–40 |
| Economia que sustenta a expansão | RM2/RM3 funcionais; Itaipu usa estoque inicial finito | Integrar fontes, produtores e logística no mapa base | DEV-41–48 |
| População e território com particularidades | RM6/RM7 testados separadamente; RMF integrado | Alimentação, ecologia e condições locais no loop de Itaipu | DEV-49–56 |
| Progressão útil e equilíbrio | Juiz, regras configuráveis e reconhecimento isolado | Metas duradouras, medição e critérios públicos | DEV-57–64 |
| Partida estável e verificável | Núcleo determinístico, build e replay | QA real, perfis de custo, recuperação e release | DEV-65–72 |
| Cooperação persistente | RM8/RM9 com funções locais e adaptadores abertos | Identidade, servidor, persistência e trocas no mesmo mapa | DEV-73–80 |
| Participantes melhoram o próprio jogo | RMA/RMB/RMC com fixtures de verificação | Provas reais, catálogo, histórico, reconhecimento e drift | DEV-81–88 |

**Não reimplementar módulos existentes por padrão.** Primeiro ligar e testar seus contratos na experiência de Itaipu. Função testada isoladamente não equivale a função integrada, nem a serviço público.

## Relação com as oito tarefas anteriores

| Tarefa do README | Desdobramento nas novas tarefas | Ajuste para a fase Itaipu |
| --- | --- | --- |
| DEV-01 — primeira partida | DEV-25, DEV-60, DEV-67 | Testar o território-base com jogadores |
| DEV-02 — bloqueios | DEV-17, DEV-18, DEV-27, DEV-37 | Explicar causas concretas de acesso, estoque e energia |
| DEV-03 — reposição | DEV-41–48 | Fechar o ciclo produtivo no mesmo mapa |
| DEV-04 — balanceamento | DEV-30, DEV-59–62 | Calibrar com partidas e regras versionadas |
| DEV-05 — moradores | DEV-49, DEV-50 | Integrar alimentação antes de necessidades adicionais |
| DEV-06 — diferenças regionais | DEV-51–56 | Usar condições de Itaipu e suas áreas, com premissas declaradas |
| DEV-07 — outro mapa | Adiada, sem sucessora nesta fase | ID preservado; não é requisito para desenvolver Itaipu |
| DEV-08 — sessão compartilhada | DEV-73–79 | Dois participantes no mesmo mapa, depois mais comunidades |

## Classificação e relação com o Seed

- **P0 — experiência local utilizável:** DEV-17, DEV-18, DEV-20–22, DEV-25, DEV-31, DEV-32, DEV-41, DEV-42, DEV-46, DEV-67–69, DEV-71 e DEV-81.
- **P1 — aprofundar Itaipu:** demais tarefas locais de DEV-09–72, exceto DEV-63/64, que dependem de contribuição/sessão integrada.
- **P2 — cooperação e contribuição pública:** DEV-63/64 e DEV-73–88, exceto DEV-81. DEV-87 pode começar cedo como diagnóstico de documentação.
- Dependências prevalecem sobre prioridade. Tarefas podem ser divididas em PRs; não há prazo ou esforço numérico inventado. As 80 não são pré-requisitos para uma primeira versão jogável.

**[S]** marca proposta de nova ação ou contrato estrutural: precisa de Seed diff, constraints, busca backward/forward e trajetória selecionada antes de código. As demais são refinamentos ou integrações dos contratos existentes, sujeitos à mesma análise se mudarem semântica. Os IDs RM citados são responsáveis relacionados, não prova de que a capacidade nova já foi selecionada.

Este backlog é uma decomposição humana de necessidades e dependências; **não foi apresentado como trajetória matematicamente calculada**. Não altera o Seed AC-RS2, AC-IS1 ou seus manifestos históricos. O cálculo posterior deve selecionar o próximo recorte, não supor que todos os itens estão aprovados como arquitetura.

## As 80 tarefas

Cada linha contém uma entrega e uma condição de aceite. Dependências referem-se a tarefas concluídas **e verificadas**, não a caixas marcadas.

### Visual e leitura do mundo

RMD; renderer e interface. Refinamento visual, sem alterar a simulação.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-09 | **Identidade visual minimalista.** Definir paleta, tipografia, espaçamento e estados de componentes reutilizáveis. | Tela de Itaipu e laboratório usam o mesmo guia; textos e seleção permanecem legíveis. | — |
| DEV-10 | **Sprites de estruturas.** Criar desenhos distintos para casa, depósito, usina, solar e subestação. | Cada tipo é reconhecível no zoom de jogo, com legenda e origem/licença dos assets. | DEV-09 |
| DEV-11 | **Animação de trabalhadores.** Mostrar direção, deslocamento e carga a partir do estado observado. | Pausar congela a simulação; animações não alteram rotas, materiais ou replay. | DEV-09 |
| DEV-12 | **Progresso visual da obra.** Mostrar fases e materiais recebidos sem depender só de mensagens. | Obra vazia, abastecida e operacional são distinguíveis e correspondem ao núcleo. | DEV-10 |
| DEV-13 | **Camadas do mapa.** Alternar terreno, recursos, edifícios e serviço elétrico com legendas. | Alternar camadas preserva seleção e estado; cada símbolo tem significado explícito. | DEV-09 |
| DEV-14 | **Minimapa navegável.** Adicionar visão geral com retângulo da câmera e clique para navegar. | Clique leva à posição indicada; limites da câmera e mapa são respeitados. | DEV-13 |
| DEV-15 | **Leitura em diferentes zooms.** Ajustar rótulos e detalhes por escala, evitando sobreposição. | Visão regional e próxima preservam distinção entre rua, lote e estrutura. | DEV-10 |
| DEV-16 | **Feedback visual e sonoro.** Criar sinais discretos de seleção, rejeição, obra pronta e falta de serviço. | Eventos não se repetem por renderização; som pode ser desligado e não é o único aviso. | DEV-12 |

### Controles, acessibilidade e conforto

RMD/RM1; refinamentos de interação. P0 para entrada, P1 para conforto.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-17 | **Painel da estrutura selecionada.** Exibir estoque, obra, demanda, atendimento e motivo do bloqueio. | Selecionar estruturas diferentes mostra os valores do estado atual, sem dados simulados na UI. | DEV-02 |
| DEV-18 | **Prévia de construção.** Mostrar lote válido/inválido, custo e acesso antes de confirmar. | A prévia usa a mesma validação que o comando; uma rejeição posterior é explicada. | DEV-02 |
| DEV-19 | **Atalhos de teclado.** Permitir pausar, mover câmera, selecionar ferramenta e cancelar seleção. | Atalhos estão documentados, não disparam em campos de texto e têm alternativa por botão. | — |
| DEV-20 | **Interface para toque.** Ajustar controles, arraste e seleção para celular e tablet. | Construir e salvar funcionam em viewport móvel; arrastar não constrói acidentalmente. | DEV-18 |
| DEV-21 | **Acessibilidade sem depender de cor.** Adicionar contraste, foco visível e símbolos para estados. | Bloqueios e energia são distinguíveis sem cor; controles podem ser percorridos por teclado. | DEV-09 |
| DEV-22 | **Alternativa acessível ao canvas.** Criar lista navegável de estruturas e lotes sugeridos com ações equivalentes. | Leitor de tela anuncia seleção e resultado; a lista envia os mesmos comandos do mapa. | DEV-17, DEV-21 |
| DEV-23 | **Preferências do jogador.** Salvar volume, zoom de interface e redução de movimento localmente. | Preferências sobrevivem ao reload e não alteram regras nem hashes da partida. | DEV-16 |
| DEV-24 | **Menu de pausa e ajuda.** Reunir continuar, ajuda, salvar, carregar e reiniciar. | Reiniciar exige confirmação; sair da ajuda não avança ticks durante a pausa. | — |

### Aprendizado e experiência de partida

RMD/RM5, RM4 quando há provas. P0 para tutorial e salvamento; demais P1.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-25 | **Tutorial da primeira casa.** Guiar seleção, materiais, transporte, obra e energia por etapas observadas. | Etapas só concluem quando o estado correspondente ocorre; jogador pode pular o tutorial. | DEV-01, DEV-17 |
| DEV-26 | **Enciclopédia do jogo.** Explicar recursos, estruturas, unidades, custos e limites do cenário. | Valores vêm da configuração atual; unidades de jogo não são apresentadas como medições reais. | DEV-17 |
| DEV-27 | **Explicação da cadeia produtiva.** Mostrar origem, transformações, transporte e destino de cada material. | Jogador identifica onde uma cadeia parou usando estoques e eventos reais. | DEV-03, DEV-17 |
| DEV-28 | **Linha do tempo de eventos.** Filtrar construções, entregas, rejeições e mudanças de serviço. | Cada evento mostra tick e entidade; selecionar o evento localiza a estrutura quando existente. | DEV-17 |
| DEV-29 | **Missões locais progressivas.** Adicionar objetivos de construção, logística e abastecimento ao juiz. | Objetivos são versionados e derivados de replay, sem vitória declarada só pelo cliente. | DEV-25 |
| DEV-30 | **Cenários de dificuldade declarada.** Oferecer configurações iniciais com desafios diferentes, sem bônus ocultos. | Cada cenário declara estoques e regras; uma mesma configuração reproduz o mesmo resultado. | DEV-04 |
| DEV-31 | **Salvar automaticamente no navegador.** Criar slots locais e recuperação após fechar a aba. | Partida recuperada mantém regras, mapa e hash; quota cheia e save inválido geram orientação. | — |
| DEV-32 | **Diagnóstico e recuperação de saves.** Exibir versão, compatibilidade e opções seguras de exportação. | Arquivo incompatível não substitui a sessão atual; original é preservado; erro explica a causa. | DEV-31 |

### Construção e planejamento urbano

RM0/RM1/RM2/RM3/RME/RMF. Novas ações abaixo são extensões S do Seed.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-33 | **Fila e prioridade de obras [S].** Definir ordens de atendimento sem permitir retirar o mesmo material duas vezes. | Duas obras disputando pouco estoque respeitam a prioridade e conservam materiais. | DEV-03 |
| DEV-34 | **Cancelar uma obra [S].** Definir destino de reservas, cargas em trânsito e materiais incorporados. | Cancelamento em cada fase não duplica nem perde recursos fora da política declarada. | DEV-33 |
| DEV-35 | **Desmontar estruturas [S].** Definir custo, reaproveitamento e perda para estruturas construídas pelo jogador. | Saldo antes/depois fecha; instalações iniciais e vias mapeadas seguem política explícita. | DEV-34 |
| DEV-36 | **Melhorar estruturas [S].** Adicionar um upgrade funcional com materiais e custo definidos. | Upgrade exige entrega, altera capacidade só na etapa prevista e é reproduzível. | DEV-04 |
| DEV-37 | **Painel de cobertura elétrica.** Mostrar alcance efetivo, demanda e gargalo de cada distribuidor. | Um lote fora da cobertura não aparece atendido só porque há geração regional. | DEV-17 |
| DEV-38 | **Impacto previsto de uma nova casa.** Calcular demanda adicional e atendimento provável no estado atual. | Estimativa é rotulada e comparada com o resultado; mudanças concorrentes podem invalidá-la. | DEV-18, DEV-37 |
| DEV-39 | **Planejar vários lotes [S].** Permitir plano de expansão antes de confirmar ordens individuais. | Plano não cria obras nem reserva materiais até confirmação; conflitos ficam visíveis. | DEV-18, DEV-33 |
| DEV-40 | **Manutenção de estruturas [S].** Introduzir manutenção gradual com materiais, aviso e consequência definida. | Ausência de manutenção segue regra versionada; recuperação não recria materiais. | DEV-03, DEV-36 |

### Produção, estoques e logística

RM0/RM1/RM2/RM3/RME. Integrar economia existente; mudanças de regra usam S.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-41 | **Fontes de madeira em Itaipu.** Mapear fontes virtuais exploráveis e conectar coleta ao cenário. | Coleta diminui fonte finita, respeita áreas protegidas e entrega carga fisicamente. | DEV-03 |
| DEV-42 | **Produção de tábuas em Itaipu.** Conectar serraria e receita existente à malha mapeada. | Madeira vira tábuas com tempo e contabilidade; serraria sem insumos fica parada. | DEV-41 |
| DEV-43 | **Cadeia de pedra e metal [S].** Formalizar fontes e receitas do jogo, distinguindo dados reais de ficção. | Origem de ambos é declarada; produção exige insumos e não esconde estoque infinito. | DEV-03 |
| DEV-44 | **Depósitos adicionais [S].** Permitir armazenamento construído e transferências físicas entre depósitos. | Capacidade cheia bloqueia entrada; transferência não altera o total de recursos. | DEV-03 |
| DEV-45 | **Distribuição de trabalhadores [S].** Definir alocação por coleta, produção e entrega com limites explícitos. | Trocar função preserva carga e trabalho iniciado; trabalhador não aparece duplicado. | DEV-41, DEV-42 |
| DEV-46 | **Reservas e diagnóstico logístico.** Exibir material disponível, reservado, em trânsito e incorporado. | Soma exibida corresponde à contabilidade; jogador distingue falta de estoque de falta de rota. | DEV-17 |
| DEV-47 | **Indicadores de gargalo.** Mostrar fila, tempo de viagem e espera por material ou espaço. | Relatório identifica um gargalo criado em cenário controlado e a melhora após intervenção. | DEV-46 |
| DEV-48 | **Otimização medida de rotas.** Reduzir custo de cálculo por cache e invalidação explícita. | Benchmark antes/depois registra custo; cargas, destinos e replay continuam equivalentes. | DEV-47 |

### População, natureza e diferenças regionais

RM6/RM7 com RM1/RM2/RMF/RMC. Integrações e regras S conforme indicado.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-49 | **Alimentação integrada.** Conectar consumo e fome existentes à população do cenário. | Estoques baixam por regra explícita; zero alimento causa o efeito declarado sem população duplicada. | DEV-05 |
| DEV-50 | **Produção agrícola [S].** Definir cultivo, insumos, ciclos e colheitas em lotes virtuais do mapa de Itaipu. | Comida é produzida por fluxo contabilizado; diferenças de solo são pressupostos declarados quando faltarem dados locais. | DEV-49, DEV-06 |
| DEV-51 | **Regeneração florestal integrada.** Usar regeneração existente com limites e registro por tick. | Regeneração tem origem registrada, respeita capacidade e não converte área protegida em fonte livre. | DEV-41 |
| DEV-52 | **Indicadores de preservação.** Exibir extração, regeneração e saldo ao longo da partida. | Valores são derivados de eventos; duas estratégias de coleta mostram saldos distintos. | DEV-51 |
| DEV-53 | **Irradiância e geração solar.** Integrar primeiro fator regional à geração com configuração congelada. | Condições diferentes mudam geração de forma determinística; lacunas de dados são declaradas. | DEV-06 |
| DEV-54 | **Temperatura e demanda [S].** Definir efeito regional mínimo sobre uma demanda, sem modelo climático excessivo. | Mudança de faixa altera demanda segundo tabela explícita e permanece reexecutável. | DEV-49, DEV-53 |
| DEV-55 | **Sazonalidade reproduzível [S].** Introduzir calendário por ticks e ciclos regionais configurados. | Pausa não muda a estação; carregar save recupera a mesma fase e efeitos. | DEV-50, DEV-53 |
| DEV-56 | **Comparação entre áreas de Itaipu.** Comparar áreas do mesmo mapa por acesso, recursos e cobertura, usando perfis locais explícitos. | Duas áreas de Itaipu mostram vantagens e limites com origem e unidade claras; não há novo mapa nem valor real presumido. | DEV-52, DEV-53 |

### Progressão, balanceamento e longevidade

RM0/RM5/RM6/RM7/RMA/RMB. P1 após reposição; reconhecimento depende de evidência.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-57 | **Objetivos de médio prazo.** Definir metas de abastecimento e preservação além da primeira casa. | Cada objetivo tem resultado verificável, indicador visível e caminho possível no cenário. | DEV-29, DEV-52 |
| DEV-58 | **Desbloqueios por capacidades [S].** Liberar funções após cumprir requisitos úteis de desenvolvimento. | Requisito é explícito e validado; carregar ou repetir comandos não libera duas vezes. | DEV-57 |
| DEV-59 | **Comparador de balanceamento.** Rodar cenários fixos para comparar custos, duração e atendimento. | Relatório usa mesmos estados iniciais e mostra ganhos e perdas por métrica, sem score inventado. | DEV-04 |
| DEV-60 | **Playtests de partidas longas.** Medir bloqueios, repetição e recuperação após escassez com jogadores. | Relatos consentidos incluem duração e decisões; conclusões distinguem dados de hipóteses. | DEV-03, DEV-59 |
| DEV-61 | **Ferramenta de configuração de cenário.** Validar e pré-visualizar regras antes de iniciar partida. | Campos ausentes e combinações inválidas são recusados; exportação gera configuração versionada. | DEV-30 |
| DEV-62 | **Medidas de serviço e eficiência.** Mostrar proporção de casas atendidas, consumo e custos logísticos. | Métricas têm denominador e período definidos; não premiam desperdício de forma escondida. | DEV-47, DEV-52 |
| DEV-63 | **Reconhecimento cívico transparente.** Definir títulos ligados a contribuição aceita e critérios de era. | Critério fica visível; repetição não duplica título; nenhum bônus econômico é presumido. | DEV-81, DEV-82 |
| DEV-64 | **Missões comunitárias de preservação [S].** Definir objetivo coletivo de serviço e sustentabilidade com responsabilidades. | Resultado depende do estado compartilhado e não de votos ou autodeclaração de sucesso. | DEV-52, DEV-73 |

### Desempenho, qualidade e estabilidade

RM1/RM4/RM5/RMD; refinamento técnico. P0 nos controles críticos, P1 em otimizações.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-65 | **Renderizar só o necessário.** Medir e reduzir redesenho e cálculo visual fora da câmera. | Antes/depois usa mapa e dispositivo declarados; seleção e leitura não ficam desatualizadas. | DEV-15 |
| DEV-66 | **Controle do orçamento por tick.** Separar medição de simulação, renderização e cálculo de rotas. | Relatório mostra custo e atraso; máquina lenta não pula efeitos da simulação silenciosamente. | DEV-48, DEV-65 |
| DEV-67 | **QA de navegador e toque.** Cobrir fluxo real de construir, pausar, salvar e carregar. | Resultados em navegadores-alvo e viewport móvel incluem falhas e capturas; núcleo permanece igual. | DEV-20, DEV-32 |
| DEV-68 | **Diagnóstico de erros recuperável.** Adicionar mensagens úteis e exportação de diagnóstico sem segredos. | Erro de arquivo ou render não perde a última partida válida; exportação permite reproduzir. | DEV-32 |
| DEV-69 | **Testes de invariantes ampliados.** Explorar comandos, estoques e interrupções adversas além das fixtures atuais. | Sequências geradas preservam contabilidade e determinismo ou produzem caso mínimo reproduzível. | DEV-34, DEV-44 |
| DEV-70 | **Migração versionada de saves [S].** Definir transformações explícitas apenas para versões suportadas. | Original é preservado; versão sem migração é recusada; destino tem evidência de equivalência declarada. | DEV-32 |
| DEV-71 | **Verificação contínua de PRs.** Executar checks apropriados e publicar resultado por commit. | Falha de teste/build impede status aprovado; job não considera fixture como prova de multiplayer. | — |
| DEV-72 | **Pacote de release reproduzível.** Documentar e automatizar build, versão, notas e execução de release. | Instalação limpa abre Itaipu; release referencia regras, fontes, limites e instrução de retorno. | DEV-67, DEV-71 |

### Sessão compartilhada e cooperação

RM8/RM9, RM3/RM4/RM6/RMC. P2 após ciclo local; providers ainda não selecionados.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-73 | **Servidor de comandos autoritativo.** Conectar a ordem de comandos existente a dois clientes no mesmo mapa de Itaipu. | Clientes chegam ao mesmo checkpoint; comandos repetidos e obsoletos seguem o contrato. | DEV-08 |
| DEV-74 | **Identidade e permissões reais.** Conectar principal verificável a membros e direitos por comunidade. | Ação sem permissão é negada no servidor; trocar apelido não troca identidade histórica. | DEV-08 |
| DEV-75 | **Persistência durável do mundo.** Conectar checkpoints e histórico a um armazenamento definido. | Reiniciar servidor recupera estado e comandos; checkpoint corrompido não é aceito silenciosamente. | DEV-73, DEV-74 |
| DEV-76 | **Reconexão e confirmação de comandos.** Exibir pendência, rejeição e recuperação sem reaplicar ações confirmadas. | Desconectar após envio não duplica obra, recurso ou efeito ao reconectar. | DEV-75 |
| DEV-77 | **Entrada em comunidade de Itaipu.** Oferecer escolha de comunidade no mapa base, convite e papéis com escopo explícito. | Participante autorizado entra; remoção revoga futuras ações e preserva histórico. | DEV-74 |
| DEV-78 | **Trocas entre comunidades de Itaipu.** Conectar trânsito e interface de troca entre assentamentos virtuais no mesmo mapa, com ligações declaradas. | Estoque sai uma vez, viaja e espera capacidade; trechos desconectados sem ligação autorizada recusam troca, sem teleporte. | DEV-75, DEV-77 |
| DEV-79 | **Proteção operacional da sessão.** Definir limites por ator, validação de payload e auditoria de rejeições. | Spam de comandos não duplica efeitos nem impede indefinidamente atores válidos. | DEV-73, DEV-74 |
| DEV-80 | **Dados regionais com origem verificável.** Conectar verificador externo de evidência ao módulo de proveniência. | Correções preservam origem; dado de jogo não vira dado real por mudar seu rótulo. | DEV-56, DEV-74 |

### Contribuição, reconhecimento e evolução do próprio jogo

RMA/RMB/RMC/RM5, Seed/manifests. P0 na correção de IDs; integração pública P2.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-81 | **Compatibilizar IDs de Itaipu na contribuição.** Atualizar contrato e testes de IDs aceitos, hoje limitados a RM0–RMD. | RME/RMF válidos são aceitos com revisão e replay; ID inexistente continua rejeitado. | — |
| DEV-82 | **Verificar origem de código e revisão.** Conectar evidência de commit/diff e revisor independente aos adaptadores existentes. | Diff forjado, autorrevisão e referência ausente são recusados com prova reproduzível. | DEV-74, DEV-81 |
| DEV-83 | **Catálogo jogável de tarefas [S].** Apresentar tarefas de melhoria com escopo, evidência e estado verificável. | Catálogo distingue proposta, assumida, revisada e entregue; conclusão não é checkbox do autor. | DEV-82 |
| DEV-84 | **Provas adequadas por tipo de contribuição [S].** Definir contratos para arte, UX, docs e dados além da prova de gameplay atual. | Aceite exige evidência e revisão específica; documento não precisa forjar replay de uma mudança econômica. | DEV-82 |
| DEV-85 | **Histórico público de melhorias.** Exibir contribuição aceita, versão, autor e referências de evidência. | Lista reflete registro validado; correção aparece sem apagar o evento original. | DEV-83, DEV-84 |
| DEV-86 | **Reconhecimento e monumentos na interface.** Conectar atribuição existente a títulos e marcos visíveis no mundo. | Só contribuições aceitas geram reconhecimento; prêmio repetido é idempotente e critério está acessível. | DEV-63, DEV-85 |
| DEV-87 | **Drift entre Seed e materialização.** Comparar IDs/contratos com arquivos, testes, missões e evidências atuais. | Relatório distingue planejado, implementado, testado e integrado; aponta manifestos históricos sem reescrevê-los. | DEV-71 |
| DEV-88 | **Provar utilidade de dados de Itaipu.** Executar um caso de uso de dados do território-base com consumidor e critério de aceitação definidos. | Uso e custo observados são registrados; ACE/GF permanecem abertos se não houver prova de demanda/novidade. | DEV-80, DEV-85 |

## Contribuição: comparação e fechamento do ciclo

Hoje RMA exige missão validada por replay, referência de código e diff verificáveis, revisor autorizado distinto do autor e tick do mundo. RMB exige contribuição aceita, era e critérios de título; correções acrescentam histórico. São contratos existentes, ainda sem adaptadores reais e sem integração completa à interface.

Há uma incompatibilidade concreta: `contributions.ts` restringe IDs ao padrão `RM[0-9A-D]`, enquanto o manifesto de Itaipu registra **RME/RMF**. DEV-81 fecha essa lacuna com contrato e testes; aceitar qualquer string seria uma correção insuficiente.

Arte, documentação e UX não devem fabricar prova econômica para receber reconhecimento. DEV-84 propõe contratos específicos com revisão e evidência adequada. Até serem calculados e implementados, contribuições desses tipos podem ser revisadas via PR; não recebem automaticamente um evento RMA nem prêmio RMB.

Fluxo esperado: **tarefa → escopo/Seed quando necessário → implementação → teste ou evidência → revisão independente → versão integrada → contribuição aceita → reconhecimento com critérios**. Nenhuma tarefa concede vantagem econômica por si só. Benefícios exigem regra explícita, validação e balanceamento.

### Modelo de issue ou PR

- ID DEV e objetivo no mapa de Itaipu.
- IDs semânticos afetados e tipo: refinamento, integração ou extensão do Seed.
- Estado atual, entrega delimitada, dependências e critério de aceite.
- Arquivos/commit e versão de mapa/regras.
- Evidência: replay e missão para regra; fluxo de navegador para UX; antes/depois para visual; fonte/licença para assets e dados.
- Revisão independente, limites, compatibilidade e recuperação quando aplicável.

## Materialização e projeção: gaps que continuam abertos

| Gap documentada | Recorte deste backlog | Evidência necessária; o que não basta |
| --- | --- | --- |
| Parâmetros canônicos abertos | DEV-53–62 | Partidas medidas e regras versionadas; números de fixture não viram valores oficiais |
| Identidade, armazenamento e rede não vinculados | DEV-73–79 | Sessão real, reinício e reconexão; testes locais não provam multiplayer público |
| Regiões/ecologia/reconhecimento sem loop compartilhado | DEV-49–56, DEV-63/64, DEV-85/86 | Estado integrado observado e reexecutável no mapa base |
| Revisão e evidência externa sem adaptadores reais | DEV-80–84 | Origem verificável e revisor autorizado; callback confiável de teste não prova autenticidade |
| QA de interação no navegador pendente na materialização | DEV-20–22, DEV-67 | Clique, toque, foco e carregamento efetivos; build/HTTP não provam jogabilidade |
| Engajamento e custo operacional sem evidência | DEV-60, DEV-65/66, DEV-72/79 | Sessões e medições declaradas; não prometer retenção ou baixo custo sem observar |
| ACE/GF sem prova | DEV-88 | Consumidor e avaliação explícitos; volume de dados ou lista de funções não prova utilidade/novidade |

`REPOSITORY_PROJECTION.md` e AC-M2 preservam estados de planejamento, incluindo “gameplay não implementado” e `PROJECTED_NOT_CREATED`; a materialização posterior relata módulos executáveis. Esses documentos descrevem momentos diferentes. DEV-87 deve adicionar uma visão de estado atual com evidências, sem apagar a projeção original nem confundir proposta com entrega.


## Infraestrutura digital e demanda futura — DEV-89 a DEV-100

Extensão do caderno fornecido pelo usuário: **“Construa para o que sua região tem. Prepare-se para o que o mundo precisará.”** Referências de autoria: projeto Stitch 5218493143151832165, telas 2ba23324c02e4496937813e007113465 e ff63f735543c4a568cac97845206db06. Esta inclusão usa o texto fornecido; não presume conteúdo adicional das telas.

Todas as tarefas continuam no mapa de Itaipu. O fluxo proposto é **materiais e equipamentos → infraestrutura → capacidade disponível → atendimento de demanda**. Os 80 IDs anteriores são preservados; estas 12 tarefas ampliam a lista para **92 tarefas adicionais (DEV-09 a DEV-100)** e **100 IDs incluindo DEV-01 a DEV-08**, com DEV-07 adiada.

São propostas de extensão **[S]**, não funções já implementadas. RM0/RM1/RM2/RM3/RM4/RM5/RM6/RM7/RMD/RME/RMF são contratos relacionados; novas responsabilidades e IDs dependem de Seed diff e projeção. Não foram executados testes nem implementado gameplay nesta atualização.

| ID | Entrega | Critério de conclusão | Depende de |
| --- | --- | --- | --- |
| DEV-89 | **Formalizar economia digital no Seed [S].** Separar armazenamento, compute batch, edge, banda e valor informacional; definir estados, unidades, ações e constraints sem atribuir novos IDs RM antes da projeção. | Seed versionado e trajetória calculada distinguem capacidade instalada, disponível e serviço entregue; dados/compute/valor não se confundem. | DEV-43, DEV-87 |
| DEV-90 | **Perfil digital das áreas de Itaipu [S].** Declarar energia acessível, água, temperatura, conectividade, terreno e riscos por área do mapa-base. | Cada valor possui fonte, unidade, versão ou classificação de hipótese; abundância regional não concede acesso ilimitado nem licença fictícia. | DEV-89, DEV-56 |
| DEV-91 | **Hardware e data center modular [S].** Criar cadeia simplificada de equipamentos, construção e manutenção com logística física e lead time. | Obra exige entrega de materiais e equipamentos; capacidade só entra após conclusão; silício/cobre ausentes no mapa exigem origem virtual ou importação declarada. | DEV-89, DEV-43, DEV-40 |
| DEV-92 | **Energia concorrente para serviços digitais [S].** Integrar carga digital ao balanço elétrico de casas e produção, com prioridade explícita. | Demanda total e distribuição são conservadas; déficit limita serviço de acordo com regra conhecida, sem geração dedicada gratuita. | DEV-89, DEV-37 |
| DEV-93 | **Refrigeração e balanço hídrico [S].** Definir remoção de calor, consumo elétrico e água retirada, recirculada e perdida por sistema. | Serviço respeita capacidade de cooling; recirculação não elimina perdas automaticamente; déficit térmico/hídrico limita operação com efeito declarado. | DEV-90, DEV-91, DEV-92 |
| DEV-94 | **Fibra, banda e latência [S].** Criar ligações digitais construídas no mapa com equipamentos, capacidade, acesso e atraso de serviço. | Sem conexão não há atendimento remoto; gargalos respeitam banda; fibra não é automaticamente concedida por haver uma rua e não exige comprar ruas. | DEV-89, DEV-91 |
| DEV-95 | **Serviços e contratos de demanda [S].** Criar consumidores locais ou externos simulados, com prazo, volume e requisitos distintos para storage, batch e edge. | Atendimento exige hardware, energia, cooling e rede; serviço fora do requisito não conta como entrega; consumidores externos não exigem novo mapa. | DEV-91, DEV-92, DEV-93, DEV-94 |
| DEV-96 | **Demanda futura e choques reproduzíveis [S].** Definir séries por tick e cenários de crescimento/queda com sinais conhecidos, incerteza e eventos versionados. | Replay preserva choques; o jogador vê apenas informações autorizadas; percentuais e horizontes são parâmetros de cenário, não previsões reais garantidas. | DEV-95 |
| DEV-97 | **Projeção de expansão e lead time [S].** Calcular planos de geração, distribuição, cooling, fibra e compute para atender demanda ao longo do horizonte. | Planos respeitam recursos e tempo de obra; futuro não é revelado indevidamente; caso inviável retorna restrições/gaps e não um plano narrativo. | DEV-96, DEV-39 |
| DEV-98 | **Custos e impacto da capacidade [S].** Definir custos comparáveis de obra, operação, déficit, ociosidade, manutenção e pressão ambiental. | Unidades são normalizadas ou custos convertidos com pesos explícitos; J de custo é minimizado; utilidade é separada; pesos e objetivos são versionados. | DEV-95, DEV-52, DEV-59 |
| DEV-99 | **Painel digital e missões de atendimento [S].** Mostrar capacidade instalada/disponível, serviço entregue, gargalos, horizonte e impactos no mapa de Itaipu. | Indicadores vêm do núcleo; missão exige entrega dentro dos requisitos e limites; construir muitos data centers não equivale a concluir a missão. | DEV-17, DEV-95, DEV-97, DEV-98 |
| DEV-100 | **Comparar políticas reativas e antecipatórias [S].** Definir experiência controlada com mesmos estoques, demanda realizada e horizonte para estratégias de expansão. | Relatório compara déficit, ociosidade, custo e impacto por horizonte; não presume vitória projetiva; erro de previsão pode inverter o resultado. | DEV-96, DEV-97, DEV-98, DEV-99 |

### Relação com o roadmap existente

| Capacidade nova | Base a aproveitar | Extensão |
| --- | --- | --- |
| Hardware, construção e manutenção | DEV-33–48; economia e transporte | DEV-91 |
| Energia disputada por casas e compute | DEV-37/38; RMF | DEV-92 |
| Refrigeração e pressão hídrica | DEV-52/54/56; ecologia e perfis locais | DEV-90/93 |
| Comunicação e atendimento digital | Logística física para construir; novo fluxo de rede para operar | DEV-94/95 |
| Projeção de demanda e planejamento | DEV-39/59/61; Seed e cálculo | DEV-96/97/98 |
| Missões, painel e evidência | DEV-17/29/62/69; replay e juiz | DEV-99/100 |
| Utilidade externa de dados | DEV-80/88; proveniência | Serviço digital simulado não resolve ACE/GF automaticamente |

Os valores do exemplo R17 — percentuais, latência, PFlops e PB — permanecem ilustrativos e não viram parâmetros de Itaipu. Custos precisam de unidades comparáveis; “valor estratégico” precisa de critério próprio e não nasce de acumular arquivos. Floresta não é creditada automaticamente como capacidade de refrigeração. Metas e prioridades devem declarar competição com habitação e preservação. Exportação de compute pode começar com contratos externos simulados, sem implementar novos territórios ou assumir clientes reais.
