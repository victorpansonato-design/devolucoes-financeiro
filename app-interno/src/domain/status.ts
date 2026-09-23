// Vocabulário de etapas, quem age agora e prioridade. Tudo derivado do pedido — nada é digitado à mão.
import { businessDays, date } from '../lib/format';
import type { DemoProfile, Refund, RefundStatus, ResponsibleSector } from './types';

export const SLA_BUSINESS_DAYS = 15;
export const PRIORITY_THRESHOLD_DAYS = 10;

export const statusLabel: Record<RefundStatus, string> = {
  analise_financeiro: 'Análise do Financeiro',
  correcao: 'Correção solicitada',
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  encerrado: 'Encerrado sem pagamento',
};

export type StageFilter = 'all' | RefundStatus | 'pendencia_lyceum';

export const stageFilters: { id: StageFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'analise_financeiro', label: 'Análise do Financeiro' },
  { id: 'correcao', label: 'Correção' },
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { id: 'pendencia_lyceum', label: 'Pendência Lyceum' },
];

export const hasLyceumPending = (r: Refund) => r.status === 'pago' && r.lyceumSync?.status !== 'sincronizado' && r.lyceumSync?.status !== 'manual';

/** Na fila principal enquanto alguém precisa agir — inclusive pago com baixa pendente no Lyceum. */
export const isOpen = (r: Refund) => r.status === 'analise_financeiro' || r.status === 'correcao' || r.status === 'aguardando_pagamento' || hasLyceumPending(r);

export const isConcluded = (r: Refund) => !isOpen(r);

export const matchesStage = (r: Refund, stage: StageFilter) =>
  stage === 'all' ? true : stage === 'pendencia_lyceum' ? hasLyceumPending(r) : r.status === stage && !hasLyceumPending(r);

export interface Responsibility {
  sector: ResponsibleSector | null;
  action: string;
}

export function responsibility(r: Refund): Responsibility {
  switch (r.status) {
    case 'analise_financeiro':
      return { sector: 'Financeiro', action: 'Decidir a exceção' };
    case 'correcao':
      return { sector: r.requester.sector, action: 'Corrigir dados e reenviar' };
    case 'aguardando_pagamento':
      return {
        sector: 'Cobranças a Pagar',
        action: r.schedule ? `Agendado para ${date(r.schedule.date)} · confirmar após executar` : 'Executar e confirmar o pagamento',
      };
    case 'pago':
      if (r.lyceumSync?.status === 'falhou') return { sector: 'Financeiro', action: 'Tratar baixa no Lyceum' };
      if (r.lyceumSync?.status === 'pendente') return { sector: null, action: 'Registrando baixa no Lyceum…' };
      return { sector: null, action: 'Concluído' };
    case 'encerrado':
      return { sector: null, action: 'Encerrado' };
  }
}

export const isMyTurn = (r: Refund, profile: DemoProfile) => {
  const { sector } = responsibility(r);
  if (!sector) return false;
  if (profile.role === 'solicitante') return r.status === 'correcao';
  return sector === profile.sector;
};

export interface Priority {
  level: 'alta' | 'normal';
  reason: string;
  overdue: boolean;
}

export function priority(r: Refund, now: Date = new Date()): Priority {
  if (hasLyceumPending(r) && r.lyceumSync?.status === 'falhou')
    return { level: 'alta', reason: 'Pagamento feito, baixa no Lyceum pendente', overdue: false };
  if (!isOpen(r)) return { level: 'normal', reason: 'Concluído', overdue: false };
  const days = businessDays(r.createdAt, now);
  if (days > SLA_BUSINESS_DAYS) return { level: 'alta', reason: `Prazo de ${SLA_BUSINESS_DAYS} dias úteis excedido`, overdue: true };
  if (days >= PRIORITY_THRESHOLD_DAYS) return { level: 'alta', reason: `${days} de ${SLA_BUSINESS_DAYS} dias úteis do prazo`, overdue: false };
  const latest = r.checkRuns.at(-1);
  const duplicity = latest?.results.some(c => (c.id === 'pedido_duplicado' || c.id === 'devolucao_anterior') && c.outcome !== 'aprovada');
  if (r.status === 'analise_financeiro' && duplicity)
    return { level: 'alta', reason: 'Possível duplicidade', overdue: false };
  return { level: 'normal', reason: `${days} de ${SLA_BUSINESS_DAYS} dias úteis do prazo`, overdue: false };
}

export const latestChecks = (r: Refund) => r.checkRuns.at(-1)?.results ?? [];

export const failingChecks = (r: Refund) => latestChecks(r).filter(c => c.outcome !== 'aprovada');
