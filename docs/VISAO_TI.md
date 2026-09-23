# Visão do projeto e pauta com TI — 23/09/2026

## Objetivo

Automatizar a devolução de créditos de alunos, da identificação do crédito no Lyceum até o pagamento e o acompanhamento pelo aluno. O repositório tem uma **demonstração funcional** do fluxo ideal (`app-interno/`), com adaptadores simulados que a TI substituirá pelas integrações reais. Instruções de execução, roteiro de 5 minutos e alunos fictícios estão no [`README.md`](../README.md).

## Fluxo demonstrado

1. **Solicitação pelo RA.** O Lyceum (simulado) traz cadastro, responsável financeiro, curso, modalidade, instituição, cobranças e créditos. Cada crédito mostra origem, identificador, valor original, compensações, devoluções anteriores ("já houve devolução no Lyceum?") e saldo devolvível. **Só um crédito elegível e com saldo pode ser selecionado**: crédito devolvido, compensado ou já reservado por outro pedido fica bloqueado.
2. **Cadastro simplificado.** Os dados conhecidos vêm preenchidos. O solicitante escolhe o titular (responsável, aluno ou outro), Pix ou transferência, e informa só a chave ou a conta. A confirmação em vermelho ("Confirmo que já registrei a solicitação na aba de devolução do Lyceum e conferi o valor do crédito.") é uma **regra configurável**: *manual* (hoje) ou *automática* (visão futura). No modo automático, a integração registra a solicitação no Lyceum e guarda a referência. A troca fica em Modo demonstração → Regras configuráveis.
3. **Verificações automáticas** (`src/domain/checks.ts`), todas registradas no histórico:

   | Verificação | Falha leva a |
   |---|---|
   | Crédito localizado no Lyceum | Financeiro (bloqueia encaminhamento) |
   | Sem devolução anterior no Lyceum | parcial: Financeiro com justificativa · integral: bloqueio |
   | Sem outro pedido para o mesmo crédito | bloqueio |
   | Valor dentro do saldo disponível | Financeiro (pode ajustar ao saldo) |
   | Sem cobranças vencidas em aberto | Financeiro |
   | Solicitação registrada no Lyceum | correção (manual) · Financeiro (automático sem referência) |
   | Dados de pagamento completos | correção |
   | Titular coerente com o cadastro | Financeiro (conta de terceiro ou CPF divergente) |
   | Pré-validação bancária (DICT / titularidade) | correção |

4. **Encaminhamento inteligente.** Tudo aprovado: o pedido vai **direto para Cobranças a Pagar**, sem aprovação manual. Quando há falhas de análise e de correção ao mesmo tempo, o **Financeiro vem primeiro**: uma duplicidade pode encerrar o caso antes de alguém corrigir dados à toa. A regra aplicada aparece no detalhe e no histórico.
5. **Financeiro.** Tem a visão de exceções e pendências e acompanha o fluxo automático (quantos pedidos seguiram direto). Decide com justificativa obrigatória: encaminhar, solicitar correção ou encerrar sem pagamento. Devolução anterior exige a declaração explícita de que não é duplicidade. **Duplicidade confirmada não pode ser encaminhada.** O Financeiro também pode reter para análise um pedido que já aguarda pagamento.
6. **Cobranças a Pagar.** Vê os dados completos de pagamento; os outros perfis veem esses dados mascarados. Confirma o pagamento com data (não futura), declaração de que o pagamento **já foi executado e conferido** e **Anexar comprovante: Sim/Não**. No "Sim", o arquivo precisa ser PDF, PNG ou JPG com até 5 MB, com extensão e assinatura do arquivo conferidas. **Agendamento é registrado à parte e não marca como pago.**
7. **Lyceum após pagamento.** A baixa é enviada depois de o pagamento ser gravado. Se falhar, o pagamento continua confirmado e abre-se uma pendência na fila, com prioridade alta e e-mail ao Financeiro. A equipe pode tentar de novo ou registrar a baixa manual com referência.
8. **Comunicação** (caixa de saída demonstrativa, estado "Simulado — não enviado"):

   | Evento | Destinatário |
   |---|---|
   | Correção (automática ou manual) | colaborador solicitante |
   | Exceção para análise | caixa do Financeiro |
   | Encerramento sem pagamento | colaborador solicitante (**nunca o aluno**) |
   | Pagamento confirmado | colaborador solicitante + aluno/responsável, com link individual |
   | Falha na baixa do Lyceum | caixa do Financeiro |

   Os textos mascaram chave Pix, CPF e conta.
9. **Link público.** O token é aleatório e não sequencial, com 256 bits, e é gerado no cadastro. A página mostra só nome do aluno, valor, forma de pagamento, protocolo e trilha: recebida → verificações (ou ajuste) → aguardando pagamento → pago, ou encerrada. O comprovante aparece **somente depois do pagamento**. A página lê apenas a projeção mínima (`src/domain/publicView.ts`): **sem RA, CPF, Pix, dados bancários, anotações internas ou extrato**.

## O que é simulado nesta demonstração

