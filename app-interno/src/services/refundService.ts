// Serviço de devoluções — faz o papel da API que a TI vai construir. Cada método:
// 1) confere a permissão do perfil (can.*) e a versão do pedido (concorrência otimista);
// 2) consulta os adaptadores (Lyceum, pré-validação bancária);
// 3) aplica a transição, registra histórico e grava os e-mails na caixa de saída na MESMA gravação;
// 4) só depois despacha e-mails e sincroniza com o Lyceum.
// Na demonstração tudo roda no navegador; em produção este arquivo vira endpoints no servidor.
import type { BankValidator, LyceumGateway, MailGateway, ProofStorage, StudentSearchHit } from '../adapters/contracts';
import { decideRouting, forwardBlockers, overridable, runChecks } from '../domain/checks';
import { creditBalance, creditEligibility } from '../domain/credit';
import {
  closureEmail,
  correctionEmail,
  exceptionEmail,
  lyceumPendingEmail,
  paymentRequesterEmail,
  paymentStudentEmail,
  type EmailDraft,
  type EmailLinks,
} from '../domain/notifications';
import { can } from '../domain/profiles';
import type {
  CheckResult,
  CheckRun,
  DemoConfig,
  DemoDatabase,
  DemoProfile,
  HistoryActor,
  HistoryEntry,
  OutboxEmail,
  PaymentData,
  ProofMeta,
  ProofType,
  Refund,
  RequesterSector,
  RoutingDecision,
  StudentFinancialSnapshot,
} from '../domain/types';
import type { DemoStore } from '../demo/store';
import { civilDate, date, money } from '../lib/format';
import { randomId, trackingToken } from '../lib/ids';
import { formatCpf, normalizePixKey } from '../lib/validation';

