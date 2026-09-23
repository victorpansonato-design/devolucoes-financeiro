// Modelo de domínio das devoluções. Estes tipos descrevem o contrato que a API institucional
// deverá expor; os adaptadores de demonstração (src/adapters/*.demo.ts) apenas os simulam.
import type { PixKeyType } from '../lib/validation';

export type { PixKeyType };

/* -- Perfis ----------------------------------------------------------------- */

export type Role = 'solicitante' | 'financeiro' | 'pagamentos';
export type RequesterSector = 'Graduação' | 'EAD' | 'Técnico' | 'Pós-graduação';
export type ResponsibleSector = RequesterSector | 'Financeiro' | 'Cobranças a Pagar';

export interface DemoProfile {
  id: string;
  role: Role;
  name: string;
  team: string;
  email: string;
  sector: ResponsibleSector;
}

/* -- Lyceum (espelho do que a integração deverá devolver) ------------------- */

export type Modality = 'Presencial' | 'EAD' | 'Semipresencial';

export interface Student {
  ra: string;
  name: string;
  cpf: string;
  email: string;
  course: string;
  level: 'Graduação' | 'Pós-graduação' | 'Técnico';
  modality: Modality;
  shift: string;
  institution: string;
  enrollment: 'Matriculado' | 'Trancado' | 'Cancelado' | 'Formado';
  responsible: { name: string; relation: string; cpf: string; email: string; isStudent: boolean };
}

export type ChargeSituation = 'quitada' | 'a_vencer' | 'vencida' | 'parcial' | 'cancelada';

export interface ChargePosting {
  kind: 'pagamento' | 'compensacao';
  amount: number;
  date: string;
  creditId?: string;
}

export interface LyceumCharge {
  id: string;
  type: 'Matrícula' | 'Mensalidade' | 'Taxa de serviço' | 'Acordo';
  competence: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  /** Valor de tabela, antes de bolsas e descontos. */
  originalAmount: number;
  /** Valor faturado: o que foi efetivamente cobrado após descontos. */
  billedAmount: number;
  /** Valor a receber: parte do faturado ainda em aberto. */
  receivableAmount: number;
  /** Valor lançado: pagamentos e compensações registrados na cobrança (pode exceder o faturado). */
  postedAmount: number;
  situation: ChargeSituation;
  postings: ChargePosting[];
}

export interface CreditUsage {
  chargeId: string;
  amount: number;
  date: string;
}

export interface LyceumRefundRecord {
  reference: string;
  date: string;
  amount: number;
  /** "lyceum": devolução registrada diretamente no Lyceum; "devolucoes": baixa enviada por este sistema. */
  source: 'lyceum' | 'devolucoes';
  refundId?: string;
}

export interface LyceumCredit {
  id: string;
  origin: string;
  originDetail: string;
  originChargeId?: string;
  createdAt: string;
  originalAmount: number;
  usages: CreditUsage[];
  refunds: LyceumRefundRecord[];
  blockedReason?: string;
}

export type CreditSituation = 'disponivel' | 'parcialmente_utilizado' | 'devolvido' | 'compensado' | 'bloqueado';

export interface StudentFinancialSnapshot {
  student: Student;
  charges: LyceumCharge[];
  credits: LyceumCredit[];
  fetchedAt: string;
}

/* -- Pagamento -------------------------------------------------------------- */

export type PaymentMethod = 'pix' | 'transferencia';
export type HolderKind = 'responsavel' | 'aluno' | 'outro';

export interface PaymentData {
  method: PaymentMethod;
  holderKind: HolderKind;
  holderName: string;
  holderCpf: string;
  pixKeyType?: PixKeyType;
  pixKey?: string;
  bankCode?: string;
  agency?: string;
  account?: string;
  accountType?: 'corrente' | 'poupanca';
}

/* -- Pedido de devolução ---------------------------------------------------- */

export type RefundStatus = 'analise_financeiro' | 'correcao' | 'aguardando_pagamento' | 'pago' | 'encerrado';

export type CheckId =
  | 'credito_localizado'
  | 'devolucao_anterior'
  | 'pedido_duplicado'
  | 'saldo_disponivel'
  | 'debitos_vencidos'
  | 'dados_pagamento'
  | 'titularidade'
  | 'validacao_bancaria'
  | 'registro_lyceum';

export type CheckOutcome = 'aprovada' | 'atencao' | 'reprovada';

export interface CheckResult {
  id: CheckId;
  label: string;
  outcome: CheckOutcome;
  detail: string;
  /** Para onde a falha leva o pedido. */
  route?: 'analise' | 'correcao';
  /** Impede o encaminhamento manual pelo Financeiro enquanto persistir. */
  blocking?: boolean;
  /** Falha de saldo que o Financeiro pode resolver ajustando o valor ao saldo disponível. */
  adjustable?: boolean;
}

