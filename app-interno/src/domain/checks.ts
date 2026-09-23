// Verificações automáticas e regra de encaminhamento. Funções puras: recebem o retrato do Lyceum, os pedidos
// existentes e o resultado da pré-validação bancária, e devolvem um veredito explicável para o histórico.
// É a peça que a TI deve portar para o servidor — o navegador não pode ser a fonte de verdade.
import { money, date } from '../lib/format';
import { accountError, agencyError, bankName, isValidCpf, nameError, onlyDigits, pixKeyError } from '../lib/validation';
import { creditBalance, refundHoldingCredit, statementTotals } from './credit';
import type { CheckId, CheckResult, PaymentData, Refund, RoutingDecision, StudentFinancialSnapshot } from './types';

export interface BankValidationResult {
  status: 'confirmada' | 'divergente' | 'sem_registro';
  detail: string;
}

export interface CheckContext {
  refundId?: string;
  amount: number;
  creditId: string;
  snapshot: StudentFinancialSnapshot;
  payment: PaymentData;
  bank: BankValidationResult;
  refunds: Refund[];
  lyceumRequest: Refund['lyceumRequest'];
}

export const checkLabel: Record<CheckId, string> = {
  credito_localizado: 'Crédito localizado no Lyceum',
  devolucao_anterior: 'Sem devolução anterior no Lyceum',
  pedido_duplicado: 'Sem outro pedido para o mesmo crédito',
  saldo_disponivel: 'Valor dentro do saldo disponível',
  debitos_vencidos: 'Sem cobranças vencidas em aberto',
  registro_lyceum: 'Solicitação registrada no Lyceum',
  dados_pagamento: 'Dados de pagamento completos',
  titularidade: 'Titular coerente com o cadastro',
  validacao_bancaria: 'Pré-validação bancária',
};

/** Como a falha aparece num resumo curto ("Exceção: saldo insuficiente"). */
export const failureLabel: Record<CheckId, string> = {
  credito_localizado: 'crédito não localizado',
  devolucao_anterior: 'devolução anterior no Lyceum',
  pedido_duplicado: 'outro pedido para o mesmo crédito',
  saldo_disponivel: 'saldo insuficiente',
  debitos_vencidos: 'cobranças vencidas em aberto',
  registro_lyceum: 'registro no Lyceum não confirmado',
  dados_pagamento: 'dados de pagamento incompletos',
  titularidade: 'titular divergente do cadastro',
  validacao_bancaria: 'titularidade da conta não confirmada',
};

/** Problemas de preenchimento — mesma regra do formulário, repetida aqui como faria o servidor. */
export function paymentDataIssues(p: PaymentData): string[] {
  const issues: string[] = [];
  const holderName = nameError(p.holderName);
  if (holderName) issues.push(holderName);
  if (!isValidCpf(p.holderCpf)) issues.push('CPF do titular inválido.');
  if (p.method === 'pix') {
    const error = p.pixKeyType ? pixKeyError(p.pixKeyType, p.pixKey ?? '') : 'Escolha o tipo de chave Pix.';
    if (error) issues.push(error);
    if (p.pixKeyType === 'cpf' && p.pixKey && onlyDigits(p.pixKey) !== onlyDigits(p.holderCpf))
      issues.push('Chave Pix do tipo CPF deve ser o CPF do titular.');
  } else {
    if (!bankName(p.bankCode)) issues.push('Selecione o banco.');
    const agency = agencyError(p.agency ?? '');
    if (agency) issues.push(agency);
    const account = accountError(p.account ?? '');
    if (account) issues.push(account);
    if (!p.accountType) issues.push('Informe o tipo de conta.');
  }
  return issues;
}

const result = (id: CheckId, outcome: CheckResult['outcome'], detail: string, extra: Partial<CheckResult> = {}): CheckResult => ({
  id,
  label: checkLabel[id],
  outcome,
  detail,
  ...extra,
});

