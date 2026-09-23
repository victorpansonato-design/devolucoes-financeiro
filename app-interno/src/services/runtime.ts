// Monta a demonstração no navegador: store persistente, adaptadores simulados e serviço.
// É o único ponto que a TI troca para apontar a interface para a API real.
import { useSyncExternalStore } from 'react';
import { createDemoBankValidator } from '../adapters/bank.demo';
import type { ProofStorage } from '../adapters/contracts';
import { createDemoLyceum } from '../adapters/lyceum.demo';
import { createDemoMail } from '../adapters/mail.demo';
import { createBrowserProofStorage } from '../adapters/proofStorage.demo';
import { trackingPath } from '../adapters/publicTracking.demo';
import { buildSeedDatabase } from '../demo/seed';
import { clearLegacy, createMemoryStore, createPersistentStore, loadPersisted, type DemoStore } from '../demo/store';
import type { DemoDatabase } from '../domain/types';
import { createRefundService, type RefundService } from './refundService';

export interface Runtime {
  store: DemoStore;
  service: RefundService;
  proofs: ProofStorage;
  persistent: boolean;
  notice?: string;
  reset(): Promise<void>;
}

const origin = () => window.location.origin;
export const links = {
  tracking: (token: string) => `${origin()}${trackingPath(token)}`,
  internal: (id: string) => `${origin()}/#/pedido/${id}`,
};

function browserStorage(): Storage | null {
  try {
    const probe = '__devolucoes_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export async function initRuntime(): Promise<Runtime> {
  const proofs = await createBrowserProofStorage();
  const storage = browserStorage();
  let notice: string | undefined;
  let db: DemoDatabase;
  let seeded = false;

  const loaded = storage ? loadPersisted(storage) : ({ status: 'missing' } as const);
  if (storage) clearLegacy(storage);
  if (loaded.status === 'ok') db = loaded.db;
  else {
    await proofs.clear();
    db = await buildSeedDatabase({ proofs, links });
    seeded = true;
    if (loaded.status === 'outdated') notice = 'Os dados de demonstração eram de uma versão anterior do modelo e foram restaurados para os exemplos atuais.';
    if (loaded.status === 'corrupt') notice = 'Os dados de demonstração salvos estavam inválidos e foram restaurados para os exemplos.';
  }
  if (!storage) notice = 'O navegador bloqueou o armazenamento local: a demonstração funciona, mas as alterações se perdem ao atualizar a página.';

  const store = storage ? createPersistentStore(storage, db, window) : createMemoryStore(db);
  if (seeded) store.commit(db);

  const service = createRefundService({
    store,
    lyceum: createDemoLyceum(store),
    bank: createDemoBankValidator(() => store.read().config.latencyMs / 2),
    mail: createDemoMail(),
    proofs,
    clock: () => new Date(),
    links,
  });

  return {
    store,
    service,
    proofs,
    persistent: !!storage,
    notice,
    async reset() {
      await service.idle();
      await proofs.clear();
      store.commit(await buildSeedDatabase({ proofs, links }));
    },
  };
}

export function useDatabase(store: DemoStore) {
  return useSyncExternalStore(store.subscribe, store.read, store.read);
}
