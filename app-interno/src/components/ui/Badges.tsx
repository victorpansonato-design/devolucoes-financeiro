import type { ReactNode } from 'react';
import { CheckCircle2, CircleAlert, CircleX } from 'lucide-react';
import { initials } from '../../lib/format';
import { hasLyceumPending, statusLabel } from '../../domain/status';
import type { CheckOutcome, Refund } from '../../domain/types';
// Status é ponto + palavra, não balão tingido. O estado concluído fica em silêncio.
const DOT = { warn: 'bg-warn', risk: 'bg-risk', crit: 'bg-crit', info: 'bg-brand-2', muted: 'bg-ink-4' } as const;
const INK = { warn: 'text-warn-ink', risk: 'text-risk-ink', crit: 'text-crit-ink', info: 'text-brand-text', muted: 'text-ink-3' } as const;
export function Status({ tone, children, solid = false }: { tone: keyof typeof DOT; children: ReactNode; solid?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap ${solid ? `font-semibold ${INK[tone]}` : 'font-medium text-ink-2'}`}>
      <span className={`h-1.25 w-1.25 shrink-0 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
export function StatusBadge({ refund }: { refund: Refund }) {
  if (hasLyceumPending(refund))
    return refund.lyceumSync?.status === 'falhou' ? <Status tone="crit" solid>Pago · baixa Lyceum pendente</Status> : <Status tone="info">Pago · registrando no Lyceum</Status>;
  switch (refund.status) {
    case 'analise_financeiro':
      return <Status tone="warn" solid>{statusLabel.analise_financeiro}</Status>;
    case 'correcao':
      return <Status tone="risk" solid>{statusLabel.correcao}</Status>;
    case 'aguardando_pagamento':
      return <Status tone="info">{statusLabel.aguardando_pagamento}</Status>;
    case 'pago':
      return <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-money"><CheckCircle2 className="h-3.5 w-3.5" />Pago</span>;
    case 'encerrado':
      return <span className="inline-flex items-center text-[12px] font-medium whitespace-nowrap text-ink-3">{statusLabel.encerrado}</span>;
  }
}
export function Tag({ children, tone }: { children: ReactNode; tone?: 'brand' | 'money' | 'crit' }) {
  const color = tone === 'brand' ? 'bg-brand-soft text-brand-text' : tone === 'money' ? 'bg-money-soft text-money' : tone === 'crit' ? 'bg-crit-soft text-crit-ink' : 'bg-surface-2 text-ink-3';
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${color}`}>{children}</span>;
}
export function OutcomeIcon({ outcome }: { outcome: CheckOutcome }) {
  if (outcome === 'aprovada') return <CheckCircle2 aria-label="Aprovada" className="h-4 w-4 shrink-0 text-money" />;
  if (outcome === 'atencao') return <CircleAlert aria-label="Atenção" className="h-4 w-4 shrink-0 text-warn" />;
  return <CircleX aria-label="Reprovada" className="h-4 w-4 shrink-0 text-crit" />;
}
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-medium text-ink-2 select-none ${size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-9 w-9 text-[12px]'}`}>{initials(name)}</span>;
}
