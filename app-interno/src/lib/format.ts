// Formatação única para a interface interna, a página pública e os e-mails simulados.
// Valores monetários trafegam sempre em centavos (inteiros) para evitar erro de ponto flutuante.

export const TIMEZONE = 'America/Sao_Paulo';

const moneyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const plainMoneyFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 1.234,56" — o Intl usa espaço não separável entre o símbolo e o valor. */
export const money = (cents: number) => moneyFormat.format(cents / 100);

/** "1.234,56" — para campos de formulário. */
export const moneyInput = (cents: number) => plainMoneyFormat.format(cents / 100);

/** Converte "1.234,56", "1234,56" ou "1234.56" em centavos. Retorna null quando inválido. */
export function parseMoney(input: string): number | null {
  const raw = input.trim().replace(/^R\$\s*/, '');
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

const asDate = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00Z` : value);

export const date = (value?: string) =>
  value ? new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE }).format(asDate(value)) : '—';

export const dateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TIMEZONE }).format(asDate(value))
    : '—';

/** Data civil (YYYY-MM-DD) no fuso institucional. */
export const civilDate = (at: Date | string = new Date()) =>
  (typeof at === 'string' ? asDate(at) : at).toLocaleDateString('en-CA', { timeZone: TIMEZONE });

/** "2026-08" → "08/2026" */
export const competence = (value: string) => {
  const [year, month] = value.split('-');
  return `${month}/${year}`;
};

const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(part => part && !CONNECTORS.has(part.toLowerCase()))
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Dias úteis (segunda a sexta) entre duas datas. Feriados dependem do calendário institucional. */
export function businessDays(start: string, end: Date | string = new Date()) {
  const from = asDate(`${civilDate(start)}`);
  const to = asDate(`${civilDate(end)}`);
  let count = 0;
  while (from < to) {
    from.setUTCDate(from.getUTCDate() + 1);
    const day = from.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const fileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
