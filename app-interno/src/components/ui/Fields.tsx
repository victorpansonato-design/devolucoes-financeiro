import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { press, spring } from '../../lib/motion';
// Controles são preenchidos, não contornados. O anel existe apenas no foco.
const control = 'w-full rounded-md bg-surface-2 px-3 text-[13px] text-ink transition-colors placeholder:text-ink-4 hover:bg-surface-3 focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50';
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} h-9 ${props['aria-invalid'] ? 'ring-2 ring-crit/60' : ''} ${props.className ?? ''}`} />;
}
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${control} resize-y py-2 leading-relaxed ${props.className ?? ''}`} />;
}
export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className={`${control} h-9 cursor-pointer appearance-none pr-8`} />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
    </div>
  );
}
export function Field({ label, children, help, error, required = false, hint }: { label: string; children: (id: string) => ReactNode; help?: ReactNode; error?: string | null; required?: boolean; hint?: string }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12px] font-medium text-ink">
          {label}
          {required && <span aria-hidden="true" className="ml-1 text-crit">*</span>}
        </label>
        {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
      </div>
      {children(id)}
      {error ? <p role="alert" className="mt-1.5 text-[11.5px] font-medium text-crit">{error}</p> : help ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-4">{help}</p> : null}
    </div>
  );
}
export function Segmented<T extends string>({ options, value, onChange, layoutId, size = 'sm', label }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; layoutId: string; size?: 'xs' | 'sm'; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-full bg-surface-2 p-0.5">
      {options.map(o => (
        <motion.button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={value === o.id}
          whileTap={press}
          onClick={() => onChange(o.id)}
          className={`relative flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors ${size === 'xs' ? 'h-7 px-2.5 text-[11.5px]' : 'h-8 px-3 text-[12.5px]'} ${value === o.id ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'}`}
        >
          {value === o.id && <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-full bg-surface" />}
          <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      whileTap={press}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors ${active ? 'bg-ink font-semibold text-canvas' : 'bg-surface-2 font-medium text-ink-3 hover:bg-surface-3 hover:text-ink'}`}
    >
      {children}
      {count !== undefined && <span className="font-mono text-[10.5px] opacity-70">{count}</span>}
    </motion.button>
  );
}
export function Check({ checked, onChange, children, tone }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; tone?: 'crit' }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed ${tone === 'crit' ? 'font-medium text-crit-ink' : 'text-ink'}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'crit' ? 'accent-crit' : 'accent-brand'}`} />
      <span>{children}</span>
    </label>
  );
}
