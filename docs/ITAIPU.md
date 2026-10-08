# Itaipu: casas e energia sobre infraestrutura existente

Abra `/itaipu`, ou use **Jogar em Itaipu** na tela inicial. O primeiro lote já vem selecionado. Clique em **Construir casa**: quatro transportadores buscam quatro tábuas e duas pedras no depósito finito, percorrem as ruas existentes, entregam os materiais e a obra avança por 12 ticks. A casa pronta oferece quatro vagas e consome duas unidades de energia por tick. Recebe moradores quando toda sua demanda é atendida.

Não há compra ou edição de ruas neste cenário. As 4.977 células de rua já integram o estado inicial. O movimento usa a malha de oito vizinhos do raster OSM, com acesso final limitado a uma célula. Sem ligação desde o depósito, o lote recusa a obra. Água, vegetação, prédios e instalações mapeadas bloqueiam construção, assim como um lote ocupado. Todas as regras passam por RM1; a interface não altera estoques nem produz uma simulação alternativa.

## Estruturas disponíveis

| Estrutura | Materiais | Obra | Função experimental |
| --- | --- | --- | --- |
| Casa | 4 tábuas + 2 pedras | 12 ticks | 4 moradores; demanda 2 u/tick |
| Geração solar | 2 tábuas + 2 pedras + 6 metal | 24 ticks | Gera 8 u/tick; distribui 8; alcance 6 passos de rua |
| Subestação local | 2 tábuas + 4 pedras + 4 metal | 20 ticks | Distribui 24 u/tick; alcance 12 passos de rua |

Itaipu (`way/32236291`), duas subestações (`way/32302779`, `way/510234533`) e a instalação solar (`way/1497605063`) são estruturas iniciais identificadas nos dados fornecidos. A usina tem geração de jogo 120; a solar existente, 8. A geração e as subestações não precisam ser reconstruídas. Os pontos logísticos dessas instalações são entradas virtuais na rua mais próxima; não são portas cadastradas.

Os dois circuitos iniciais usina → subestações são pressupostos explícitos do cenário. O snapshot não contém a topologia elétrica real completa. Novos geradores/subestações conectam circuitos por corredores das ruas quando dentro do alcance declarado. Energia exige circuito energizado, cobertura e capacidade local; geração regional suficiente não garante atendimento em todo lote. A ordem de atendimento é estável por ID. A capacidade de uma subestação limita sua distribuição local; não modela engenharia de transmissão. Linhas tracejadas mostram relações de serviço, não o traçado físico dos cabos.

O balanço por tick é `geração = atendimento + excedente não usado`; `demanda = atendimento + déficit`. Não há estoque infinito ou energia acumulada. Casas sem cobertura, em obra ou sem energia suficiente ficam sem moradores. A missão exige uma casa abastecida, comprovada pelo estado reexecutado.

O depósito começa com 60 tábuas, 40 pedras e 24 unidades de metal. São recursos finitos do bootstrap. Esta entrega não adiciona extração contínua, reposição, clima/irradiância real nem população com alimentação e migração completas. Valores de custo, velocidades, moradores e energia são parâmetros experimentais, sem equivalência com MW ou disponibilidade real de energia da usina.

## Verificar e retomar

**Verificar e salvar partida** exporta o estado inicial, regras, comandos e hashes. **Carregar partida** reexecuta o arquivo com as regras atuais: um mapa ou versão de regras incompatível é recusado. A sessão continua em ticks determinísticos e pode ser pausada ou avançada manualmente. Não é um serviço multiplayer ou armazenamento compartilhado.

```sh
npm ci
npm test
npm run dev
```

Para recompilar o cenário sobre os mesmos anexos, execute `python scripts/generate-itaipu-scenario.py`. Para refazer o cálculo estrutural da extensão, `python projection/project_itaipu.py`. Este usa o solver já existente, busca backward e um oracle exaustivo: sete operadores fecham casas, energia, interface e replay. Isso calcula dependências; não prevê tempo de desenvolvimento ou qualidade de engajamento.

`projection/itaipu_seed.json` (AC-IS1) estende AC-RS2; `itaipu_result.json` contém a trajetória calculada; `itaipu_manifest.json` liga RME/RMF a módulos, testes RTE/RTF e missões RJE/RJF. O cenário preserva timestamp e SHA-256 do mapa e snapshot. Os arquivos de origem permanecem inalterados; atualização de fonte exige nova versão de cenário.

© OpenStreetMap contributors. Dados cartográficos e base derivada: ODbL 1.0. Lotes são células virtuais de jogo; não indicam titularidade ou autorização de ocupação.
