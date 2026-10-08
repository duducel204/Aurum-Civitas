# Aurum Civitas — implementação da projeção

O repositório contém uma economia executável, um visualizador minimalista e módulos configuráveis para o mundo coletivo. A fonte de verdade é `projection/repository_seed.json` (AC-RS2); o mapa de expansão é `projection/repository_manifest.json` (AC-M2). Os arquivos originais da projeção não foram redefinidos.

## Executar

Node 24 ou superior. O núcleo, os testes e a demonstração CLI usam apenas a biblioteca padrão; TypeScript é executado pelo suporte nativo do Node.

```sh
npm test
npm run demo
npm run verify:materialization
```

Para a interface Next/React existente:

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`. Clique em **Rodar**. Escolha **Estrada** e clique em células contíguas para conectar floresta, serraria e depósito. Escolha **Construção** para abrir uma obra. Ela aguarda materiais transportados; depois consome esses materiais uma única vez e passa por construção até ficar operacional. **+1 tick** permite inspecionar o avanço. **Verificar / exportar replay** reproduz a partida e baixa comandos, hashes e veredicto. **Reiniciar** restaura o mesmo cenário.

`fixtures/demo.json` é explicitamente experimental. Não transforma tick, capacidade, bootstrap, receita, título ou balanceamento em decisão oficial. A UI permite carregar um cenário JSON com o mesmo contrato. Valores ausentes são recusados. Os edifícios iniciais pertencem ao bootstrap finito do exemplo. O edifício novo do exemplo é um marco de construção; sua futura função econômica não foi inventada.

## Arquitetura e dependências

| ID | Módulo | Responsabilidade |
| --- | --- | --- |
| RM0 | rules | Configuração explícita, tipos e serialização canônica |
| RM1 | simulation | Estado oficial e transição por tick |
| RM2 | economy | Estoques, transformação e materiais incorporados |
| RM3 | transport | Rotas persistentes, cargas e entrega física |
| RM4 | replay | Comandos completos, checkpoints SHA-256 e reprodução |
| RM5 | judge | Resultado derivado do estado reproduzido |
| RM6 | regions | Sete arquétipos, pixels, vizinhos e vantagens configuradas |
| RM7 | sustainability | Consumo de comida, fome e regeneração explícita |
| RM8 | membership | Identidade estável e permissão por cidade |
| RM9 | world | Ordem compartilhada, reserva e comércio em trânsito |
| RMA | contributions | Missões reproduzidas e revisão independente |
| RMB | recognition | Monumentos, títulos e correções sem apagar história |
| RMC | provenance | Origem, evidência e correção de dados regionais |
| RMD | observer | Cópia congelada para exibição |

Cada módulo está em `lib/aurum/`, cada teste em `tests/aurum/`, cada missão em `missions/` e cada prova em `evidence/RT*/result.json`. Relações de construção continuam no Seed: regras → simulação → economia/transporte/observação → replay → juiz. Perfis regionais podem ser especificados após as regras. Comércio depende de permissões, logística, regiões e auditabilidade; reconhecimento depende de contribuição aceita e identidade.

`components/game/game-world.tsx` envia comandos e lê snapshots; não contém as regras econômicas. O relógio da UI chama uma transição com duração fixa. Pausar ou variar a frequência de renderização altera a velocidade de exibição, não o resultado de uma sequência igual de ticks e comandos. `lib/game-engine.ts` permanece como fonte legada compatível; a nova UI não depende de sua antiga orquestração.

## Mecânicas implementadas

**Economia:** fonte finita → trabalhador se desloca até a origem → coleta temporizada → carga percorre a rota → entrega no produtor → insumos entram no trabalho em processo → outputs são produzidos → carga chega ao depósito → materiais abastecem uma obra. Madeira no depósito pode retornar fisicamente à serraria. Estoques, cargas, trabalho em processo e materiais incorporados permanecem na contabilidade. Eventos de receita registram inputs e outputs; a verificação compara a transformação registrada ao total real.

**Ruas:** busca determinística em células conectadas, acesso final fora da rua somente quando autorizado pelas regras. Cada trabalhador preserva rota e índice de waypoint. Mudanças no grafo provocam recálculo explícito. Sem caminho autorizado, ele fica bloqueado com a carga. Reservas de espaço para entregas e outputs em processamento evitam que todos os trabalhadores ocupem um destino cheio. O exemplo usa trilha gratuita; vias pagas, postes especializados e burros não foram selecionados no Seed compacto materializado.

**Construção:** `awaiting_materials → building → operational`. Pedir uma obra não cria materiais. A contabilidade conserva materiais consumidos como incorporados. Receitas e custos são configuração obrigatória. O exemplo não concede função nova ao edifício além do estado de construção.

**Replay:** estado inicial, versão de regras, comandos aceitos/rejeitados por tick, hashes anterior/seguinte, número de frames e checkpoint final. Alteração ou truncamento sem correspondência dos hashes falha. O juiz refaz a transição e deriva estoque entregue e ticks; não aceita uma mensagem de vitória do cliente. SHA-256 detecta divergência; não substitui assinatura ou origem confiável do registro.

**Mundo coletivo:** funções RM8/RM9 implementam membros/donos, ordem autoritativa, versão esperada, idempotência por ator+comando, estoque debitado na saída e mercadoria em trânsito por ligações temporizadas. A chegada espera espaço; tentativas concorrentes ou repetidas não duplicam recursos. Há replay de ações do mundo e checkpoints verificáveis. A interface atual exibe a economia local; essas funções ainda não formam um serviço multiplayer público.

**Geografia/ecologia:** RM6 valida sete arquétipos e calcula vantagens com coeficientes recebidos. RM7 calcula consumo, fome, colheita limitada e crescimento registrado. São módulos funcionais testados; integração de mapas/eras/ecologia no loop compartilhado depende de parâmetros ainda abertos e não foi inventada.

**Contribuição/reconhecimento:** qualificação exige uma missão validada por replay, referências de código/diff e revisor distinto autorizado pelo chamador. O tick da contribuição vem do relógio compartilhado fornecido pelo revisor, não dos ticks relativos da missão. Referências de código e diff exigem um verificador de origem recebido pelo chamador. Atribuição histórica exige verificação da contribuição aceita, respeita janela da era e critérios de títulos recebidos. Repetir a atribuição não duplica prêmios. Correções acrescentam eventos; preservam o anterior. A verificação de identidade, evidência externa e permissão do revisor é uma fronteira injetada: os testes usam fixtures confiáveis, não autenticação real.

**Dados regionais:** registros distinguem jogo e mundo real. Dados reais precisam de um verificador de evidência recebido pelo chamador. Uma correção não pode mudar um registro fictício para real. Origem e versões anteriores permanecem acessíveis.

## Projeção × execução

`npm run verify:materialization` executa os testes, verifica a correspondência dos IDs e missões, registra hashes de código/teste e compara dois percursos com inputs iguais. Salva trace reproduzível em `evidence/economic-replay.json`, saída completa em `evidence/tests.tap` e resumo em `evidence/materialization.json`. O resumo contém os ticks medidos de cada percurso; não pressupõe o ganho ilustrativo de 40% do GDD.

O round trip verificado é: ID do Seed → módulo → teste executado → missão com relação original → evidência. Na economia há também estado → execução → trace → replay → mesmo hash. Isso não certifica que todas as obrigações do mundo final já foram satisfeitas; o relatório distingue contrato configurado testado e integração ainda ausente.

## Lacunas preservadas

1. Valores canônicos de receitas, tick, capacidades, bootstrap, perfis, preservação, títulos e eras: o Seed os deixou abertos. Fixtures são exemplos explícitos.
2. Autenticação real, persistência durável de produção, rede e hosting: provedores não foram escolhidos. Existem interfaces/funções de autorização, checkpoint e sessão local, sem um serviço externo inventado.
3. Integração de regiões, ecologia, mundo, missões de contribuição e monumentos na experiência compartilhada: módulos implementados e testados separadamente; o cliente jogável atual cobre a economia local.
4. Engajamento, equilíbrio econômico e sustentabilidade em partidas longas: testes determinísticos não equivalem a evidência de jogadores reais.
5. ACE (demanda externa por dados) e GF (novidade estrutural útil): permanecem UNRESOLVED.

Evolução prevista: validar os parâmetros → ligar os módulos regionais ao estado compartilhado → conectar identidade e persistência autorizadas → executar partidas entre cidades → vincular missões e reconhecimento ao registro aceito → medir preservação e engajamento. Alterar uma decisão estrutural exige Seed diff e nova projeção; não aconteceu nesta materialização.

## Verificação da interface

Build e tipos são verificados com `npm run build`; lint com `npm run lint`; a resposta HTTP do app compilado com `npm run smoke:http`. O teste HTTP verifica HTML, canvas e rótulo da configuração. Interação visual/hidratação no navegador não foi executada: o ambiente não tinha o binário e a tentativa de download retornou um arquivo truncado. Isso permanece como limitação de QA, sem afetar a execução dos testes do núcleo.
