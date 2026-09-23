export const statuses = { conferencia: 'Em conferência', pagamento: 'Aguardando pagamento', correcao: 'Dados a corrigir', pago: 'Pago', encerrado: 'Encerrado sem pagamento' } as const;
export type Status = keyof typeof statuses;
export const sectors = ['Graduação', 'Técnico', 'Escolas', 'EAD', 'Secretaria', 'Captação'];
export const reasons = ['Cancelamento de matrícula', 'Trancamento', 'Não formação de turma', 'Extinção de curso', 'Prouni', 'FIES', 'Pagamento em duplicidade', 'Pagamento a maior', 'Pagamento indevido', 'Transferência', 'Cancelamento de passeio', 'Material escolar', 'Prova substitutiva', 'DP / disciplina', 'Alteração de data', 'Outros'];
export const shifts = ['Noturno', 'Diurno', 'EAD', 'Híbrido', 'Matutino', 'Vespertino', 'Integral'];
export const profiles = [
  { id: 'victor', name: 'Victor Capitani', role: 'solicitante', sector: 'Graduação' },
  { id: 'financeiro', name: 'Equipe Financeiro', role: 'financeiro', sector: 'Financeiro' },
  { id: 'pagamentos', name: 'Equipe Cobranças a Pagar', role: 'pagamentos', sector: 'Cobranças a Pagar' },
] as const;
export type Profile = typeof profiles[number];
export interface Entry { id: string; at: string; actor: string; title: string; note: string }
export interface Message { id: string; at: string; event: 'recebido' | 'pago' | 'encerrado'; subject: string; email: string; push: string }
export interface Refund {
  id: string; protocol: string; version: number; createdAt: string; updatedAt: string; status: Status;
  requesterId: string; requester: string; sector: string; institution: string; student: string; responsible: string;
  ra: string; amount: number; costCenter: string; course: string; reason: string; notes: string; shift: string;
  method: 'pix' | 'conta'; pix: string; agency: string; account: string; holderCpf: string; holder: string; bank: string;
  email: string; lyceumReference: string; lyceumConfirmed: boolean; pendingReason: string; closureReason: string;
  paidAt: string; history: Entry[]; messages: Message[];
  trackingToken?: string; trackingReady?: boolean; trackingUrl?: string;
  proof?: { key: string; name: string; type: 'application/pdf' | 'image/png' | 'image/jpeg'; size: number };
}
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const date = (value: string) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value)) : '—';
export const dateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('');
export function weekdays(start: string, end = new Date().toISOString()) {
  const asDate = (s: string) => new Date(new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T12:00:00Z');
  const a = asDate(start), b = asDate(end); let n = 0;
  while (a < b) { a.setUTCDate(a.getUTCDate() + 1); if (a.getUTCDay() !== 0 && a.getUTCDay() !== 6) n++; }
  return n;
}
export function owner(r: Refund) { return r.status === 'correcao' ? r.requester : r.status === 'conferencia' ? 'Financeiro' : r.status === 'pagamento' ? 'Cobranças a Pagar' : 'Concluído'; }
export const closed = (r: Refund) => r.status === 'pago' || r.status === 'encerrado';
export const amountColor = (r: Refund) => r.status === 'encerrado' ? 'text-crit-ink' : r.status === 'pago' ? 'text-money' : 'text-warn-ink';
export function makeMessage(r: Refund, event: Message['event'], at: string): Message {
  const first = r.responsible.split(' ')[0];
  const body = event === 'recebido'
    ? `Olá, ${first}!\n\nRegistramos a solicitação de devolução de ${money(r.amount)}, referente a ${r.reason.toLocaleLowerCase('pt-BR')}, para ${r.student}.\n\nProtocolo: ${r.protocol}. O prazo informado é de até 15 dias úteis a partir do cadastro, sujeito à conferência das informações. Se precisarmos de algum ajuste, nossa equipe entrará em contato.\n\nVocê receberá uma atualização quando o pagamento for confirmado.\n\nAtenciosamente,\nEquipe UniAnchieta`
    : event === 'pago'
    ? `Olá, ${first}!\n\nA devolução de ${money(r.amount)}, referente ao protocolo ${r.protocol}, foi realizada em ${date(r.paidAt)}, por ${r.method === 'pix' ? 'Pix' : 'transferência bancária'}, para ${r.holder}.\n\nCaso precise do comprovante ou de algum esclarecimento, entre em contato com nossa equipe e informe o protocolo.\n\nAtenciosamente,\nEquipe UniAnchieta`
    : `Olá, ${first}!\n\nTemos uma atualização sobre a solicitação ${r.protocol}, referente a ${r.student}. Após a conferência, ela foi encerrada sem um novo pagamento.\n\nMotivo: ${r.closureReason}.\n\nSe precisar de esclarecimentos, nossa equipe está à disposição. Informe o protocolo para consultarmos seu atendimento.\n\nAtenciosamente,\nEquipe UniAnchieta`;
  return { id: crypto.randomUUID(), at, event, subject: event === 'pago' ? `Devolução realizada · ${r.protocol}` : event === 'recebido' ? `Solicitação recebida · ${r.protocol}` : `Atualização da devolução · ${r.protocol}`, email: body, push: event === 'pago' ? `Sua devolução de ${money(r.amount)} foi realizada. Protocolo ${r.protocol}.` : event === 'recebido' ? `Recebemos sua solicitação de devolução. Protocolo ${r.protocol}.` : `Há uma atualização na solicitação ${r.protocol}. Entre em contato com nossa equipe.` };
}
