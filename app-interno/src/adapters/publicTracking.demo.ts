// Leitura da página pública na demonstração: só a chave com as projeções mínimas (nunca o banco interno).
// Produção: GET/POST /api/public/tracking com o token no corpo; o servidor compara o hash, aplica limite de
// tentativas, respeita revogação/expiração e devolve apenas PublicTrackingView. O comprovante sai por URL assinada.
import type { PublicTrackingView } from '../domain/publicView';
import { TRACKING_TOKEN_PATTERN } from '../lib/ids';

export const PUBLIC_KEY = 'devolucoes.demo.public';

export interface PublicIndexPayload {
  v: 1;
  updatedAt: string;
  views: Record<string, PublicTrackingView>;
}

export type LookupResult = { status: 'ok'; view: PublicTrackingView } | { status: 'invalid' } | { status: 'not_found' } | { status: 'unavailable' };

export function lookupPublicView(token: string | undefined, storage: Pick<Storage, 'getItem'> = localStorage): LookupResult {
  if (!token || !TRACKING_TOKEN_PATTERN.test(token)) return { status: 'invalid' };
  try {
    const raw = storage.getItem(PUBLIC_KEY);
    if (!raw) return { status: 'unavailable' };
    const payload = JSON.parse(raw) as PublicIndexPayload;
    const view = payload.v === 1 ? payload.views?.[token] : undefined;
    return view ? { status: 'ok', view } : { status: 'not_found' };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Atualiza a página quando outra aba (a interface interna) grava uma nova projeção. */
export function onPublicIndexChange(listener: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === PUBLIC_KEY) listener();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export const trackingPath = (token: string) => `/acompanhamento/#/r/${token}`;
