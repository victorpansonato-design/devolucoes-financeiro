import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
// Controles são preenchidos, não contornados. O anel existe apenas no foco.
const control = 'w-full rounded-md bg-surface-2 px-3 text-[13px] text-ink transition-colors placeholder:text-ink-4 hover:bg-surface-3 focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50';
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`${control} h-9 ${props.className ?? ''}`}/>; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`${control} h-9 cursor-pointer ${props.className ?? ''}`}/>; }
export function Field({ label, children, help, required = false }: { label: string; children: (id: string) => ReactNode; help?: string; required?: boolean }) { const id = useId(); return <div><label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-ink">{label}{required && <span aria-hidden="true" className="ml-1 text-ink-3">*</span>}</label>{children(id)}{help && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{help}</p>}</div>; }
