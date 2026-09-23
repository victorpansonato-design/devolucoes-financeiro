// Perfis de APRESENTAÇÃO. Trocar de perfil não é autenticação: em produção o perfil vem do SSO
// institucional e cada permissão abaixo precisa ser verificada novamente no servidor.
import type { DemoProfile, Refund, Role } from './types';

export const demoProfiles: DemoProfile[] = [
  { id: 'solicitante', role: 'solicitante', name: 'Paula Andrade', team: 'Secretaria · Graduação', email: 'paula.andrade@anchieta.example', sector: 'Graduação' },
  { id: 'financeiro', role: 'financeiro', name: 'Equipe Financeiro', team: 'Financeiro', email: 'financeiro@anchieta.example', sector: 'Financeiro' },
  { id: 'pagamentos', role: 'pagamentos', name: 'Equipe Cobranças a Pagar', team: 'Cobranças a Pagar', email: 'cobrancas.pagar@anchieta.example', sector: 'Cobranças a Pagar' },
];

export const roleLabel: Record<Role, string> = {
  solicitante: 'Solicitante',
  financeiro: 'Financeiro',
  pagamentos: 'Cobranças a Pagar',
};

export const financeTeam = demoProfiles[1]!;
export const paymentsTeam = demoProfiles[2]!;

const OPEN_FOR_FINANCE: Refund['status'][] = ['analise_financeiro', 'correcao', 'aguardando_pagamento'];

/** Matriz de permissões. O serviço de demonstração aplica a mesma matriz antes de cada transição. */
export const can = {
  create: (role: Role) => role === 'solicitante',
  resubmit: (role: Role, r: Refund) => role === 'solicitante' && r.status === 'correcao',
  resolveException: (role: Role, r: Refund) => role === 'financeiro' && r.status === 'analise_financeiro',
  requestCorrection: (role: Role, r: Refund) =>
    (role === 'financeiro' && (r.status === 'analise_financeiro' || r.status === 'aguardando_pagamento')) ||
    (role === 'pagamentos' && r.status === 'aguardando_pagamento'),
  close: (role: Role, r: Refund) => role === 'financeiro' && OPEN_FOR_FINANCE.includes(r.status),
  hold: (role: Role, r: Refund) => role === 'financeiro' && r.status === 'aguardando_pagamento',
  schedule: (role: Role, r: Refund) => role === 'pagamentos' && r.status === 'aguardando_pagamento',
  confirmPayment: (role: Role, r: Refund) => role === 'pagamentos' && r.status === 'aguardando_pagamento',
  treatLyceum: (role: Role, r: Refund) =>
    (role === 'financeiro' || role === 'pagamentos') && r.status === 'pago' && r.lyceumSync?.status === 'falhou',
  /** Dados completos de pagamento: só quem executa o pagamento. Demais perfis veem mascarado. */
  viewFullPayment: (role: Role) => role === 'pagamentos',
  /** Extrato financeiro completo: Solicitante (no cadastro) e Financeiro. */
  viewStatement: (role: Role) => role === 'solicitante' || role === 'financeiro',
  /** Indicador "Valor em andamento total". Em produção: filtrar também na API. */
  viewTotals: (role: Role) => role === 'financeiro' || role === 'pagamentos',
  viewProof: (_role: Role) => true,
};
