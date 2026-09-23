# Visão do projeto e pauta com TI — 23/09/2026

## Objetivo

Automatizar a devolução de créditos de alunos desde a identificação do crédito no Lyceum até o pagamento e o acompanhamento pelo aluno. Este repositório guarda **somente interfaces e documentação**, como base visual e funcional para a implementação institucional. A proposta abaixo é a direção atual, não uma integração já pronta.

## Experiência desejada

1. O solicitante localiza o aluno pelo RA. A integração traz dados cadastrais e um esboço financeiro: cobranças, créditos disponíveis, origem e valor do crédito, além de indicador de devolução já registrada no Lyceum.
2. O solicitante escolhe o crédito elegível e confirma a solicitação. Campos já conhecidos são preenchidos automaticamente; pedir apenas os dados de pagamento ausentes (Pix, preferencialmente, ou transferência bancária). A interface atual ainda tem formulário extenso: **simplificar após definir o contrato com o Lyceum**.
3. Regras automáticas verificam duplicidade, existência e disponibilidade do crédito, consistência dos dados e elegibilidade; exceções vão ao Financeiro para análise. Pedidos íntegros seguem diretamente para Cobranças a Pagar. Financeiro acompanha o fluxo e atua em exceções e rotinas próprias, em vez de obrigatoriamente liberar todos os pedidos.
4. Cobranças a Pagar registra execução efetiva do pagamento, data e opção **Anexar comprovante: sim/não**. Se sim, anexa PDF/imagem. O solicitante e o Financeiro podem visualizar o comprovante; no link do aluno, ele aparece apenas após confirmação de pagamento e com acesso individual seguro.
5. A visão interna tem **uma fila principal compartilhada**, busca por RA, filtros e aba de **Concluídas**. O total em andamento é visível somente ao Financeiro e a Cobranças a Pagar. Autorizações devem ser verificadas no servidor, não apenas ocultadas pela interface.
6. Após registrar a solicitação, o sistema gera link individual de acompanhamento, responsivo e alinhado ao design system. O aluno visualiza nome, valor, forma de pagamento e trilha simplificada: solicitação recebida → conferência automática/em correção → aguardando pagamento → pago; encerramentos sem pagamento devem ser apresentados com cuidado, sem expor razões internas ou dados bancários.
7. Notificações: estudar integração institucional de e-mail/Outlook para avisar o solicitante sobre correção de dados e encerramento; aluno recebe confirmação **somente quando houve pagamento**, não quando encerrado sem pagar. Decidir com a TI titularidade do e-mail, consentimento, templates, entregabilidade e trilha de auditoria.
8. Após pagamento, verificar se é possível registrar a baixa/devolução no Lyceum automaticamente; não considerar concluído apenas por agendamento bancário.

## Perguntas para a reunião

- Quais APIs, tabelas autorizadas ou eventos do Lyceum expõem RA, créditos, débitos, baixa e devoluções anteriores? Qual identificador único do crédito e a frequência de sincronização?
- Como definir valor efetivamente disponível e diferenciar crédito já devolvido, reservado, compensado ou usado? Quem valida as regras de duplicidade/elegibilidade?
- O fluxo pode ir direto para Cobranças a Pagar? Quais exceções exigem aprovação do Financeiro e quais ações financeiras precisam permanecer no processo?
- A instituição dispõe de SSO/perfis por área? Quais campos bancários podem ser vistos por cada perfil e por quanto tempo guardar comprovantes?
- Qual sistema registra pagamento efetivo e como volta a data, a referência bancária e o comprovante? Haverá conciliação automática ou confirmação manual?
- Há conta/serviço Microsoft 365 aprovado para disparo de e-mails? Quais destinatários e eventos? Vale avaliar aviso por WhatsApp em fase futura, sujeito à aprovação institucional.
- Como entregar o link individual ao aluno, proteger contra adivinhação/vazamento e permitir revogação? Quais dados podem aparecer sem autenticação?
- Quais requisitos de LGPD, retenção, auditoria, antifraude, tratamento de falhas e ambientes de teste devem ser aplicados?

## Situação do protótipo exportado

A UI interna preserva o fluxo demonstrativo anterior: cadastro manual, conferência obrigatória do Financeiro e chamadas HTTP a `/api/*`. A página pública usa `/api/lookup` e `/api/proof`. **As APIs, persistência, login, envio de e-mail, integração Lyceum e pagamento não estão neste repositório.** Nem todas as decisões novas acima foram aplicadas às telas; é trabalho de evolução com TI. Perfis no frontend são demonstração, não controle de acesso real.

Para continuar em outro chat/conta: indique este repositório, peça leitura deste arquivo e do `README.md`, e diga qual integração/fluxo deve ser prototipado primeiro. Não copie dados reais de alunos para exemplos públicos.
