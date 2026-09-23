// Monta os exemplos EXECUTANDO o fluxo real (serviço + adaptadores simulados) com um relógio no passado.
// Assim histórico, verificações, caixa de saída, Lyceum simulado e página pública nascem coerentes entre si.
import { createDemoBankValidator } from '../adapters/bank.demo';
import type { ProofStorage } from '../adapters/contracts';
import { createDemoLyceum } from '../adapters/lyceum.demo';
import { createDemoMail } from '../adapters/mail.demo';
import { demoProfiles } from '../domain/profiles';
import type { DemoDatabase, PaymentData } from '../domain/types';
import { civilDate, date, money } from '../lib/format';
import { maskCpf } from '../lib/mask';
import { createRefundService } from '../services/refundService';
import { demoProofBlob } from './demoPdf';
import { buildLyceumSeed, seedRequesters, students, thirdPartyHolder } from './seedData';
import { createMemoryStore, SCHEMA_VERSION } from './store';

export const DEFAULT_LATENCY_MS = 450;

export interface SeedOptions {
  proofs: ProofStorage;
  links: { tracking: (token: string) => string; internal: (refundId: string) => string };
  now?: Date;
  latencyMs?: number;
}

export function emptyDatabase(now: Date): DemoDatabase {
  const lyceum = buildLyceumSeed(now);
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    protocolSeq: 40,
    lyceum: { students: structuredClone(students), charges: lyceum.charges, credits: lyceum.credits },
    refunds: [],
    outbox: [],
    config: { lyceumRequestMode: 'manual', nextLyceumSyncFails: false, latencyMs: 0 },
  };
}

const find = (ra: string) => students.find(s => s.ra === ra)!;

