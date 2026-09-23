// Persistência da demonstração: um único documento versionado no localStorage + as projeções públicas numa
// chave separada. Ao mudar o modelo, suba SCHEMA_VERSION e escreva a migração; sem migração, os exemplos são
// restaurados e a interface avisa. Nada aqui existe em produção — a TI substitui por API + banco.
import { buildPublicIndex } from '../domain/publicView';
import type { DemoDatabase } from '../domain/types';
import { PUBLIC_KEY, type PublicIndexPayload } from '../adapters/publicTracking.demo';

export const DB_KEY = 'devolucoes.demo.db';
export const SCHEMA_VERSION = 1;

/** Chaves de protótipos anteriores que não devem mais ser lidas. */
const LEGACY_KEYS = ['devolucoes.v1.refunds', 'devolucoes.demo.v0'];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DemoStore {
  read(): DemoDatabase;
  commit(db: DemoDatabase): void;
  subscribe(listener: () => void): () => void;
}

interface Envelope {
  schemaVersion: number;
  savedAt: string;
  db: DemoDatabase;
}

export type LoadResult =
  | { status: 'ok'; db: DemoDatabase }
  | { status: 'missing' }
  | { status: 'outdated'; foundVersion: number }
  | { status: 'corrupt' };

/** Migrações por versão de origem. Ex.: 1: db => ({ ...db, novoCampo: padrão, schemaVersion: 2 }). */
const migrations: Record<number, (db: DemoDatabase) => DemoDatabase> = {};

export function isDemoDatabase(value: unknown): value is DemoDatabase {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<DemoDatabase>;
  return (
    typeof db.schemaVersion === 'number' &&
    typeof db.protocolSeq === 'number' &&
    Array.isArray(db.refunds) &&
    Array.isArray(db.outbox) &&
    !!db.config &&
    !!db.lyceum &&
    Array.isArray(db.lyceum.students) &&
    db.refunds.every(r => r && typeof r.id === 'string' && typeof r.status === 'string' && Array.isArray(r.history) && !!r.tracking?.token)
  );
}

export function loadPersisted(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(DB_KEY);
  } catch {
    return { status: 'missing' };
  }
  if (!raw) return { status: 'missing' };
  let envelope: Partial<Envelope>;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return { status: 'corrupt' };
  }
  let db = envelope?.db;
  let version = typeof envelope?.schemaVersion === 'number' ? envelope.schemaVersion : -1;
  if (!db || version < 0) return { status: 'corrupt' };
  while (version < SCHEMA_VERSION && migrations[version]) {
    db = migrations[version]!(db);
    version++;
  }
  if (version !== SCHEMA_VERSION) return { status: 'outdated', foundVersion: envelope.schemaVersion as number };
  return isDemoDatabase(db) ? { status: 'ok', db: { ...db, schemaVersion: SCHEMA_VERSION } } : { status: 'corrupt' };
}

export function persist(storage: StorageLike, db: DemoDatabase) {
  const savedAt = new Date().toISOString();
  const envelope: Envelope = { schemaVersion: SCHEMA_VERSION, savedAt, db };
  const publicIndex: PublicIndexPayload = { v: 1, updatedAt: savedAt, views: buildPublicIndex(db.refunds) };
  try {
    storage.setItem(DB_KEY, JSON.stringify(envelope));
    storage.setItem(PUBLIC_KEY, JSON.stringify(publicIndex));
  } catch {
    throw new Error('Não foi possível salvar no armazenamento local do navegador (espaço cheio ou bloqueado). Restaure os exemplos ou libere espaço.');
  }
}

export function clearLegacy(storage: StorageLike) {
  for (const key of LEGACY_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* armazenamento indisponível */
    }
  }
}

export function createMemoryStore(initial: DemoDatabase): DemoStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    read: () => current,
    commit(db) {
      current = { ...db, updatedAt: new Date().toISOString() };
      listeners.forEach(l => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Store do navegador: grava a cada commit e acompanha alterações feitas em outras abas. */
export function createPersistentStore(storage: StorageLike, initial: DemoDatabase, target: Pick<Window, 'addEventListener'> | null = null): DemoStore {
  let current = initial;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(l => l());

  target?.addEventListener('storage', event => {
    const e = event as StorageEvent;
    if (e.key !== DB_KEY || !e.newValue) return;
    const loaded = loadPersisted(storage);
    if (loaded.status === 'ok') {
      current = loaded.db;
      notify();
    }
  });

  return {
    read: () => current,
    commit(db) {
      const next = { ...db, updatedAt: new Date().toISOString() };
      persist(storage, next);
      current = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
