// Projeção pública: o MÍNIMO que o link individual pode mostrar.
// Sem RA, CPF, chave Pix, dados bancários, extrato, anotações internas ou motivo de exceção.
import type { PaymentMethod, ProofType, Refund } from './types';

export type PublicStage = 'verificacao' | 'correcao' | 'aguardando_pagamento' | 'pago' | 'encerrado';

export interface PublicTrackingView {
  v: 1;
  protocol: string;
  studentName: string;
  amount: number;
  method: PaymentMethod;
  stage: PublicStage;
  receivedAt: string;
  verifiedAt?: string;
  paidAt?: string;
  closedAt?: string;
  updatedAt: string;
  /** Presente somente depois do pagamento confirmado, e só se houver comprovante anexado. */
  proof?: { id: string; name: string; type: ProofType };
}

const stageOf: Record<Refund['status'], PublicStage> = {
  analise_financeiro: 'verificacao',
  correcao: 'correcao',
  aguardando_pagamento: 'aguardando_pagamento',
  pago: 'pago',
  encerrado: 'encerrado',
};

export function toPublicView(r: Refund): PublicTrackingView {
  const statusChanges = r.history.filter(h => h.to);
  const verifiedAt = [...statusChanges].reverse().find(h => h.to === 'aguardando_pagamento')?.at;
  const proof = r.status === 'pago' ? r.paymentRecord?.proof : undefined;
  const updatedAt = statusChanges.at(-1)?.at ?? r.createdAt;
  return {
    v: 1,
    protocol: r.protocol,
    studentName: r.student.name,
    amount: r.amount,
    method: r.payment.method,
    stage: stageOf[r.status],
    receivedAt: r.createdAt,
    ...(verifiedAt && r.status !== 'encerrado' ? { verifiedAt } : {}),
    ...(r.status === 'pago' && r.paymentRecord ? { paidAt: r.paymentRecord.paidAt } : {}),
    ...(r.status === 'encerrado' && r.closure ? { closedAt: r.closure.at } : {}),
    updatedAt,
    ...(proof ? { proof: { id: proof.id, name: proof.name, type: proof.type } } : {}),
  };
}

/** Índice token → projeção. Em produção: endpoint que valida o hash do token e devolve só esta projeção. */
export function buildPublicIndex(refunds: Refund[]): Record<string, PublicTrackingView> {
  return Object.fromEntries(refunds.map(r => [r.tracking.token, toPublicView(r)]));
}

export type StepState = 'done' | 'current' | 'attention' | 'future' | 'closed';

export interface PublicStep {
  key: 'recebida' | 'verificacoes' | 'aguardando' | 'pago' | 'encerrada';
  title: string;
  description: string;
  state: StepState;
  at?: string;
}

export function publicSteps(v: PublicTrackingView): PublicStep[] {
  const received: PublicStep = { key: 'recebida', title: 'Solicitação recebida', description: 'Pedido registrado pela equipe UniAnchieta.', state: 'done', at: v.receivedAt };
  if (v.stage === 'encerrado')
    return [
      received,
      { key: 'verificacoes', title: 'Verificações', description: 'A equipe analisou a solicitação.', state: 'done' },
      { key: 'encerrada', title: 'Encerrada sem pagamento', description: 'Não houve pagamento para esta solicitação. Para esclarecimentos, fale com a equipe informando o protocolo.', state: 'closed', at: v.closedAt },
    ];
  const verification: PublicStep =
    v.stage === 'verificacao'
      ? { key: 'verificacoes', title: 'Verificações', description: 'A equipe está conferindo as informações do pedido.', state: 'current' }
      : v.stage === 'correcao'
        ? { key: 'verificacoes', title: 'Verificações · ajuste de dados', description: 'Precisamos ajustar informações antes de continuar. A equipe responsável já foi avisada.', state: 'attention' }
        : { key: 'verificacoes', title: 'Verificações concluídas', description: 'Crédito e dados de pagamento conferidos.', state: 'done', at: v.verifiedAt };
  const waiting: PublicStep = {
    key: 'aguardando',
    title: 'Aguardando pagamento',
    description: v.stage === 'pago' ? 'Pedido encaminhado para pagamento.' : v.stage === 'aguardando_pagamento' ? 'Pedido na fila de pagamento da equipe financeira.' : 'Próxima etapa, após as verificações.',
    state: v.stage === 'pago' ? 'done' : v.stage === 'aguardando_pagamento' ? 'current' : 'future',
    at: v.stage === 'pago' || v.stage === 'aguardando_pagamento' ? v.verifiedAt : undefined,
  };
  const paid: PublicStep = {
    key: 'pago',
    title: 'Pagamento realizado',
    description: v.stage === 'pago' ? 'Pagamento executado e conferido pela equipe.' : 'A confirmação aparecerá aqui depois do pagamento.',
    state: v.stage === 'pago' ? 'done' : 'future',
    at: v.paidAt,
  };
  return [received, verification, waiting, paid];
}