export async function buildSeedDatabase({ proofs, links, now = new Date(), latencyMs = DEFAULT_LATENCY_MS }: SeedOptions): Promise<DemoDatabase> {
  const store = createMemoryStore(emptyDatabase(now));
  let current = now;
  const clock = () => current;
  /** Posiciona o relógio N dias antes de "agora", no horário indicado (horário de Brasília ≈ UTC−3). */
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(hour + 3, minute, 0, 0);
    current = d;
  };
  const day = (daysAgo: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return civilDate(d);
  };

  const service = createRefundService({ store, lyceum: createDemoLyceum(store, clock), bank: createDemoBankValidator(), mail: createDemoMail(), proofs, clock, links });
  const [, finance, payments] = demoProfiles as [typeof demoProfiles[0], typeof demoProfiles[1], typeof demoProfiles[2]];
  const credit = (ra: string, index = 0) => store.read().lyceum.credits[ra]![index]!;
  const pix = (holder: 'aluno' | 'responsavel', ra: string, type: PaymentData['pixKeyType'], key: string): PaymentData => {
    const s = find(ra);
    const person = holder === 'aluno' ? { name: s.name, cpf: s.cpf } : { name: s.responsible.name, cpf: s.responsible.cpf };
    return { method: 'pix', holderKind: holder, holderName: person.name, holderCpf: person.cpf, pixKeyType: type, pixKey: key };
  };

  // Carlos — transferência, encaminhada direto; há 16 dias (prioridade alta pelo prazo).
  at(16, 9, 12);
  const carlos = find('23200457');
  await service.createRefund(seedRequesters.diego, {
    ra: carlos.ra,
    creditId: credit(carlos.ra).id,
    amount: credit(carlos.ra).originalAmount,
    lyceumConfirmed: true,
    payment: { method: 'transferencia', holderKind: 'aluno', holderName: carlos.name, holderCpf: carlos.cpf, bankCode: '001', agency: '3057', account: '41822-7', accountType: 'corrente' },
  });

  // Lucas — Pix, direto; pago há 2 dias com comprovante em PDF; baixa no Lyceum registrada.
  at(13, 10, 5);
  const lucas = find('22200588');
  const lucasRefund = await service.createRefund(seedRequesters.diego, {
    ra: lucas.ra,
    creditId: credit(lucas.ra).id,
    amount: credit(lucas.ra).originalAmount,
    lyceumConfirmed: true,
    payment: pix('aluno', lucas.ra, 'cpf', lucas.cpf),
  });
  at(2, 15, 40);
  const proof = demoProofBlob({
    title: 'Comprovante de transferência Pix',
    lines: [
      ['Protocolo', lucasRefund.protocol],
      ['Favorecido', lucas.name],
      ['Chave', `CPF ${maskCpf(lucas.cpf)}`],
      ['Valor', money(lucasRefund.amount)],
      ['Data', date(day(2))],
      ['Identificador', 'E2E-DEMO-7Q4K2M9X'],
    ],
  });
  await service.confirmPayment(payments, lucasRefund.id, lucasRefund.version, {
    paidAt: day(2),
    executedAndVerified: true,
    attachProof: true,
    file: { blob: proof, name: `comprovante-pix-${lucasRefund.protocol}.pdf` },
    bankReference: 'E2E-DEMO-7Q4K2M9X',
  });
  await service.idle();

  // Gustavo — Pix, direto; pago ontem sem comprovante; a baixa no Lyceum falhou (pendência).
  at(11, 14, 20);
  const gustavo = find('21300845');
  const gustavoRefund = await service.createRefund(seedRequesters.tiago, {
    ra: gustavo.ra,
    creditId: credit(gustavo.ra).id,
    amount: credit(gustavo.ra).originalAmount,
    lyceumConfirmed: true,
    payment: pix('aluno', gustavo.ra, 'email', 'gustavo.freitas@email.example'),
  });
  at(1, 11, 5);
  await service.updateConfig({ nextLyceumSyncFails: true });
  await service.confirmPayment(payments, gustavoRefund.id, gustavoRefund.version, { paidAt: day(1), executedAndVerified: true, attachProof: false });
  await service.idle();

  // Fernanda — conta de terceiro → Análise do Financeiro → encerrado sem pagamento (aluno não é avisado).
  at(8, 16, 30);
  const fernanda = find('24300210');
  const fernandaRefund = await service.createRefund(seedRequesters.paula, {
    ra: fernanda.ra,
    creditId: credit(fernanda.ra).id,
    amount: credit(fernanda.ra).originalAmount,
    lyceumConfirmed: true,
    payment: { method: 'pix', holderKind: 'outro', holderName: thirdPartyHolder.name, holderCpf: thirdPartyHolder.cpf, pixKeyType: 'email', pixKey: thirdPartyHolder.pixKey },
  });
  at(6, 10, 15);
  await service.closeWithoutPayment(
    finance,
    fernandaRefund.id,
    fernandaRefund.version,
    'Conta informada é de terceiro. Após contato da Secretaria, a responsável optou por manter o valor como crédito para as próximas mensalidades.',
  );

  // Mariana — conta com dígitos trocados: a pré-validação devolve para correção da solicitante.
  at(6, 13, 50);
  const mariana = find('23100764');
  await service.createRefund(seedRequesters.paula, {
    ra: mariana.ra,
    creditId: credit(mariana.ra).id,
    amount: credit(mariana.ra).originalAmount,
    lyceumConfirmed: true,
    payment: { method: 'transferencia', holderKind: 'responsavel', holderName: mariana.responsible.name, holderCpf: mariana.responsible.cpf, bankCode: '341', agency: '0412', account: '28814-3', accountType: 'corrente' },
  });

  // Rafael — crédito com devolução parcial anterior no Lyceum → Análise do Financeiro (decisão ao vivo).
  at(3, 9, 40);
  const rafael = find('21400133');
  const partial = credit(rafael.ra, 1);
  await service.createRefund(seedRequesters.silvia, {
    ra: rafael.ra,
    creditId: partial.id,
    amount: partial.originalAmount - partial.refunds.reduce((sum, r) => sum + r.amount, 0),
    lyceumConfirmed: true,
    payment: pix('aluno', rafael.ra, 'cpf', rafael.cpf),
  });

  await service.idle();
  const db = structuredClone(store.read());
  db.config = { lyceumRequestMode: 'manual', nextLyceumSyncFails: false, latencyMs };
  db.createdAt = now.toISOString();
  db.updatedAt = now.toISOString();
  return db;
}
