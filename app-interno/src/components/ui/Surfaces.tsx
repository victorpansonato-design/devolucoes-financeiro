import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Inbox } from 'lucide-react';
import { emphasis, press } from '../../lib/motion';
// Um card é uma superfície mais clara e um raio de 12px. Sem moldura e sem sombra.
export function Card({ children, className = '', tone = 'plain' }: { children: ReactNode; className?: string; tone?: 'plain' | 'inset' }) {
  return <section className={`rounded-xl ${tone === 'plain' ? 'bg-surface' : 'bg-surface-2'} ${className}`}>{children}</section>;
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
        <h3 className="text-[12px] font-semibold text-ink-3">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// O tom vive num trilho de 2px à esquerda; a caixa é só a superfície recuada.
export type Tone = 'info' | 'warn' | 'crit' | 'ok' | 'money';
const RAIL: Record<Tone, string> = { info: 'bg-brand', warn: 'bg-warn', crit: 'bg-crit', ok: 'bg-ink-4', money: 'bg-money' };
const TITLE: Record<Tone, string> = { info: 'text-ink', warn: 'text-warn-ink', crit: 'text-crit-ink', ok: 'text-ink', money: 'text-money' };

export function Callout({ children, tone = 'warn', title, icon, className = '' }: { children?: ReactNode; tone?: Tone; title?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={`relative flex gap-2.5 overflow-hidden rounded-lg p-3.5 pl-4 ${tone === 'money' ? 'bg-money-soft' : 'bg-surface-2'} ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-0.5 ${RAIL[tone]}`} />
      {icon && <span className={`mt-px shrink-0 ${TITLE[tone]}`}>{icon}</span>}
      <div className="min-w-0 flex-1 text-[12px] leading-relaxed">
        {title && <p className={`font-semibold ${TITLE[tone]}`}>{title}</p>}
        {children && <div className={title ? 'mt-1 text-ink-2' : 'text-ink-2'}>{children}</div>}
      </div>
    </div>
  );
}

export function Metric({ value, label, tone }: { value: ReactNode; label: string; tone?: 'brand' | 'crit' }) {
  return (
    <div className="min-w-0">
      <span className={`block font-mono text-[24px] leading-none font-medium tracking-tight sm:text-[30px] ${tone === 'crit' ? 'text-crit-ink' : tone === 'brand' ? 'text-brand-text' : 'text-ink'}`}>{value}</span>
      <span className={`mt-2 block text-[12px] font-medium ${tone === 'brand' ? 'text-ink-2' : 'text-ink-3'}`}>{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action, icon }: { title: string; message: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-4">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-3">{message}</p>
      </div>
      {action}
    </div>
  );
}

export function DataItem({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-ink-4">{label}</dt>
      <dd className={`mt-0.5 text-[13px] font-medium break-words text-ink ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, active, onChange, layoutId }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void; layoutId: string }) {
  return (
    <div role="tablist" className="scroll-slim -mb-px flex gap-1 overflow-x-auto border-b border-hairline">
      {tabs.map(t => (
        <motion.button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          whileTap={press}
          onClick={() => onChange(t.id)}
          className={`relative shrink-0 px-3.5 py-2.5 text-[13px] transition-colors ${active === t.id ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'}`}
        >
          <span className="flex items-center gap-1.5">
            {t.label}
            {t.count !== undefined && <span className={`rounded-sm px-1.5 py-px font-mono text-[10px] font-medium ${active === t.id ? 'bg-surface-3 text-ink-2' : 'bg-surface-2 text-ink-4'}`}>{t.count}</span>}
          </span>
          {active === t.id && <motion.span layoutId={layoutId} transition={{ duration: 0.22, ease: emphasis }} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
        </motion.button>
      ))}
    </div>
  );
}
