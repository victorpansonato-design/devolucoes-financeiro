// Identificadores aleatórios. Usa crypto.getRandomValues (disponível também fora de contexto seguro,
// ao contrário de crypto.randomUUID), para a demonstração funcionar quando aberta pelo IP da rede local.

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomId(prefix = '') {
  const hex = [...randomBytes(8)].map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix ? `${prefix}_${hex}` : hex;
}

/** Dígitos aleatórios — referências fictícias do Lyceum e do banco. */
export function randomDigits(length: number) {
  return [...randomBytes(length)].map(b => String(b % 10)).join('');
}

/**
 * Token do link individual: 32 bytes aleatórios em base64url (43 caracteres), não sequencial.
 * DEMONSTRAÇÃO: em produção o token é gerado e validado pelo servidor, que guarda apenas o hash.
 */
export function trackingToken() {
  const binary = String.fromCharCode(...randomBytes(32));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
