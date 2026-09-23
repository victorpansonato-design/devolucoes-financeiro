import { motion, type HTMLMotionProps } from 'motion/react';
import { press } from '../../lib/motion';
// Botões são pílulas; superfícies são retângulos de 12px. Uma ação primária por tela.
export function Button({ variant = 'secondary', className = '', children, ...props }: HTMLMotionProps<'button'> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const colors = { primary: 'bg-brand text-on-brand hover:bg-brand-hover', secondary: 'bg-surface-2 text-ink hover:bg-surface-3', ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink' };
  return <motion.button type="button" whileTap={props.disabled ? undefined : press} className={`inline-flex h-9.5 shrink-0 items-center justify-center gap-2 rounded-full px-4.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-45 ${colors[variant]} ${className}`} {...props}>{children}</motion.button>;
}
