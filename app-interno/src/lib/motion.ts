// src/lib/motion.ts
import type { Transition, Variants } from 'motion/react';

/** Spring rápido, sem overshoot, para transição de layout. */
export const spring: Transition = { type: 'spring', stiffness: 460, damping: 38, mass: 0.7 };

/** Spring mais macio para superfícies grandes (drawers, painéis). */
export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 };

/** Curva de desaceleração assinatura da Apple. */
export const emphasis = [0.16, 1, 0.3, 1] as const;
/** Curva de aceleração — só em saída. */
export const exitCurve = [0.4, 0, 1, 1] as const;

export const enterFast: Transition = { duration: 0.22, ease: emphasis };
export const exitFast: Transition = { duration: 0.13, ease: exitCurve };

/* -- Transição de rota ---------------------------------------------------- */

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: emphasis } },
  exit: { opacity: 0, y: -6, transition: exitFast },
};

/* -- Listas com stagger --------------------------------------------------- */

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: emphasis } },
};

/* -- Overlays ------------------------------------------------------------- */

export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: emphasis } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: exitCurve } },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.975, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.985, y: 6, transition: exitFast },
};

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: springSoft },
  exit: { x: '100%', transition: { duration: 0.2, ease: exitCurve } },
};

export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.1 } },
};

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, x: 24, scale: 0.97, transition: exitFast },
};

/** Revelação vertical de acordeão. */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.26, ease: emphasis } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18, ease: exitCurve } },
};

/* -- Microinterações ------------------------------------------------------ */

/** Feedback de toque uniforme em todo o app. */
export const press = { scale: 0.975 } as const;
export const pressSubtle = { scale: 0.99 } as const;
