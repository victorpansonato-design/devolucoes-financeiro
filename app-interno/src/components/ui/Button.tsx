import { motion, type HTMLMotionProps } from 'motion/react';
import { press } from '../../lib/motion';
// Botões são pílulas; superfícies são retângulos de 12px. Uma ação primária por tela.
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'xs' | 'sm' | 'md';
const COLORS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-crit text-white hover:brightness-110',
};
const SIZE: Record<Size, string> = { xs: 'h-7 text-[12px] gap-1.5', sm: 'h-8 text-[13px] gap-1.5', md: 'h-9.5 text-[13px] gap-2' };
const PAD: Record<Size, string> = { xs: 'px-3', sm: 'px-3.5', md: 'px-4.5' };
const SQUARE: Record<Size, string> = { xs: 'w-7', sm: 'w-8', md: 'w-9.5' };

export function Button({ variant = 'secondary', size = 'md', square = false, className = '', children, ...props }: HTMLMotionProps<'button'> & { variant?: Variant; size?: Size; square?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={props.disabled ? undefined : press}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-45 ${SIZE[size]} ${square ? SQUARE[size] : PAD[size]} ${COLORS[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
