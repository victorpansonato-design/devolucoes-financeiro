// SIMULAÇÃO do Lyceum sobre o banco local da demonstração. Não consulta nenhum sistema real.
import { randomDigits } from '../lib/ids';
import type { DemoStore } from '../demo/store';
import type { LyceumGateway } from './contracts';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export const wait = (ms: number) => (ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve());

export function createDemoLyceum(store: DemoStore, clock: () => Date = () => new Date()): LyceumGateway {
  const latency = () => wait(store.read().config.latencyMs);
  const year = () => clock().getFullYear();

  return {
    async searchStudents(query) {
      await latency();
      const q = normalize(query);
      if (!q) return [];
      const digits = q.replace(/\D/g, '');
      return store
        .read()
        .lyceum.students.filter(s => (digits && digits === q ? s.ra.startsWith(digits) : normalize(s.name).includes(q)))
        .slice(0, 8)
        .map(s => ({ ra: s.ra, name: s.name, course: s.course, modality: s.modality }));
    },

    async getFinancialSnapshot(ra) {
      await latency();
      const { lyceum } = store.read();
      const student = lyceum.students.find(s => s.ra === ra.trim());
      if (!student) throw new Error(`RA ${ra} não encontrado no Lyceum (simulado).`);
      return structuredClone({
        student,
        charges: lyceum.charges[student.ra] ?? [],
        credits: lyceum.credits[student.ra] ?? [],
        fetchedAt: clock().toISOString(),
      });
    },

    async registerRefundRequest() {
      await latency();
      return { reference: `LYC-SOL-${year()}-${randomDigits(5)}` };
    },

    async registerRefundPayment({ ra, creditId, amount, paidAt, refundId }) {
      await latency();
      const db = structuredClone(store.read());
      if (db.config.nextLyceumSyncFails) {
        db.config.nextLyceumSyncFails = false;
        store.commit(db);
        return { ok: false, error: 'Tempo de resposta excedido ao gravar a baixa (indisponibilidade simulada do Lyceum).' };
      }
      const credit = db.lyceum.credits[ra]?.find(c => c.id === creditId);
      if (!credit) return { ok: false, error: `Crédito ${creditId} não encontrado para o RA ${ra}.` };
      const reference = `LYC-DV-${year()}-${randomDigits(5)}`;
      credit.refunds.push({ reference, date: paidAt, amount, source: 'devolucoes', refundId });
      store.commit(db);
      return { ok: true, reference, at: clock().toISOString() };
    },

    async confirmManualRefund({ ra, creditId, amount, date, reference, refundId }) {
      await latency();
      const db = structuredClone(store.read());
      const credit = db.lyceum.credits[ra]?.find(c => c.id === creditId);
      if (!credit) throw new Error(`Crédito ${creditId} não encontrado para o RA ${ra}.`);
      if (!credit.refunds.some(r => r.refundId === refundId)) credit.refunds.push({ reference, date, amount, source: 'lyceum', refundId });
      store.commit(db);
    },
  };
}
