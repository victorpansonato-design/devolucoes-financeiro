// Leitura do crédito: saldo devolvível = valor original − compensações em cobranças − devoluções já registradas.
// Faturado e a receber pertencem às cobranças; saldo devolvível pertence ao crédito. Nunca se misturam.
import type { CreditSituation, LyceumCharge, LyceumCredit, Refund } from './types';

export interface CreditBalance {
  original: number;
  used: number;
  refunded: number;
  available: number;
  situation: CreditSituation;
}

export function creditBalance(credit: LyceumCredit): CreditBalance {
  const used = credit.usages.reduce((sum, u) => sum + u.amount, 0);
  const refunded = credit.refunds.reduce((sum, r) => sum + r.amount, 0);
  const available = Math.max(0, credit.originalAmount - used - refunded);
  const situation: CreditSituation = credit.blockedReason
    ? 'bloqueado'
    : available === 0 && refunded > 0
      ? 'devolvido'
      : available === 0
        ? 'compensado'
        : used > 0 || refunded > 0
          ? 'parcialmente_utilizado'
          : 'disponivel';
  return { original: credit.originalAmount, used, refunded, available, situation };
}

export const creditSituationLabel: Record<CreditSituation, string> = {
  disponivel: 'Disponível',
  parcialmente_utilizado: 'Parcialmente utilizado',
  devolvido: 'Devolvido',
  compensado: 'Compensado',
  bloqueado: 'Bloqueado',
};

const OPEN: Refund['status'][] = ['analise_financeiro', 'correcao', 'aguardando_pagamento'];

/** Pedido deste sistema que já reserva ou já pagou o crédito. */
export const refundHoldingCredit = (refunds: Refund[], creditId: string, exceptId?: string) =>
  refunds.find(r => r.credit.id === creditId && r.id !== exceptId && (OPEN.includes(r.status) || r.status === 'pago'));

export interface CreditEligibility {
  selectable: boolean;
  reason?: string;
}

/** Só crédito elegível e com saldo pode ser selecionado na solicitação. */
export function creditEligibility(credit: LyceumCredit, refunds: Refund[]): CreditEligibility {
  const balance = creditBalance(credit);
  if (credit.blockedReason) return { selectable: false, reason: credit.blockedReason };
  const holder = refundHoldingCredit(refunds, credit.id);
  if (holder?.status === 'pago') return { selectable: false, reason: `Já pago por este sistema na solicitação ${holder.protocol}.` };
  if (holder) return { selectable: false, reason: `Já existe a solicitação ${holder.protocol} em andamento para este crédito.` };
  const lastRefund = credit.refunds.at(-1);
  if (balance.situation === 'devolvido' && lastRefund)
    return { selectable: false, reason: `Devolução já registrada no Lyceum (${lastRefund.reference}). Nova solicitação bloqueada para evitar duplicidade.` };
  if (balance.available === 0) return { selectable: false, reason: 'Sem saldo: crédito compensado integralmente em cobranças.' };
  return { selectable: true };
}

export interface StatementTotals {
  billed: number;
  receivable: number;
  overdue: number;
  posted: number;
}

export function statementTotals(charges: LyceumCharge[]): StatementTotals {
  return charges.reduce(
    (t, c) => ({
      billed: t.billed + (c.situation === 'cancelada' ? 0 : c.billedAmount),
      receivable: t.receivable + c.receivableAmount,
      overdue: t.overdue + (c.situation === 'vencida' ? c.receivableAmount : 0),
      posted: t.posted + c.postedAmount,
    }),
    { billed: 0, receivable: 0, overdue: 0, posted: 0 },
  );
}
