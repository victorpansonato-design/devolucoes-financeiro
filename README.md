# Devoluções Financeiras · UniAnchieta

Exportação do protótipo de interface e visão do produto para continuidade do projeto. Sem backend, banco de dados, credenciais ou dados reais de alunos.

> Protótipo: não usar como sistema operacional ou para pagamentos. O time de TI implementará autenticação, integrações, API e segurança antes de qualquer uso com dados reais.

## Estrutura

- `app-interno/`: interface React/TypeScript para Solicitante, Financeiro e Cobranças a Pagar.
- `acompanhamento-publico/`: interface estática da trilha de acompanhamento do aluno.
- `docs/`: visão do produto, histórico de decisões, requisitos e design system.

## Estado da exportação

As telas foram preservadas como referência de frontend. O app interno ainda chama endpoints `/api/*` que não acompanham esta exportação; telas que dependem de dados não funcionarão sem um backend. A trilha pública também precisa de API própria para consultar protocolos e comprovantes. Nenhum envio de e-mail, pagamento ou consulta ao Lyceum está implementado nesta exportação.

A proposta atual para discussão com a TI está em `docs/VISAO_TI.md`. Documentos históricos do protótipo podem descrever fluxos anteriores e não substituem essa proposta.
