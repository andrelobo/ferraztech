# Workflow — FerrazTech

## Regras de desenvolvimento
- **1 coisa de cada vez** — um arquivo por commit
- **Spec primeiro** (Spec Driven Development) — escreve teste, depois implementa
- **Commits pequenos** — schema → dto → service → controller → module → spec, cada um separado
- **Nunca quebrar** — sempre rodar `npm test` antes de commitar
- **Nunca regredir** — verificar se todos os testes ainda passam
- **PRs revisáveis** — branch de feature, PR pequeno, mergear e seguir

## Sequência padrão de desenvolvimento
1. Spec/test primeiro
2. Schema / DTO
3. Service
4. Controller
5. Module
6. Verificar `npm test`
7. Commit (1 arquivo por vez)
8. Push
9. Criar PR → mergear → próximo
