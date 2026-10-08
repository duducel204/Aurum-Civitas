# Aurum Civitas

Implementação executável derivada do Seed AC-RS2, com economia local, replay e contratos do mundo coletivo.

**Guia de execução, arquitetura, mecânicas e lacunas:** [docs/MATERIALIZATION.md](docs/MATERIALIZATION.md).

```sh
npm test
npm run demo
npm run verify:materialization
# Interface web
npm ci
npm run dev
```

Node 24+. A demonstração usa valores experimentais explicitamente rotulados. Projeção: [projection/REPOSITORY_PROJECTION.md](projection/REPOSITORY_PROJECTION.md). Evidência gerada: [evidence/materialization.json](evidence/materialization.json).

Os 14 módulos possuem IDs, testes, missões e evidências rastreáveis. O gameplay web atual executa a economia local; multiplayer de produção, parâmetros oficiais e validação com jogadores permanecem pendentes.