export function runChecks(ctx: CheckContext): CheckResult[] {
  const { snapshot, payment } = ctx;
  const credit = snapshot.credits.find(c => c.id === ctx.creditId);
  const results: CheckResult[] = [];

  if (!credit) {
    results.push(result('credito_localizado', 'reprovada', `O crédito ${ctx.creditId} não foi encontrado para o RA ${snapshot.student.ra}.`, { route: 'analise', blocking: true }));
  } else {
    const balance = creditBalance(credit);
    results.push(result('credito_localizado', 'aprovada', `${credit.id} · ${credit.origin} · valor original ${money(credit.originalAmount)}.`));

    const previous = credit.refunds.filter(r => !r.refundId || r.refundId !== ctx.refundId);
    const last = previous.at(-1);
    if (!last) {
      results.push(result('devolucao_anterior', 'aprovada', 'Nenhuma devolução registrada no Lyceum para este crédito.'));
    } else if (balance.available === 0) {
      results.push(
        result('devolucao_anterior', 'reprovada', `Crédito já devolvido no Lyceum: ${last.reference}, em ${date(last.date)}, ${money(last.amount)}. Duplicidade confirmada.`, {
          route: 'analise',
          blocking: true,
        }),
      );
    } else {
      const total = previous.reduce((sum, r) => sum + r.amount, 0);
      results.push(
        result('devolucao_anterior', 'atencao', `Já houve devolução de ${money(total)} deste crédito (${last.reference}, ${date(last.date)}). Confirmar que o saldo restante não é duplicidade.`, {
          route: 'analise',
        }),
      );
    }

    const other = refundHoldingCredit(ctx.refunds, credit.id, ctx.refundId);
    if (!other) results.push(result('pedido_duplicado', 'aprovada', 'Nenhum outro pedido em andamento ou pago para este crédito.'));
    else
      results.push(
        result('pedido_duplicado', 'reprovada', other.status === 'pago' ? `Crédito já pago por este sistema na solicitação ${other.protocol}.` : `A solicitação ${other.protocol} já está em andamento para este crédito.`, {
          route: 'analise',
          blocking: true,
        }),
      );

    if (ctx.amount <= 0) results.push(result('saldo_disponivel', 'reprovada', 'Valor a devolver precisa ser maior que zero.', { route: 'correcao' }));
    else if (ctx.amount > balance.available)
      results.push(
        result('saldo_disponivel', 'reprovada', `Solicitado ${money(ctx.amount)}; saldo disponível ${money(balance.available)} (original ${money(balance.original)} − compensado ${money(balance.used)} − devolvido ${money(balance.refunded)}).`, {
          route: 'analise',
          blocking: true,
          adjustable: balance.available > 0,
        }),
      );
    else
      results.push(
        result('saldo_disponivel', 'aprovada', `${money(ctx.amount)} de ${money(balance.available)} disponíveis${balance.used || balance.refunded ? ` (original ${money(balance.original)})` : ''}.`),
      );
  }

  const totals = statementTotals(snapshot.charges);
  results.push(
    totals.overdue > 0
      ? result('debitos_vencidos', 'atencao', `Há ${money(totals.overdue)} em cobranças vencidas. Avaliar compensação antes de devolver.`, { route: 'analise' })
      : result('debitos_vencidos', 'aprovada', totals.receivable > 0 ? `Nenhuma cobrança vencida. ${money(totals.receivable)} a vencer não impedem a devolução.` : 'Nenhuma cobrança em aberto.'),
  );

  const lr = ctx.lyceumRequest;
  results.push(
    lr.mode === 'automatico'
      ? lr.reference
        ? result('registro_lyceum', 'aprovada', `Registrado automaticamente na aba de devolução do Lyceum (${lr.reference}).`)
        : result('registro_lyceum', 'atencao', 'O registro automático no Lyceum não retornou referência.', { route: 'analise' })
      : lr.confirmedByRequester
        ? result('registro_lyceum', 'aprovada', 'Solicitante confirmou o registro na aba de devolução do Lyceum e o valor do crédito.')
        : result('registro_lyceum', 'reprovada', 'Falta a confirmação do registro na aba de devolução do Lyceum.', { route: 'correcao' }),
  );

  const issues = paymentDataIssues(payment);
  results.push(
    issues.length
      ? result('dados_pagamento', 'reprovada', issues.join(' '), { route: 'correcao' })
      : result('dados_pagamento', 'aprovada', payment.method === 'pix' ? 'Pix com chave e titular válidos.' : `Transferência · ${bankName(payment.bankCode)} com agência e conta válidas.`),
  );

  const { student } = snapshot;
  const expected = payment.holderKind === 'aluno' ? student.cpf : payment.holderKind === 'responsavel' ? student.responsible.cpf : null;
  if (payment.holderKind === 'outro')
    results.push(result('titularidade', 'atencao', `Conta de terceiro (${payment.holderName || 'titular não informado'}). Exige análise e registro da decisão pelo Financeiro.`, { route: 'analise' }));
  else if (expected && onlyDigits(expected) !== onlyDigits(payment.holderCpf))
    results.push(result('titularidade', 'atencao', 'CPF do titular difere do cadastrado no Lyceum.', { route: 'analise' }));
  else
    results.push(result('titularidade', 'aprovada', payment.holderKind === 'aluno' ? 'Titular é o próprio aluno, conforme cadastro.' : `Titular é o responsável financeiro cadastrado (${student.responsible.relation.toLowerCase()}).`));

  results.push(
    ctx.bank.status === 'divergente'
      ? result('validacao_bancaria', 'reprovada', ctx.bank.detail, { route: 'correcao' })
      : result('validacao_bancaria', 'aprovada', ctx.bank.detail),
  );

  return results;
}

export function decideRouting(results: CheckResult[]): RoutingDecision {
  const failing = results.filter(r => r.outcome !== 'aprovada');
  const analysis = failing.filter(r => r.route === 'analise');
  const correction = failing.filter(r => r.route === 'correcao');
  if (analysis.length)
    return { status: 'analise_financeiro', rule: 'excecao_financeiro', summary: `Exceção para o Financeiro: ${analysis.map(a => failureLabel[a.id]).join(', ')}.` };
  if (correction.length)
    return { status: 'correcao', rule: 'correcao_automatica', summary: `Correção solicitada automaticamente: ${correction.map(c => failureLabel[c.id]).join(', ')}.` };
  return { status: 'aguardando_pagamento', rule: 'encaminhamento_direto', summary: `Encaminhamento direto para Cobranças a Pagar: ${results.length} de ${results.length} verificações aprovadas, sem aprovação manual.` };
}

/** O que impede o Financeiro de encaminhar mesmo com justificativa. */
export function forwardBlockers(results: CheckResult[]) {
  return results.filter(r => r.outcome !== 'aprovada' && (r.blocking || r.route === 'correcao'));
}

/** Falhas que o Financeiro pode assumir, com justificativa registrada. */
export function overridable(results: CheckResult[]) {
  return results.filter(r => r.outcome !== 'aprovada' && r.route === 'analise' && !r.blocking);
}