export interface RoutingDecision {
  status: RefundStatus;
  rule: 'encaminhamento_direto' | 'excecao_financeiro' | 'correcao_automatica' | 'decisao_financeiro';
  summary: string;
}

export interface CheckRun {
  id: string;
  at: string;
  trigger: 'cadastro' | 'reenvio' | 'decisao_financeiro';
  results: CheckResult[];
  decision: RoutingDecision;
}

export type HistoryKind =
  | 'cadastro'
  | 'verificacao'
  | 'correcao_solicitada'
  | 'reenvio'
  | 'decisao_financeiro'
  | 'retencao'
  | 'encerramento'
  | 'agendamento'
  | 'pagamento'
  | 'lyceum_baixa'
  | 'lyceum_falha'
  | 'lyceum_manual';

export interface HistoryActor {
  role: Role | 'sistema' | 'integracao';
  name: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  actor: HistoryActor;
  kind: HistoryKind;
  title: string;
  note?: string;
  from?: RefundStatus;
  to?: RefundStatus;
  checks?: CheckResult[];
}

export type ProofType = 'application/pdf' | 'image/png' | 'image/jpeg';

export interface ProofMeta {
  id: string;
  name: string;
  type: ProofType;
  size: number;
  uploadedAt: string;
}

export interface PaymentRecord {
  paidAt: string;
  confirmedAt: string;
  confirmedBy: string;
  attachProof: boolean;
  proof?: ProofMeta;
  bankReference?: string;
}

export interface LyceumSync {
  status: 'pendente' | 'sincronizado' | 'falhou' | 'manual';
  attempts: number;
  lastAttemptAt?: string;
  reference?: string;
  syncedAt?: string;
  error?: string;
  note?: string;
}

export interface FinanceDecision {
  at: string;
  by: string;
  decision: 'encaminhar' | 'correcao' | 'encerrar' | 'reter';
  justification: string;
  adjustedAmount?: number;
  overriddenChecks: CheckId[];
}

export interface Refund {
  id: string;
  protocol: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  status: RefundStatus;
  requester: { profileId: string; name: string; email: string; sector: RequesterSector };
  student: {
    ra: string;
    name: string;
    email: string;
    course: string;
    level: Student['level'];
    modality: Modality;
    institution: string;
    responsibleName: string;
    responsibleEmail: string;
    responsibleIsStudent: boolean;
  };
  credit: {
    id: string;
    origin: string;
    originDetail: string;
    originalAmount: number;
    availableAtRequest: number;
  };
  amount: number;
  requestedAmount: number;
  payment: PaymentData;
  lyceumRequest: { mode: 'manual' | 'automatico'; confirmedByRequester: boolean; reference?: string; at: string };
  checkRuns: CheckRun[];
  correction?: { at: string; by: string; reason: string };
  analysisReason?: string;
  closure?: { at: string; by: string; reason: string };
  schedule?: { date: string; at: string; by: string };
  paymentRecord?: PaymentRecord;
  lyceumSync?: LyceumSync;
  decisions: FinanceDecision[];
  tracking: { token: string; createdAt: string };
  history: HistoryEntry[];
}

/* -- Comunicação ------------------------------------------------------------ */

export type EmailTrigger =
  | 'correcao_solicitada'
  | 'excecao_financeiro'
  | 'encerrada_sem_pagamento'
  | 'pagamento_colaborador'
  | 'pagamento_aluno'
  | 'lyceum_pendente';

export interface EmailRecipient {
  name: string;
  email: string;
  kind: 'aluno' | 'responsavel' | 'colaborador' | 'equipe';
}

export interface OutboxEmail {
  id: string;
  at: string;
  refundId: string;
  protocol: string;
  trigger: EmailTrigger;
  triggerLabel: string;
  to: EmailRecipient[];
  subject: string;
  body: string;
  /** Na demonstração, sempre "simulado". Em produção: pendente → enviado | falhou (via Microsoft Graph). */
  state: 'simulado';
}

/* -- Banco de dados da demonstração ---------------------------------------- */

export interface DemoConfig {
  /** Regra configurável: confirmação manual do solicitante ou registro automático via integração. */
  lyceumRequestMode: 'manual' | 'automatico';
  /** Controle de apresentação: a próxima baixa no Lyceum falha. */
  nextLyceumSyncFails: boolean;
  /** Latência simulada das integrações, em milissegundos. */
  latencyMs: number;
}

export interface LyceumMockData {
  students: Student[];
  charges: Record<string, LyceumCharge[]>;
  credits: Record<string, LyceumCredit[]>;
}

export interface DemoDatabase {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  protocolSeq: number;
  lyceum: LyceumMockData;
  refunds: Refund[];
  outbox: OutboxEmail[];
  config: DemoConfig;
}
