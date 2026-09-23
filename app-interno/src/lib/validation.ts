// Validações de formato. São repetidas pelo serviço (regra "dados_pagamento"), como o servidor deverá fazer:
// o formulário ajuda quem digita, mas não é a fonte de verdade.

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export const formatCpf = (value: string) => {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export type PixKeyType = 'cpf' | 'email' | 'telefone' | 'aleatoria';

export const pixKeyTypes: { id: PixKeyType; label: string; placeholder: string }[] = [
  { id: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { id: 'email', label: 'E-mail', placeholder: 'nome@provedor.example' },
  { id: 'telefone', label: 'Telefone', placeholder: '+55 (11) 91234-5678' },
  { id: 'aleatoria', label: 'Chave aleatória', placeholder: '123e4567-e89b-42d3-a456-426614174000' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePixKey(type: PixKeyType, key: string) {
  const value = key.trim();
  if (type === 'cpf') return formatCpf(value);
  if (type === 'email') return value.toLowerCase();
  if (type === 'telefone') {
    const digits = onlyDigits(value);
    return `+${digits.length <= 11 ? `55${digits}` : digits}`;
  }
  return value.toLowerCase();
}

/** Retorna a mensagem de erro, ou null quando a chave é válida para o tipo escolhido. */
export function pixKeyError(type: PixKeyType, key: string): string | null {
  const value = key.trim();
  if (!value) return 'Informe a chave Pix.';
  if (type === 'cpf') return isValidCpf(value) ? null : 'CPF inválido. Confira os dígitos.';
  if (type === 'email') return EMAIL.test(value) ? null : 'E-mail em formato inválido.';
  if (type === 'telefone') {
    const digits = onlyDigits(normalizePixKey('telefone', value));
    return /^55[1-9]{2}9?\d{8}$/.test(digits) ? null : 'Telefone deve ter DDD e número, por exemplo +55 (11) 91234-5678.';
  }
  return UUID.test(value) ? null : 'Chave aleatória deve ter o formato 8-4-4-4-12 (36 caracteres).';
}

export const banks = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '260', name: 'Nu Pagamentos' },
  { code: '077', name: 'Banco Inter' },
  { code: '756', name: 'Sicoob' },
] as const;

export const bankName = (code?: string) => banks.find(b => b.code === code)?.name ?? '';

export const agencyError = (value: string) =>
  /^\d{4}(-\d)?$/.test(value.trim()) ? null : 'Agência com 4 dígitos (dígito opcional após hífen).';

export const accountError = (value: string) =>
  /^\d{3,12}-[\dXx]$/.test(value.trim()) ? null : 'Conta com dígito, separados por hífen. Ex.: 12345-6.';

export const emailError = (value: string) => (EMAIL.test(value.trim()) ? null : 'E-mail em formato inválido.');

export const nameError = (value: string) =>
  value.trim().split(/\s+/).length >= 2 ? null : 'Informe nome e sobrenome do titular.';