export class ServiceError extends Error {
  constructor(
    public code: 'permission' | 'validation' | 'conflict' | 'not_found' | 'state',
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface ServiceDeps {
  store: DemoStore;
  lyceum: LyceumGateway;
  bank: BankValidator;
  mail: MailGateway;
  proofs: ProofStorage;
  clock: () => Date;
  links: { tracking: (token: string) => string; internal: (refundId: string) => string };
}

export interface NewRefundInput {
  ra: string;
  creditId: string;
  amount: number;
  payment: PaymentData;
  lyceumConfirmed: boolean;
}

export interface ForwardDecision {
  justification: string;
  adjustedAmount?: number;
  /** Declaração explícita de que a devolução anterior não é duplicidade. */
  duplicityReviewed: boolean;
}

export interface PaymentConfirmation {
  paidAt: string;
  executedAndVerified: boolean;
  attachProof: boolean | null;
  file?: { blob: Blob; name: string };
  bankReference?: string;
}

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES: Record<ProofType, { ext: string[]; label: string }> = {
  'application/pdf': { ext: ['pdf'], label: 'PDF' },
  'image/png': { ext: ['png'], label: 'PNG' },
  'image/jpeg': { ext: ['jpg', 'jpeg'], label: 'JPG' },
};
const MIN_JUSTIFICATION = 15;

const systemActor: HistoryActor = { role: 'sistema', name: 'Verificação automática' };
const integrationActor: HistoryActor = { role: 'integracao', name: 'Integração Lyceum (simulada)' };
const actorOf = (p: DemoProfile): HistoryActor => ({ role: p.role, name: p.role === 'solicitante' ? `${p.name} · ${p.team}` : p.team });

/** Mantém apenas os campos da forma de pagamento escolhida, já normalizados. */
export function normalizePayment(p: PaymentData): PaymentData {
  const base = { method: p.method, holderKind: p.holderKind, holderName: p.holderName.trim().replace(/\s+/g, ' '), holderCpf: formatCpf(p.holderCpf) };
  if (p.method === 'pix') return { ...base, pixKeyType: p.pixKeyType, pixKey: p.pixKeyType ? normalizePixKey(p.pixKeyType, p.pixKey ?? '') : p.pixKey?.trim() };
  return { ...base, bankCode: p.bankCode, agency: p.agency?.trim(), account: p.account?.trim().toUpperCase(), accountType: p.accountType };
}

async function sniffProofType(blob: Blob): Promise<ProofType | null> {
  const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}

/** Validação do comprovante: extensão, tipo declarado, assinatura do arquivo e tamanho. */
export async function validateProof(file: { blob: Blob; name: string }): Promise<ProofType> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const declared = Object.entries(PROOF_TYPES).find(([, t]) => t.ext.includes(ext))?.[0] as ProofType | undefined;
  if (!declared) throw new ServiceError('validation', 'Comprovante deve ser PDF, PNG ou JPG.');
  if (file.blob.size === 0) throw new ServiceError('validation', 'O arquivo do comprovante está vazio.');
  if (file.blob.size > PROOF_MAX_BYTES) throw new ServiceError('validation', 'O comprovante excede 5 MB.');
  const sniffed = await sniffProofType(file.blob);
  if (sniffed !== declared) throw new ServiceError('validation', 'O conteúdo do arquivo não corresponde a um PDF, PNG ou JPG válido.');
  return declared;
}

export function createRefundService(deps: ServiceDeps) {
  const { store, lyceum, bank, mail, proofs, clock } = deps;
  const nowIso = () => clock().toISOString();
  const links = (r: Refund): EmailLinks => ({ tracking: deps.links.tracking(r.tracking.token), internal: deps.links.internal(r.id) });

  // Uma operação por vez: evita que duas ações sobre o mesmo documento se sobreponham.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const entry = (actor: HistoryActor, kind: HistoryEntry['kind'], title: string, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id: randomId('h'),
    at: nowIso(),
    actor,
    kind,
    title,
    ...extra,
  });

  const toOutbox = (d: EmailDraft): OutboxEmail => ({ ...d, id: randomId('mail'), at: nowIso(), state: 'simulado' });

  /** Aplica a mudança sobre uma cópia do banco, confere a versão e grava de uma vez. */
  function commitRefund(id: string, expectedVersion: number | null, change: (r: Refund, db: DemoDatabase) => EmailDraft[] | void) {
    const db = structuredClone(store.read());
    const refund = db.refunds.find(r => r.id === id);
    if (!refund) throw new ServiceError('not_found', 'Pedido não encontrado.');
    if (expectedVersion !== null && refund.version !== expectedVersion)
      throw new ServiceError('conflict', 'Este pedido foi atualizado em outra aba ou por outro perfil. Os dados foram recarregados — revise e tente de novo.');
    const drafts = change(refund, db) ?? [];
    refund.version++;
    refund.updatedAt = nowIso();
    const emails = drafts.map(toOutbox);
    db.outbox.push(...emails);
    store.commit(db);
    return { refund: structuredClone(refund), emails };
  }

  const dispatch = async (emails: OutboxEmail[]) => {
    for (const email of emails) await mail.dispatch(email);
  };

  const requireRefund = (id: string) => {
    const r = store.read().refunds.find(x => x.id === id);
    if (!r) throw new ServiceError('not_found', 'Pedido não encontrado.');
    return r;
  };

  const requireText = (text: string, min: number, what: string) => {
    if (text.trim().length < min) throw new ServiceError('validation', `${what} precisa de pelo menos ${min} caracteres.`);
    return text.trim();
  };

  async function evaluate(input: { refundId?: string; ra: string; creditId: string; amount: number; payment: PaymentData; lyceumRequest: Refund['lyceumRequest'] }) {
    const snapshot = await lyceum.getFinancialSnapshot(input.ra);
    const bankResult = await bank.validate(input.payment);
    const results = runChecks({
      refundId: input.refundId,
      amount: input.amount,
      creditId: input.creditId,
      snapshot,
      payment: input.payment,
      bank: bankResult,
      refunds: store.read().refunds,
      lyceumRequest: input.lyceumRequest,
    });
    return { snapshot, results };
  }

  const checkRun = (trigger: CheckRun['trigger'], results: CheckResult[], decision: RoutingDecision): CheckRun => ({ id: randomId('run'), at: nowIso(), trigger, results, decision });

  /** E-mails que a rota automática dispara. */
  function routingEmails(r: Refund, decision: RoutingDecision, results: CheckResult[]): EmailDraft[] {
    if (decision.status === 'analise_financeiro') return [exceptionEmail(r, results.filter(c => c.outcome !== 'aprovada'), links(r))];
    if (decision.status === 'correcao') {
      const reason = results.filter(c => c.outcome !== 'aprovada' && c.route === 'correcao').map(c => c.detail).join(' ');
      return [correctionEmail(r, reason, 'Verificação automática', links(r))];
    }
    return [];
  }

  function applyRouting(r: Refund, decision: RoutingDecision, results: CheckResult[]) {
    r.status = decision.status;
    r.analysisReason = decision.status === 'analise_financeiro' ? decision.summary : undefined;
    r.correction =
      decision.status === 'correcao'
        ? { at: nowIso(), by: 'Verificação automática', reason: results.filter(c => c.outcome !== 'aprovada' && c.route === 'correcao').map(c => c.detail).join(' ') }
        : undefined;
  }

  async function syncLyceum(id: string) {
    const r = requireRefund(id);
    if (r.status !== 'pago' || !r.paymentRecord) return;
    const result = await lyceum.registerRefundPayment({ ra: r.student.ra, creditId: r.credit.id, amount: r.amount, paidAt: r.paymentRecord.paidAt, protocol: r.protocol, refundId: r.id });
    const { emails } = commitRefund(id, null, refund => {
      const attempts = (refund.lyceumSync?.attempts ?? 0) + 1;
      if (result.ok) {
        refund.lyceumSync = { status: 'sincronizado', attempts, lastAttemptAt: nowIso(), reference: result.reference, syncedAt: result.at };
        refund.history.push(entry(integrationActor, 'lyceum_baixa', 'Baixa da devolução registrada no Lyceum', { note: `Referência ${result.reference}. Crédito ${refund.credit.id} atualizado com ${money(refund.amount)} devolvidos.` }));
        return;
      }
      refund.lyceumSync = { status: 'falhou', attempts, lastAttemptAt: nowIso(), error: result.error };
      refund.history.push(entry(integrationActor, 'lyceum_falha', 'Falha ao registrar a baixa no Lyceum', { note: `${result.error} O pagamento continua confirmado; pendência aberta para o Financeiro.` }));
      // Um aviso por pendência: novas tentativas sem sucesso ficam só no histórico.
      return attempts === 1 ? [lyceumPendingEmail(refund, result.error, links(refund))] : [];
    });
    await dispatch(emails);
  }

  return {
    /** Aguarda operações em segundo plano (baixa no Lyceum). */
    idle: () => queue.then(() => undefined),

    searchStudents: (query: string): Promise<StudentSearchHit[]> => lyceum.searchStudents(query),

    getFinancialSnapshot: (ra: string): Promise<StudentFinancialSnapshot> => lyceum.getFinancialSnapshot(ra),

    createRefund: (profile: DemoProfile, input: NewRefundInput) =>
      serial(async () => {
        if (!can.create(profile.role)) throw new ServiceError('permission', 'Somente o perfil Solicitante registra solicitações.');
        const config = store.read().config;
        if (config.lyceumRequestMode === 'manual' && !input.lyceumConfirmed)
          throw new ServiceError('validation', 'Confirme que registrou a solicitação na aba de devolução do Lyceum e conferiu o valor do crédito.');
        const snapshot = await lyceum.getFinancialSnapshot(input.ra);
        const credit = snapshot.credits.find(c => c.id === input.creditId);
        if (!credit) throw new ServiceError('not_found', `Crédito ${input.creditId} não encontrado para o RA ${input.ra}.`);
        const eligibility = creditEligibility(credit, store.read().refunds);
        if (!eligibility.selectable) throw new ServiceError('state', `Solicitação bloqueada: ${eligibility.reason}`);
        if (!Number.isInteger(input.amount) || input.amount <= 0) throw new ServiceError('validation', 'Informe um valor a devolver maior que zero.');

        const protocol = `DEV-${clock().getFullYear()}-${String(store.read().protocolSeq + 1).padStart(4, '0')}`;
        const lyceumRequest: Refund['lyceumRequest'] =
          config.lyceumRequestMode === 'automatico'
            ? { mode: 'automatico', confirmedByRequester: false, at: nowIso(), reference: (await lyceum.registerRefundRequest({ ra: input.ra, creditId: credit.id, amount: input.amount, protocol })).reference }
            : { mode: 'manual', confirmedByRequester: true, at: nowIso() };
        const payment = normalizePayment(input.payment);
        const { results } = await evaluate({ ra: input.ra, creditId: credit.id, amount: input.amount, payment, lyceumRequest });
        const decision = decideRouting(results);

        const db = structuredClone(store.read());
        db.protocolSeq++;
        const created = nowIso();
        const { student } = snapshot;
        const balance = creditBalance(credit);
        const refund: Refund = {
          id: randomId('dev'),
          protocol,
          version: 1,
          createdAt: created,
          updatedAt: created,
          status: decision.status,
          requester: { profileId: profile.id, name: profile.name, email: profile.email, sector: profile.sector as RequesterSector },
          student: {
            ra: student.ra,
            name: student.name,
            email: student.email,
            course: student.course,
            level: student.level,
            modality: student.modality,
            institution: student.institution,
            responsibleName: student.responsible.name,
            responsibleEmail: student.responsible.email,
            responsibleIsStudent: student.responsible.isStudent,
          },
          credit: { id: credit.id, origin: credit.origin, originDetail: credit.originDetail, originalAmount: credit.originalAmount, availableAtRequest: balance.available },
          amount: input.amount,
          requestedAmount: input.amount,
          payment,
          lyceumRequest,
          checkRuns: [checkRun('cadastro', results, decision)],
          decisions: [],
          tracking: { token: trackingToken(), createdAt: created },
          history: [],
        };
        applyRouting(refund, decision, results);
        refund.history.push(
          entry(actorOf(profile), 'cadastro', 'Solicitação registrada', {
            note: `Crédito ${credit.id} (${credit.origin}) · ${money(input.amount)} · ${payment.method === 'pix' ? 'Pix' : 'transferência'}. ${lyceumRequest.mode === 'manual' ? 'Registro na aba de devolução do Lyceum confirmado pela solicitante.' : `Registrado automaticamente no Lyceum (${lyceumRequest.reference}).`} Link individual gerado.`,
          }),
          entry(systemActor, 'verificacao', decision.summary, { checks: results, to: decision.status }),
        );
        const emails = routingEmails(refund, decision, results).map(toOutbox);
        db.refunds.push(refund);
        db.outbox.push(...emails);
        store.commit(db);
        await dispatch(emails);
        return structuredClone(refund);
      }),

    resubmit: (profile: DemoProfile, id: string, version: number, input: { amount: number; payment: PaymentData }) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.resubmit(profile.role, current)) throw new ServiceError('permission', 'Somente o Solicitante reenvia pedidos em correção.');
        if (!Number.isInteger(input.amount) || input.amount <= 0) throw new ServiceError('validation', 'Informe um valor a devolver maior que zero.');
        const payment = normalizePayment(input.payment);
        const { results } = await evaluate({ refundId: id, ra: current.student.ra, creditId: current.credit.id, amount: input.amount, payment, lyceumRequest: current.lyceumRequest });
        const decision = decideRouting(results);
        const { refund, emails } = commitRefund(id, version, r => {
          const from = r.status;
          const changes = [
            r.amount !== input.amount ? `valor ${money(r.amount)} → ${money(input.amount)}` : '',
            JSON.stringify(r.payment) !== JSON.stringify(payment) ? 'dados de pagamento atualizados' : '',
          ].filter(Boolean);
          r.amount = input.amount;
          r.payment = payment;
          r.checkRuns.push(checkRun('reenvio', results, decision));
          applyRouting(r, decision, results);
          r.history.push(
            entry(actorOf(profile), 'reenvio', 'Correção reenviada', { note: changes.length ? `Alterações: ${changes.join('; ')}.` : 'Reenviado sem alterações.', from }),
            entry(systemActor, 'verificacao', decision.summary, { checks: results, to: decision.status }),
          );
          return routingEmails(r, decision, results);
        });
        await dispatch(emails);
        return refund;
      }),

    forwardException: (profile: DemoProfile, id: string, version: number, input: ForwardDecision) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.resolveException(profile.role, current)) throw new ServiceError('permission', 'Somente o Financeiro decide exceções em análise.');
        const justification = requireText(input.justification, MIN_JUSTIFICATION, 'A justificativa');
        const amount = input.adjustedAmount ?? current.amount;
        if (!Number.isInteger(amount) || amount <= 0) throw new ServiceError('validation', 'Valor ajustado inválido.');
        const { results } = await evaluate({ refundId: id, ra: current.student.ra, creditId: current.credit.id, amount, payment: current.payment, lyceumRequest: current.lyceumRequest });
        const blockers = forwardBlockers(results);
        if (blockers.length)
          throw new ServiceError('state', `Não é possível encaminhar: ${blockers.map(b => b.detail).join(' ')} Solicite correção ou encerre registrando o motivo.`);
        const assumed = overridable(results);
        if (assumed.some(c => c.id === 'devolucao_anterior') && !input.duplicityReviewed)
          throw new ServiceError('validation', 'Declare que conferiu a devolução anterior no Lyceum e que o saldo restante não é duplicidade.');
        const decision: RoutingDecision = {
          status: 'aguardando_pagamento',
          rule: 'decisao_financeiro',
          summary: assumed.length ? `Encaminhado pelo Financeiro, assumindo: ${assumed.map(a => a.label.toLowerCase()).join(', ')}.` : 'Encaminhado pelo Financeiro: verificações aprovadas após a revisão.',
        };
        const { refund } = commitRefund(id, version, r => {
          const adjusted = amount !== r.amount ? amount : undefined;
          r.decisions.push({ at: nowIso(), by: profile.team, decision: 'encaminhar', justification, adjustedAmount: adjusted, overriddenChecks: assumed.map(a => a.id) });
          r.checkRuns.push(checkRun('decisao_financeiro', results, decision));
          r.history.push(
            entry(actorOf(profile), 'decisao_financeiro', 'Exceção resolvida e encaminhada para Cobranças a Pagar', {
              note: `${adjusted ? `Valor ajustado de ${money(r.amount)} para ${money(adjusted)} (saldo disponível). ` : ''}Justificativa: ${justification}`,
              checks: results,
              from: r.status,
              to: 'aguardando_pagamento',
            }),
          );
          r.amount = amount;
          r.status = 'aguardando_pagamento';
          r.analysisReason = undefined;
        });
        return refund;
      }),

    requestCorrection: (profile: DemoProfile, id: string, version: number, reason: string) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.requestCorrection(profile.role, current)) throw new ServiceError('permission', 'Este perfil não pode solicitar correção nesta etapa.');
        const text = requireText(reason, 10, 'O motivo da correção');
        const { refund, emails } = commitRefund(id, version, r => {
          if (profile.role === 'financeiro') r.decisions.push({ at: nowIso(), by: profile.team, decision: 'correcao', justification: text, overriddenChecks: [] });
          r.history.push(entry(actorOf(profile), 'correcao_solicitada', `Correção solicitada por ${profile.team}`, { note: text, from: r.status, to: 'correcao' }));
          r.status = 'correcao';
          r.correction = { at: nowIso(), by: profile.team, reason: text };
          r.schedule = undefined;
          return [correctionEmail(r, text, profile.team, links(r))];
        });
        await dispatch(emails);
        return refund;
      }),

    closeWithoutPayment: (profile: DemoProfile, id: string, version: number, reason: string) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.close(profile.role, current)) throw new ServiceError('permission', 'Somente o Financeiro encerra sem pagamento.');
        const text = requireText(reason, 10, 'O motivo do encerramento');
        const { refund, emails } = commitRefund(id, version, r => {
          r.decisions.push({ at: nowIso(), by: profile.team, decision: 'encerrar', justification: text, overriddenChecks: [] });
          r.history.push(entry(actorOf(profile), 'encerramento', 'Encerrado sem pagamento', { note: `${text} Aviso enviado somente ao colaborador solicitante.`, from: r.status, to: 'encerrado' }));
          r.status = 'encerrado';
          r.closure = { at: nowIso(), by: profile.team, reason: text };
          r.schedule = undefined;
          // Regra: encerramento sem pagamento avisa o colaborador, nunca o aluno.
          return [closureEmail(r, text, links(r))];
        });
        await dispatch(emails);
        return refund;
      }),

    holdForAnalysis: (profile: DemoProfile, id: string, version: number, reason: string) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.hold(profile.role, current)) throw new ServiceError('permission', 'Somente o Financeiro retém pedidos para análise.');
        const text = requireText(reason, 10, 'O motivo da retenção');
        return commitRefund(id, version, r => {
          r.decisions.push({ at: nowIso(), by: profile.team, decision: 'reter', justification: text, overriddenChecks: [] });
          r.history.push(entry(actorOf(profile), 'retencao', 'Retido para análise do Financeiro', { note: text, from: r.status, to: 'analise_financeiro' }));
          r.status = 'analise_financeiro';
          r.analysisReason = `Retido pelo Financeiro: ${text}`;
          r.schedule = undefined;
        }).refund;
      }),

    schedulePayment: (profile: DemoProfile, id: string, version: number, scheduledFor: string) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.schedule(profile.role, current)) throw new ServiceError('permission', 'Somente Cobranças a Pagar registra agendamentos.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledFor) || scheduledFor < civilDate(clock())) throw new ServiceError('validation', 'Informe uma data de agendamento a partir de hoje.');
        return commitRefund(id, version, r => {
          r.schedule = { date: scheduledFor, at: nowIso(), by: profile.team };
          r.history.push(entry(actorOf(profile), 'agendamento', `Pagamento agendado para ${date(scheduledFor)}`, { note: 'Agendamento não conclui o pagamento: o pedido continua em Aguardando pagamento até a confirmação da execução.' }));
        }).refund;
      }),

    confirmPayment: (profile: DemoProfile, id: string, version: number, input: PaymentConfirmation) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.confirmPayment(profile.role, current)) throw new ServiceError('permission', 'Somente Cobranças a Pagar confirma pagamentos.');
        if (!input.executedAndVerified) throw new ServiceError('validation', 'Confirme que o pagamento já foi executado e conferido. Previsão ou agendamento não contam.');
        const today = civilDate(clock());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidAt)) throw new ServiceError('validation', 'Informe a data do pagamento.');
        if (input.paidAt > today) throw new ServiceError('validation', 'A data do pagamento não pode estar no futuro. Para datas futuras, registre um agendamento.');
        if (input.paidAt < civilDate(current.createdAt)) throw new ServiceError('validation', 'A data do pagamento não pode ser anterior à solicitação.');
        if (input.attachProof === null) throw new ServiceError('validation', 'Responda se vai anexar o comprovante.');
        let proof: ProofMeta | undefined;
        if (input.attachProof) {
          if (!input.file) throw new ServiceError('validation', 'Selecione o arquivo do comprovante.');
          const type = await validateProof(input.file);
          proof = { id: randomId('proof'), name: input.file.name, type, size: input.file.blob.size, uploadedAt: nowIso() };
          await proofs.put(input.file.blob, proof);
        }
        const { refund, emails } = commitRefund(id, version, r => {
          r.paymentRecord = { paidAt: input.paidAt, confirmedAt: nowIso(), confirmedBy: profile.team, attachProof: input.attachProof === true, proof, bankReference: input.bankReference?.trim() || undefined };
          r.lyceumSync = { status: 'pendente', attempts: 0 };
          r.history.push(
            entry(actorOf(profile), 'pagamento', 'Pagamento realizado e conferido', {
              note: `Pago em ${date(input.paidAt)}${r.paymentRecord.bankReference ? ` · referência bancária ${r.paymentRecord.bankReference}` : ''}. Comprovante: ${proof ? `sim (${proof.name})` : 'não anexado'}.`,
              from: r.status,
              to: 'pago',
            }),
          );
          r.status = 'pago';
          return [paymentStudentEmail(r, links(r)), paymentRequesterEmail(r, links(r))];
        });
        await dispatch(emails);
        // A baixa no Lyceum roda depois, sem desfazer o pagamento se falhar.
        void serial(() => syncLyceum(id));
        return refund;
      }),

    retryLyceumSync: (profile: DemoProfile, id: string) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.treatLyceum(profile.role, current)) throw new ServiceError('permission', 'Não há pendência de Lyceum para tratar neste pedido.');
        commitRefund(id, null, r => {
          r.lyceumSync = { ...r.lyceumSync!, status: 'pendente' };
          r.history.push(entry(actorOf(profile), 'lyceum_baixa', 'Nova tentativa de baixa no Lyceum solicitada'));
        });
        await syncLyceum(id);
        return requireRefund(id);
      }),

    registerManualLyceumSync: (profile: DemoProfile, id: string, version: number, input: { reference: string; note: string }) =>
      serial(async () => {
        const current = requireRefund(id);
        if (!can.treatLyceum(profile.role, current)) throw new ServiceError('permission', 'Não há pendência de Lyceum para tratar neste pedido.');
        const reference = input.reference.trim().toUpperCase();
        if (!/^LYC-[A-Z]{2,3}-\d{4}-\d{4,6}$/.test(reference)) throw new ServiceError('validation', 'Referência no formato LYC-DV-AAAA-00000.');
        const note = requireText(input.note, 10, 'A observação');
        await lyceum.confirmManualRefund({ ra: current.student.ra, creditId: current.credit.id, amount: current.amount, date: current.paymentRecord!.paidAt, reference, refundId: id });
        return commitRefund(id, version, r => {
          r.lyceumSync = { ...r.lyceumSync!, status: 'manual', reference, syncedAt: nowIso(), note };
          r.history.push(entry(actorOf(profile), 'lyceum_manual', 'Baixa registrada manualmente no Lyceum', { note: `Referência ${reference}. ${note}` }));
        }).refund;
      }),

    updateConfig: (patch: Partial<DemoConfig>) =>
      serial(async () => {
        const db = structuredClone(store.read());
        db.config = { ...db.config, ...patch };
        store.commit(db);
        return db.config;
      }),

    getProof: async (profile: DemoProfile, id: string) => {
      const r = requireRefund(id);
      if (!can.viewProof(profile.role) || !r.paymentRecord?.proof) throw new ServiceError('not_found', 'Comprovante não disponível.');
      const blob = await proofs.get(r.paymentRecord.proof.id);
      if (!blob) throw new ServiceError('not_found', 'O arquivo do comprovante não está neste navegador (a demonstração guarda arquivos localmente).');
      return { blob, meta: r.paymentRecord.proof };
    },
  };
}

export type RefundService = ReturnType<typeof createRefundService>;
