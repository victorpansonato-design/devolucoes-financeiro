import { describe, expect, it } from 'vitest';
import { lookupPublicView, PUBLIC_KEY } from '../src/adapters/publicTracking.demo';
import { createPersistentStore, DB_KEY, loadPersisted, SCHEMA_VERSION, type StorageLike } from '../src/demo/store';
import { maskAccount, maskCpf, maskPixKey } from '../src/lib/mask';
import { parseMoney } from '../src/lib/format';
import { setup } from './helpers';

const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: k => void data.delete(k) };
};

describe('persistência da demonstração', () => {
  it('grava, recarrega e publica só a projeção mínima', async () => {
    const { store } = await setup();
    const storage = memoryStorage();
    const persistent = createPersistentStore(storage, store.read());
    persistent.commit(store.read());
    const loaded = loadPersisted(storage);
    expect(loaded.status).toBe('ok');
    const token = store.read().refunds[0]!.tracking.token;
    const result = lookupPublicView(token, storage);
    expect(result.status).toBe('ok');
    const publicRaw = storage.getItem(PUBLIC_KEY)!;
    expect(publicRaw).not.toContain('"ra"');
    expect(publicRaw).not.toContain('pixKey');
    expect(publicRaw).not.toContain('holderCpf');
    expect(lookupPublicView('curto', storage).status).toBe('invalid');
    expect(lookupPublicView('A'.repeat(43), storage).status).toBe('not_found');
  });

  it('detecta dados antigos ou corrompidos', () => {
    const storage = memoryStorage();
    expect(loadPersisted(storage).status).toBe('missing');
    storage.setItem(DB_KEY, '{quebrado');
    expect(loadPersisted(storage).status).toBe('corrupt');
    storage.setItem(DB_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION - 1 + 100, db: {} }));
    expect(loadPersisted(storage).status).toBe('outdated');
    storage.setItem(DB_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, db: { refunds: 'x' } }));
    expect(loadPersisted(storage).status).toBe('corrupt');
  });
});

describe('máscaras e valores', () => {
  it('nunca mostra dados completos', () => {
    expect(maskCpf('123.456.789-09')).toBe('•••.456.789-••');
    expect(maskPixKey('email', 'claudia.moreira@familia.example')).toBe('c•••@familia.example');
    expect(maskAccount('28841-3')).toBe('•••41-3');
    expect(parseMoney('1.234,56')).toBe(123456);
    expect(parseMoney('abc')).toBeNull();
  });
});
