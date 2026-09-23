import { useEffect, useRef, useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { scrimVariants, modalVariants, drawerVariants } from '../../lib/motion';
import { Button } from './Button';
// Só overlays flutuam: blur, sombra, Escape, foco preso e restauração do foco.
const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
const WIDTH = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
const DRAWER = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' };
export function Overlay({ open, title, subtitle, onClose, children, footer, drawer = false, size = 'lg' }: { open: boolean; title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; drawer?: boolean; size?: 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null),
    titleId = useId(),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const before = { overflow: document.body.style.overflow, padding: document.body.style.paddingRight };
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
    const timeout = window.setTimeout(() => (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE) ?? ref.current)?.focus(), 60);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key === 'Tab') {
        const list = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(el => el.offsetParent !== null);
        const first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('keydown', key, true);
      document.body.style.overflow = before.overflow;
      document.body.style.paddingRight = before.padding;
      previous?.focus();
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`scrim fixed inset-0 z-50 flex ${drawer ? 'justify-end' : 'items-start justify-center overflow-y-auto p-3 py-[4vh] sm:p-6 sm:py-[6vh]'}`} variants={scrimVariants} initial="initial" animate="animate" exit="exit" onMouseDown={e => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={drawer ? drawerVariants : modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative flex w-full flex-col overflow-hidden bg-surface shadow-overlay outline-none ${drawer ? `h-full border-l border-hairline ${DRAWER[size]}` : `max-h-[92vh] rounded-2xl ${WIDTH[size]}`}`}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[15px] leading-tight font-semibold">{title}</h2>
                {subtitle && <p className="mt-1 text-[12px] text-ink-3">{subtitle}</p>}
              </div>
              <Button variant="ghost" size="sm" square aria-label="Fechar" onClick={onClose} className="-mt-0.5 -mr-1">
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
