import { useEffect, useRef, useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { scrimVariants, modalVariants, drawerVariants } from '../../lib/motion';
import { Button } from './Button';
// Só overlays flutuam: blur, sombra, Escape, foco preso e restauração do foco.
export function Overlay({ open, title, onClose, children, footer, drawer = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; drawer?: boolean }) {
  const ref = useRef<HTMLDivElement>(null), titleId = useId(), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return; const previous = document.activeElement as HTMLElement; const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const timeout = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus],button,input,select,textarea')?.focus(), 60);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close.current(); } if (e.key === 'Tab') { const list = [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]') ?? [])].filter(el => el.offsetParent !== null); const first = list[0], last = list.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
    document.addEventListener('keydown', key, true); return () => { clearTimeout(timeout); document.removeEventListener('keydown', key, true); document.body.style.overflow = before; previous?.focus(); };
  }, [open]);
  return <AnimatePresence>{open && <motion.div className={`scrim fixed inset-0 z-50 flex ${drawer ? 'justify-end' : 'items-center justify-center p-3 sm:p-6'}`} variants={scrimVariants} initial="initial" animate="animate" exit="exit" onMouseDown={e => e.target === e.currentTarget && onClose()}><motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} variants={drawer ? drawerVariants : modalVariants} initial="initial" animate="animate" exit="exit" className={`flex w-full flex-col overflow-hidden bg-surface shadow-overlay outline-none ${drawer ? 'h-full sm:max-w-2xl' : 'max-h-[92vh] max-w-3xl rounded-2xl'}`}><header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-5 py-4"><h2 id={titleId} className="text-[15px] font-semibold">{title}</h2><Button variant="ghost" aria-label="Fechar" onClick={onClose} className="px-2"><X className="h-4 w-4"/></Button></header><div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>{footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">{footer}</footer>}</motion.div></motion.div>}</AnimatePresence>;
}
