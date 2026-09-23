// Comprovantes da demonstração. IndexedDB guarda o arquivo no próprio navegador (sobrevive à atualização);
// sem IndexedDB, cai para memória e avisa. A página pública lê daqui só o id que a projeção expõe após o pagamento.
import type { ProofMeta } from '../domain/types';
import type { ProofStorage } from './contracts';

const DB_NAME = 'devolucoes-demo';
const STORE = 'proofs';

export function createMemoryProofStorage(): ProofStorage {
  const files = new Map<string, Blob>();
  return {
    durable: false,
    async put(file, meta) {
      files.set(meta.id, file);
    },
    async get(id) {
      return files.get(id) ?? null;
    },
    async clear() {
      files.clear();
    },
  };
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? request.error);
        };
      }),
  );
}

export async function createBrowserProofStorage(): Promise<ProofStorage> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB indisponível');
    (await open()).close();
  } catch {
    return createMemoryProofStorage();
  }
  return {
    durable: true,
    async put(file: Blob, meta: ProofMeta) {
      await run('readwrite', store => store.put({ meta, file }, meta.id));
    },
    async get(id: string) {
      const record = await run<{ meta: ProofMeta; file: Blob } | undefined>('readonly', store => store.get(id));
      return record?.file ?? null;
    },
    async clear() {
      await run('readwrite', store => store.clear());
    },
  };
}
