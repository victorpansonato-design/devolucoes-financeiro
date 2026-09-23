// Modelos de e-mail. O serviço grava cada mensagem na caixa de saída (padrão "outbox" transacional);
// na demonstração o despacho é simulado e nada sai do navegador. Nenhum texto expõe chave Pix, CPF ou conta completos.
import { date, firstName, money } from '../lib/format';
import { maskAccount, maskPixKey } from '../lib/mask';
import { bankName, pixKeyTypes } from '../lib/validation';
import { financeTeam } from './profiles';
import type { CheckResult, EmailRecipient, EmailTrigger, OutboxEmail, Refund } from './types';

export interface EmailLinks {
  /** Link individual do aluno. */
  tracking: string;
  /** Link interno do pedido. */
  internal: string;
}

export type EmailDraft = Omit<OutboxEmail, 'id' | 'at' | 'state'>;

export const triggerLabel: Record<EmailTrigger, string> = {
  correcao_solicitada: 'Correção solicitada',
  excecao_financeiro: 'Exceção enviada ao Financeiro',
  encerrada_sem_pagamento: 'Encerramento sem pagamento',
  pagamento_colaborador: 'Pagamento confirmado',
  pagamento_aluno: 'Pagamento confirmado',
  lyceum_pendente: 'Falha na baixa do Lyceum',
};

/** Destino mascarado: suficiente para o aluno reconhecer, insuficiente para reutilizar. */
export function maskedDestination(r: Refund) {
  const p = r.payment;
  if (p.method === 'pix') {
    const type = pixKeyTypes.find(t => t.id === p.pixKeyType)?.label ?? 'Pix';
    return `Pix · chave ${type.toLowerCase()} ${maskPixKey(p.pixKeyType, p.pixKey)}`;
  }
  return `Transferência · ${bankName(p.bankCode)} · conta ${maskAccount(p.account)}`;
}

const signature = '\n\nAtenciosamente,\nFinanceiro · UniAnchieta';

const requesterRecipient = (r: Refund): EmailRecipient => ({ name: r.requester.name, email: r.requester.email, kind: 'colaborador' });

function studentRecipients(r: Refund): EmailRecipient[] {
  const list: EmailRecipient[] = [{ name: r.student.name, email: r.student.email, kind: 'aluno' }];
  if (!r.student.responsibleIsStudent && r.student.responsibleEmail !== r.student.email)
    list.push({ name: r.student.responsibleName, email: r.student.responsibleEmail, kind: 'responsavel' });
  return list;
}

const draft = (r: Refund, trigger: EmailTrigger, to: EmailRecipient[], subject: string, body: string): EmailDraft => ({
  refundId: r.id,
  protocol: r.protocol,
  trigger,
  triggerLabel: triggerLabel[trigger],
  to,
  subject,
  body,
});

export function correctionEmail(r: Refund, reason: string, byTeam: string, links: EmailLinks): EmailDraft {
  return draft(
    r,
    'correcao_solicitada',
    [requesterRecipient(r)],
    `Correção necessária · ${r.protocol} · ${r.student.name}`,
    `Olá, ${firstName(r.requester.name)}.\n\nA solicitação ${r.protocol}, de ${r.student.name} (RA ${r.student.ra}), precisa de correção antes de seguir para pagamento.\n\nMotivo: ${reason}\nIdentificado por: ${byTeam}\nDados de pagamento atuais: ${maskedDestination(r)}\n\nAbra o pedido e use "Corrigir e reenviar". As verificações automáticas serão executadas novamente.\n${links.internal}${signature}`,
  );
}

export function exceptionEmail(r: Refund, failing: CheckResult[], links: EmailLinks): EmailDraft {
  return draft(
    r,
    'excecao_financeiro',
    [{ name: financeTeam.name, email: financeTeam.email, kind: 'equipe' }],
    `Exceção para análise · ${r.protocol} · ${money(r.amount)}`,
    `Olá, equipe Financeiro.\n\nA solicitação ${r.protocol}, de ${r.student.name} (RA ${r.student.ra}), não seguiu direto para pagamento.\n\n${failing.map(c => `• ${c.label}: ${c.detail}`).join('\n')}\n\nRegistre a decisão no pedido: encaminhar com justificativa, solicitar correção ou encerrar.\n${links.internal}${signature}`,
  );
}

export function closureEmail(r: Refund, reason: string, links: EmailLinks): EmailDraft {
  return draft(
    r,
    'encerrada_sem_pagamento',
    [requesterRecipient(r)],
    `Solicitação encerrada sem pagamento · ${r.protocol}`,
    `Olá, ${firstName(r.requester.name)}.\n\nA solicitação ${r.protocol}, de ${r.student.name} (RA ${r.student.ra}), foi encerrada sem pagamento pelo Financeiro.\n\nMotivo: ${reason}\n\nO aluno não recebe e-mail neste caso. O link individual passa a mostrar a solicitação como encerrada, sem expor o motivo interno.\n${links.internal}${signature}`,
  );
}

export function paymentRequesterEmail(r: Refund, links: EmailLinks): EmailDraft {
  const record = r.paymentRecord!;
  return draft(
    r,
    'pagamento_colaborador',
    [requesterRecipient(r)],
    `Devolução paga · ${r.protocol} · ${r.student.name}`,
    `Olá, ${firstName(r.requester.name)}.\n\nA devolução ${r.protocol}, de ${r.student.name}, foi paga em ${date(record.paidAt)}: ${money(r.amount)} (${maskedDestination(r)}).\n\n${record.proof ? `Comprovante anexado: ${record.proof.name}. Ele pode ser consultado no pedido.` : 'Cobranças a Pagar registrou o pagamento sem anexar comprovante.'}\nO aluno recebeu a confirmação com o link individual.\n${links.internal}${signature}`,
  );
}

export function paymentStudentEmail(r: Refund, links: EmailLinks): EmailDraft {
  const record = r.paymentRecord!;
  const to = studentRecipients(r);
  const greeting = [...new Set(to.map(t => firstName(t.name)))].join(' e ');
  return draft(
    r,
    'pagamento_aluno',
    to,
    `Sua devolução foi paga · ${r.protocol}`,
    `Olá, ${greeting}!\n\nA devolução de ${money(r.amount)} da solicitação ${r.protocol}, referente a ${r.student.name}, foi paga em ${date(record.paidAt)}.\n\nForma de pagamento: ${maskedDestination(r)}.\n\nAcompanhe a solicitação${record.proof ? ' e consulte o comprovante' : ''} pelo seu link individual:\n${links.tracking}\n\nO link é pessoal. Não o compartilhe.${signature}`,
  );
}

export function lyceumPendingEmail(r: Refund, error: string, links: EmailLinks): EmailDraft {
  return draft(
    r,
    'lyceum_pendente',
    [{ name: financeTeam.name, email: financeTeam.email, kind: 'equipe' }],
    `Baixa no Lyceum pendente · ${r.protocol}`,
    `Olá, equipe Financeiro.\n\nO pagamento da solicitação ${r.protocol} (${r.student.name}, ${money(r.amount)}) foi confirmado em ${date(r.paymentRecord?.paidAt)}, mas a baixa da devolução no Lyceum não foi registrada.\n\nErro retornado: ${error}\n\nO pagamento continua confirmado. Tente novamente pelo pedido ou registre a baixa manual com a referência do Lyceum.\n${links.internal}${signature}`,
  );
}