- **Perfis:** a alternância Solicitante, Financeiro e Cobranças a Pagar é de apresentação, **não é autenticação**. O serviço aplica a matriz `can.*` (`src/domain/profiles.ts`), mas roda no navegador.
- **Visibilidade:** "Valor em andamento total" e os dados completos de pagamento só aparecem para os perfis autorizados. **Em produção, essa autorização precisa ser aplicada no servidor.** Esconder na interface não protege dado nenhum.
- **Lyceum** (`adapters/lyceum.demo.ts`): extrato, créditos, registro da solicitação e baixa ficam sobre dados fictícios locais.
- **Pré-validação bancária** (`adapters/bank.demo.ts`): diretório fictício. Só as contas e chaves cadastradas nele geram veredito.
- **E-mail** (`adapters/mail.demo.ts`): nada é enviado.
- **Pagamento:** a confirmação é manual. Não há conciliação bancária.
- **Link público** (`adapters/publicTracking.demo.ts`): lê a projeção gravada no `localStorage` do mesmo navegador. Os comprovantes ficam no IndexedDB desse navegador.
- **Tokens:** gerados no navegador. **Em produção, o servidor gera e valida o token**, guarda só o hash, e aplica expiração, revogação e limite de tentativas.

## Contratos para a TI implementar

As interfaces estão em `app-interno/src/adapters/contracts.ts`. O serviço `src/services/refundService.ts` descreve cada endpoint: permissão, validação, transição, histórico e outbox na mesma gravação.

| Contrato | Produção sugerida |
|---|---|
| `LyceumGateway.getFinancialSnapshot(ra)` | API ou views autorizadas do Lyceum: cadastro, responsável, cobranças (original, faturado, a receber, lançado) e créditos com identificador único, compensações e devoluções |
| `LyceumGateway.registerRefundRequest` | Registro na aba de devolução. Substitui a confirmação manual quando existir |
| `LyceumGateway.registerRefundPayment` / `confirmManualRefund` | Baixa da devolução com referência de retorno. Conferência de baixa manual |
| `BankValidator.validate` | DICT via PSP (Pix) e titularidade no banco pagador (transferência) |
| `MailGateway.dispatch` | Microsoft Graph `sendMail` ou conector Exchange Online aprovado, lendo a outbox, com reenvio e registro de falha |
| `ProofStorage` | Storage privado, URL assinada de curta duração e política de retenção |
| Link público | `POST /api/public/tracking` (token no corpo) devolvendo `PublicTrackingView`; comprovante por URL assinada |
| Autenticação | SSO institucional (Entra ID) com grupos por área; autorização por endpoint e por campo |

Toda transição hoje grava de uma vez o pedido, o histórico e os e-mails (padrão *transactional outbox*). A integração externa roda depois e nunca desfaz o que já foi gravado. O modelo de dados está em `src/domain/types.ts`.

## Decisões que precisam de validação da TI e do Financeiro

- **Crédito e saldo:** a regra de saldo devolvível é *original − compensações − devoluções*. É preciso confirmar como o Lyceum representa crédito reservado, compensado e devolvido, e qual é o identificador único estável.
- **Débitos vencidos:** hoje levam o pedido ao Financeiro, para avaliar compensação. Falta confirmar se a política é essa.
- **Dono da pendência de baixa no Lyceum:** hoje é o Financeiro (Cobranças a Pagar também pode tratar).
- **Precedência das falhas:** Financeiro antes de correção.
- **Titular diferente de aluno ou responsável:** hoje sempre exige análise. Falta decidir se é permitido.
- **Quem vê dados bancários completos** (hoje só Cobranças a Pagar) e por quanto tempo guardar comprovantes.
- **Prazo e prioridade:** prazo de 15 dias úteis e prioridade alta a partir de 10 dias úteis; o calendário de feriados ainda não é considerado.
- **Link do aluno:** entrega, expiração, revogação e o que pode aparecer sem autenticação. E-mail ao aluno só no pagamento: falta confirmar a titularidade do e-mail e o consentimento.
- **Registro automático no Lyceum:** confirmar se é viável. Se for, a confirmação manual em vermelho deixa de ser exigida.

## Perguntas para a reunião

- Quais APIs, tabelas autorizadas ou eventos do Lyceum expõem RA, créditos, débitos, baixa e devoluções anteriores? Qual é a frequência de sincronização?
- A instituição dispõe de SSO com perfis por área? Há conta ou serviço Microsoft 365 aprovado para disparo de e-mails?
- Qual sistema registra o pagamento efetivo e devolve data, referência e comprovante? Haverá conciliação automática?
- Quais requisitos de LGPD, retenção, auditoria, antifraude, tratamento de falhas e ambientes de teste se aplicam?

## Limites conhecidos da demonstração

- Estado e comprovantes existem só no navegador em que foram criados (não sincroniza entre aparelhos).
- A página `acompanhamento-publico/` é a referência estática anterior (usa `/api/lookup`). A versão que funciona na demonstração é `app-interno/acompanhamento/`.
- Não há login, envio de e-mail, pagamento nem consulta real ao Lyceum.
