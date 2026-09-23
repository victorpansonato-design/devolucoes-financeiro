// DADOS INTEIRAMENTE FICTÍCIOS. Nomes, RAs, CPFs (gerados apenas com dígitos verificadores válidos para teste),
// e-mails em domínios .example, contas e referências foram inventados para a apresentação.
// As datas são relativas ao momento em que os exemplos são criados, para a fila sempre parecer atual.
import type { DemoProfile, LyceumCharge, LyceumCredit, PaymentData, Student } from '../domain/types';

/** Completa 9 dígitos com os verificadores do CPF. */
export function withCpfDigits(base: string) {
  const digits = base.split('').map(Number);
  for (const length of [9, 10]) {
    const sum = digits.slice(0, length).reduce((acc, d, i) => acc + d * (length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    digits.push(rest === 10 ? 0 : rest);
  }
  const s = digits.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

const cpf = {
  ana: withCpfDigits('100200301'),
  claudia: withCpfDigits('100200311'),
  carlos: withCpfDigits('100200302'),
  juliana: withCpfDigits('100200303'),
  marcos: withCpfDigits('100200313'),
  rafael: withCpfDigits('100200304'),
  mariana: withCpfDigits('100200305'),
  roberto: withCpfDigits('100200315'),
  lucas: withCpfDigits('100200306'),
  fernanda: withCpfDigits('100200307'),
  helena: withCpfDigits('100200317'),
  sofia: withCpfDigits('100200327'),
  gustavo: withCpfDigits('100200308'),
  outro: withCpfDigits('100200399'),
};

export const INSTITUTION = 'Centro Universitário Padre Anchieta';

/** Titular de conta que não é aluno nem responsável cadastrado (gera análise do Financeiro). */
export const thirdPartyHolder = { name: 'Sofia Rocha Mendes', cpf: cpf.sofia, pixKey: 'sofia.mendes@email.example' };

/** Solicitantes dos pedidos de exemplo (além do perfil de apresentação). */
export const seedRequesters: Record<'paula' | 'diego' | 'silvia' | 'tiago', DemoProfile> = {
  paula: { id: 'solicitante', role: 'solicitante', name: 'Paula Andrade', team: 'Secretaria · Graduação', email: 'paula.andrade@anchieta.example', sector: 'Graduação' },
  diego: { id: 'diego', role: 'solicitante', name: 'Diego Ramos', team: 'Atendimento · EAD', email: 'diego.ramos@anchieta.example', sector: 'EAD' },
  silvia: { id: 'silvia', role: 'solicitante', name: 'Sílvia Campos', team: 'Secretaria · Técnico', email: 'silvia.campos@anchieta.example', sector: 'Técnico' },
  tiago: { id: 'tiago', role: 'solicitante', name: 'Tiago Moura', team: 'Secretaria · Pós-graduação', email: 'tiago.moura@anchieta.example', sector: 'Pós-graduação' },
};

const self = (name: string, cpfValue: string, email: string): Student['responsible'] => ({ name, relation: 'Próprio aluno', cpf: cpfValue, email, isStudent: true });

export const students: Student[] = [
  {
    ra: '24100318', name: 'Ana Beatriz Moreira', cpf: cpf.ana, email: 'ana.moreira@aluno.example',
    course: 'Administração', level: 'Graduação', modality: 'Presencial', shift: 'Noturno', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: { name: 'Cláudia Moreira', relation: 'Mãe', cpf: cpf.claudia, email: 'claudia.moreira@familia.example', isStudent: false },
  },
  {
    ra: '23200457', name: 'Carlos Eduardo Nunes', cpf: cpf.carlos, email: 'carlos.nunes@aluno.example',
    course: 'Análise e Desenvolvimento de Sistemas', level: 'Graduação', modality: 'EAD', shift: 'EAD', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: self('Carlos Eduardo Nunes', cpf.carlos, 'carlos.nunes@aluno.example'),
  },
  {
    ra: '22300921', name: 'Juliana Prado Siqueira', cpf: cpf.juliana, email: 'juliana.siqueira@aluno.example',
    course: 'Enfermagem', level: 'Graduação', modality: 'Presencial', shift: 'Integral', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: { name: 'Marcos Siqueira', relation: 'Pai', cpf: cpf.marcos, email: 'marcos.siqueira@familia.example', isStudent: false },
  },
  {
    ra: '21400133', name: 'Rafael Augusto Teixeira', cpf: cpf.rafael, email: 'rafael.teixeira@aluno.example',
    course: 'Técnico em Enfermagem', level: 'Técnico', modality: 'Presencial', shift: 'Noturno', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: self('Rafael Augusto Teixeira', cpf.rafael, 'rafael.teixeira@aluno.example'),
  },
  {
    ra: '23100764', name: 'Mariana Costa Albuquerque', cpf: cpf.mariana, email: 'mariana.albuquerque@aluno.example',
    course: 'Psicologia', level: 'Graduação', modality: 'Presencial', shift: 'Matutino', institution: INSTITUTION, enrollment: 'Trancado',
    responsible: { name: 'Roberto Albuquerque', relation: 'Pai', cpf: cpf.roberto, email: 'roberto.albuquerque@familia.example', isStudent: false },
  },
  {
    ra: '22200588', name: 'Lucas Henrique Barros', cpf: cpf.lucas, email: 'lucas.barros@aluno.example',
    course: 'Pedagogia', level: 'Graduação', modality: 'EAD', shift: 'EAD', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: self('Lucas Henrique Barros', cpf.lucas, 'lucas.barros@aluno.example'),
  },
  {
    ra: '24300210', name: 'Fernanda Rocha Lima', cpf: cpf.fernanda, email: 'fernanda.lima@aluno.example',
    course: 'Arquitetura e Urbanismo', level: 'Graduação', modality: 'Presencial', shift: 'Noturno', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: { name: 'Helena Rocha', relation: 'Mãe', cpf: cpf.helena, email: 'helena.rocha@familia.example', isStudent: false },
  },
  {
    ra: '21300845', name: 'Gustavo Martins Freitas', cpf: cpf.gustavo, email: 'gustavo.freitas@aluno.example',
    course: 'MBA em Gestão de Projetos', level: 'Pós-graduação', modality: 'Semipresencial', shift: 'Sábado', institution: INSTITUTION, enrollment: 'Matriculado',
    responsible: self('Gustavo Martins Freitas', cpf.gustavo, 'gustavo.freitas@aluno.example'),
  },
];

/* -- Diretório fictício da pré-validação bancária ------------------------- */

export const bankDirectory = {
  pixKeys: [
    { key: 'claudia.moreira@familia.example', holderCpf: cpf.claudia },
    { key: '+5511987650921', holderCpf: cpf.marcos },
    { key: cpf.rafael, holderCpf: cpf.rafael },
    { key: cpf.lucas, holderCpf: cpf.lucas },
    { key: 'gustavo.freitas@email.example', holderCpf: cpf.gustavo },
    { key: 'sofia.mendes@email.example', holderCpf: cpf.sofia },
    /** Chave de sandbox: sempre diverge do titular, para demonstrar a correção automática ao vivo. */
    { key: 'divergente@pix.example', holderCpf: cpf.outro },
  ],
  accounts: [
    { bankCode: '001', agency: '3057', account: '41822-7', holderCpf: cpf.carlos },
    { bankCode: '341', agency: '0412', account: '28841-3', holderCpf: cpf.roberto },
    /** Dígitos trocados: conta existe, mas pertence a outro titular. */
    { bankCode: '341', agency: '0412', account: '28814-3', holderCpf: cpf.outro },
  ],
};

/* -- Extrato: cobranças mensais relativas ao mês atual --------------------- */

const pad = (n: number) => String(n).padStart(2, '0');
const monthOffset = (now: Date, offset: number) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
const dayOf = (competence: string, day: number) => `${competence}-${pad(day)}`;
const shiftDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

interface ChargePlan {
  ra: string;
  tuition: number;
  discountPct: number;
  from: number;
  to: number;
  cancelledFrom?: number;
}

function buildCharges(now: Date, plan: ChargePlan): Map<number, LyceumCharge> {
  const today = now.toISOString().slice(0, 10);
  const billed = Math.round(plan.tuition * (1 - plan.discountPct / 100));
  const charges = new Map<number, LyceumCharge>();
  for (let offset = plan.from; offset <= plan.to; offset++) {
    const comp = monthOffset(now, offset);
    const dueDate = dayOf(comp, 10);
    const type: LyceumCharge['type'] = offset === plan.from ? 'Matrícula' : 'Mensalidade';
    const cancelled = plan.cancelledFrom !== undefined && offset >= plan.cancelledFrom;
    const paid = !cancelled && dueDate < today;
    charges.set(offset, {
      id: `CB-${plan.ra}-${comp.replace('-', '')}`,
      type,
      competence: comp,
      dueDate,
      originalAmount: plan.tuition,
      billedAmount: cancelled ? 0 : billed,
      receivableAmount: paid || cancelled ? 0 : billed,
      postedAmount: paid ? billed : 0,
      situation: cancelled ? 'cancelada' : paid ? 'quitada' : 'a_vencer',
      postings: paid ? [{ kind: 'pagamento', amount: billed, date: shiftDays(dueDate, -2) }] : [],
    });
  }
  return charges;
}

const label = (competence: string) => `${competence.slice(5)}/${competence.slice(0, 4)}`;

function duplicatePayment(charge: LyceumCharge, daysAfterDue = 3) {
  charge.postings.push({ kind: 'pagamento', amount: charge.billedAmount, date: shiftDays(charge.dueDate, daysAfterDue) });
  charge.postedAmount += charge.billedAmount;
}

export interface LyceumSeed {
  charges: Record<string, LyceumCharge[]>;
  credits: Record<string, LyceumCredit[]>;
}

export function buildLyceumSeed(now: Date): LyceumSeed {
  const year = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);
  const charges: Record<string, LyceumCharge[]> = {};
  const credits: Record<string, LyceumCredit[]> = {};
  const list = (map: Map<number, LyceumCharge>) => [...map.values()];

  // 1. Ana — mensalidade do mês anterior paga duas vezes (boleto e Pix).
  {
    const c = buildCharges(now, { ra: '24100318', tuition: 139400, discountPct: 15, from: -7, to: 2 });
    const origin = c.get(-1)!;
    duplicatePayment(origin);
    charges['24100318'] = list(c);
    credits['24100318'] = [
      { id: `CR-${year}-081733`, origin: 'Pagamento em duplicidade', originDetail: `Mensalidade ${label(origin.competence)} paga duas vezes (boleto e Pix)`, originChargeId: origin.id, createdAt: shiftDays(origin.dueDate, 4), originalAmount: origin.billedAmount, usages: [], refunds: [] },
    ];
  }

  // 2. Carlos — disciplina optativa cancelada após o pagamento.
  {
    const c = buildCharges(now, { ra: '23200457', tuition: 48900, discountPct: 0, from: -6, to: 2 });
    charges['23200457'] = list(c);
    credits['23200457'] = [
      { id: `CR-${year}-064210`, origin: 'Cancelamento de disciplina', originDetail: 'Disciplina optativa cancelada após o pagamento (ajuste de carga horária)', originChargeId: c.get(-2)!.id, createdAt: shiftDays(c.get(-2)!.dueDate, 12), originalAmount: 48600, usages: [], refunds: [] },
    ];
  }

  // 3. Juliana — acordo quitado em duplicidade; parte do crédito já compensou a mensalidade atual.
  {
    const c = buildCharges(now, { ra: '22300921', tuition: 118750, discountPct: 20, from: -6, to: 2 });
    const agreement: LyceumCharge = {
      id: `CB-22300921-ACD${monthOffset(now, -3).replace('-', '')}`, type: 'Acordo', competence: monthOffset(now, -3), dueDate: dayOf(monthOffset(now, -3), 15),
      originalAmount: 240000, billedAmount: 240000, receivableAmount: 0, postedAmount: 240000, situation: 'quitada',
      postings: [{ kind: 'pagamento', amount: 240000, date: dayOf(monthOffset(now, -3), 14) }],
    };
    duplicatePayment(agreement, 1);
    const creditId = `CR-${year}-052918`;
    const next = [...c.values()].find(ch => ch.dueDate >= shiftDays(today, -20) && ch.type === 'Mensalidade')!;
    // A cobrança compensada fica quitada pela compensação, não por pagamento.
    next.postings = [{ kind: 'compensacao', amount: next.billedAmount, date: shiftDays(next.dueDate, -5), creditId }];
    next.postedAmount = next.billedAmount;
    next.receivableAmount = 0;
    next.situation = 'quitada';
    charges['22300921'] = [...list(c), agreement].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    credits['22300921'] = [
      { id: creditId, origin: 'Pagamento em duplicidade', originDetail: `Acordo ${label(agreement.competence)} quitado duas vezes`, originChargeId: agreement.id, createdAt: shiftDays(agreement.dueDate, 2), originalAmount: 240000, usages: [{ chargeId: next.id, amount: next.billedAmount, date: shiftDays(next.dueDate, -5) }], refunds: [] },
    ];
  }

  // 4. Rafael — um crédito já devolvido no Lyceum (bloqueado) e outro com devolução parcial anterior.
  {
    const c = buildCharges(now, { ra: '21400133', tuition: 42000, discountPct: 0, from: -6, to: 2 });
    charges['21400133'] = list(c);
    credits['21400133'] = [
      { id: `CR-${year}-039115`, origin: 'Pagamento a maior', originDetail: `Boleto de ${label(c.get(-4)!.competence)} pago acima do valor faturado`, originChargeId: c.get(-4)!.id, createdAt: shiftDays(c.get(-4)!.dueDate, 3), originalAmount: 78000, usages: [], refunds: [{ reference: `LYC-DV-${year}-04512`, date: shiftDays(today, -36), amount: 78000, source: 'lyceum' }] },
      { id: `CR-${year}-041870`, origin: 'Cancelamento de estágio', originDetail: 'Taxa de estágio supervisionado cancelada; parte devolvida em atendimento presencial', createdAt: shiftDays(today, -70), originalAmount: 102000, usages: [], refunds: [{ reference: `LYC-DV-${year}-03877`, date: shiftDays(today, -52), amount: 34000, source: 'lyceum' }] },
    ];
  }

  // 5. Mariana — trancamento: última mensalidade paga após o protocolo de trancamento; próximas canceladas.
  {
    const c = buildCharges(now, { ra: '23100764', tuition: 176000, discountPct: 10, from: -6, to: 2, cancelledFrom: 0 });
    const origin = c.get(-1)!;
    charges['23100764'] = list(c);
    credits['23100764'] = [
      { id: `CR-${year}-060094`, origin: 'Trancamento de matrícula', originDetail: `Mensalidade ${label(origin.competence)} paga após o protocolo de trancamento`, originChargeId: origin.id, createdAt: shiftDays(origin.dueDate, 6), originalAmount: origin.billedAmount, usages: [], refunds: [] },
    ];
  }

  // 6. Lucas — duas mensalidades pagas em duplicidade.
  {
    const c = buildCharges(now, { ra: '22200588', tuition: 34900, discountPct: 0, from: -6, to: 2 });
    duplicatePayment(c.get(-3)!);
    duplicatePayment(c.get(-2)!);
    charges['22200588'] = list(c);
    credits['22200588'] = [
      { id: `CR-${year}-027764`, origin: 'Pagamento em duplicidade', originDetail: `Mensalidades ${label(c.get(-3)!.competence)} e ${label(c.get(-2)!.competence)} pagas duas vezes`, originChargeId: c.get(-3)!.id, createdAt: shiftDays(c.get(-2)!.dueDate, 5), originalAmount: 69800, usages: [], refunds: [] },
    ];
  }

  // 7. Fernanda — desconto de convênio aplicado de forma retroativa sobre três mensalidades.
  {
    const c = buildCharges(now, { ra: '24300210', tuition: 215000, discountPct: 10, from: -6, to: 2 });
    charges['24300210'] = list(c);
    credits['24300210'] = [
      { id: `CR-${year}-058301`, origin: 'Desconto de convênio retroativo', originDetail: `Convênio empresarial de 10% aplicado sobre ${label(c.get(-4)!.competence)} a ${label(c.get(-2)!.competence)}`, createdAt: shiftDays(today, -12), originalAmount: 64500, usages: [], refunds: [] },
    ];
  }

  // 8. Gustavo — módulo eletivo cancelado por não formação de turma.
  {
    const c = buildCharges(now, { ra: '21300845', tuition: 68000, discountPct: 0, from: -5, to: 3 });
    charges['21300845'] = list(c);
    credits['21300845'] = [
      { id: `CR-${year}-070456`, origin: 'Cancelamento de módulo', originDetail: 'Módulo eletivo cancelado por não formação de turma', createdAt: shiftDays(today, -18), originalAmount: 134000, usages: [], refunds: [] },
    ];
  }

  return { charges, credits };
}

/* -- Roteiro: o que cada aluno demonstra ------------------------------------ */

export interface Scenario {
  ra: string;
  title: string;
  description: string;
  tone: 'ok' | 'info' | 'warn' | 'crit' | 'money';
  /** Dados de pagamento fictícios para preencher o cadastro ou a correção com um clique. */
  payment?: Partial<PaymentData>;
  correctionHint?: string;
}

export const scenarios: Scenario[] = [
  { ra: '24100318', title: 'Pix · segue direto para Cobranças a Pagar', description: 'Crédito elegível, sem devolução anterior. Titular: responsável financeiro. Use no roteiro completo até o link público.', tone: 'money', payment: { method: 'pix', holderKind: 'responsavel', pixKeyType: 'email', pixKey: 'claudia.moreira@familia.example' } },
  { ra: '23200457', title: 'Transferência bancária aguardando pagamento', description: 'Pedido já encaminhado direto, com prioridade alta pelo prazo. Confirme o pagamento no perfil Cobranças a Pagar.', tone: 'info' },
  { ra: '22300921', title: 'Crédito parcialmente utilizado', description: 'R$ 2.400,00 originais, R$ 950,00 compensados na mensalidade: saldo devolvível de R$ 1.450,00. Digite um valor maior para ver "saldo insuficiente".', tone: 'info', payment: { method: 'pix', holderKind: 'responsavel', pixKeyType: 'telefone', pixKey: '+55 (11) 98765-0921' } },
  { ra: '21400133', title: 'Duplicidade bloqueada e exceção para o Financeiro', description: 'Um crédito já devolvido no Lyceum não pode ser selecionado. Outro, com devolução parcial anterior, está em Análise do Financeiro aguardando decisão.', tone: 'crit' },
  { ra: '23100764', title: 'Dados bancários incorretos → correção', description: 'A pré-validação apontou titularidade divergente e devolveu o pedido à solicitante.', tone: 'warn', correctionHint: 'Conta correta do responsável: Itaú (341), agência 0412, conta 28841-3.', payment: { method: 'transferencia', holderKind: 'responsavel', bankCode: '341', agency: '0412', account: '28841-3', accountType: 'corrente' } },
  { ra: '22200588', title: 'Pago com comprovante', description: 'Pagamento confirmado com PDF anexado e baixa registrada no Lyceum. O link público mostra a trilha concluída e o comprovante.', tone: 'ok' },
  { ra: '24300210', title: 'Encerrado sem pagamento', description: 'Conta de terceiro levou o pedido ao Financeiro, que encerrou com motivo registrado. Só a solicitante foi avisada; o aluno não recebeu e-mail.', tone: 'ok' },
  { ra: '21300845', title: 'Pago, mas a baixa no Lyceum falhou', description: 'O pagamento continua confirmado. A pendência aparece na fila para o Financeiro tentar de novo ou registrar a baixa manual.', tone: 'crit' },
];

export const scenarioFor = (ra: string) => scenarios.find(s => s.ra === ra);
