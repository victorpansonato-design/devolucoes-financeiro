import { createDemoBankValidator } from '../src/adapters/bank.demo';
import { createDemoLyceum } from '../src/adapters/lyceum.demo';
import { createDemoMail } from '../src/adapters/mail.demo';
import { createMemoryProofStorage } from '../src/adapters/proofStorage.demo';
import { buildSeedDatabase } from '../src/demo/seed';
import { createMemoryStore } from '../src/demo/store';
import { createRefundService } from '../src/services/refundService';

export const links = { tracking: (t: string) => `http://localhost:3000/acompanhamento/#/r/${t}`, internal: (id: string) => `http://localhost:3000/#/pedido/${id}` };

export async function setup(now = new Date('2026-09-23T13:00:00Z')) {
  const proofs = createMemoryProofStorage();
  const db = await buildSeedDatabase({ proofs, links, now, latencyMs: 0 });
  const store = createMemoryStore(db);
  const service = createRefundService({ store, lyceum: createDemoLyceum(store, () => now), bank: createDemoBankValidator(), mail: createDemoMail(), proofs, clock: () => now, links });
  const byRa = (ra: string) => store.read().refunds.find(r => r.student.ra === ra)!;
  return { store, service, proofs, byRa };
}
