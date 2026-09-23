import type { ReactNode } from 'react';
// Um card é uma superfície mais clara e um raio de 12px. Sem moldura e sem sombra.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl bg-surface ${className}`}>{children}</section>; }
export function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="space-y-4"><h3 className="border-b border-hairline pb-2 text-[12px] font-semibold text-ink-3">{title}</h3>{children}</section>; }
export function Callout({ children }: { children: ReactNode }) { return <div className="relative overflow-hidden rounded-lg bg-surface-2 p-3.5 pl-4 text-[12px] leading-relaxed text-ink-2"><span className="absolute inset-y-0 left-0 w-0.5 bg-warn"/>{children}</div>; }
