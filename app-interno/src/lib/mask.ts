// Mascaramento para e-mails, listas e perfis que não executam o pagamento.
// Regra: nenhum texto gerado pelo sistema expõe chave Pix completa, CPF completo ou conta completa.
import { onlyDigits, type PixKeyType } from './validation';

export const maskCpf = (cpf: string) => {
  const d = onlyDigits(cpf);
  return d.length === 11 ? `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••` : '•••';
};

export function maskPixKey(type: PixKeyType | undefined, key = '') {
  if (!key) return '—';
  if (type === 'cpf') return maskCpf(key);
  if (type === 'email') {
    const [user = '', domain = ''] = key.split('@');
    return `${user.slice(0, 1)}•••@${domain}`;
  }
  if (type === 'telefone') {
    const d = onlyDigits(key);
    return `+55 (${d.slice(2, 4)}) •••••-${d.slice(-4)}`;
  }
  return `•••• ${key.slice(-4)}`;
}

/** Mantém apenas os dois últimos dígitos e o verificador: "•••45-6". */
export const maskAccount = (account = '') => {
  const [number = '', digit = ''] = account.split('-');
  return `•••${number.slice(-2)}${digit ? `-${digit}` : ''}`;
};

export const maskAgency = (agency = '') => `••${agency.replace(/-.*/, '').slice(-2)}`;
