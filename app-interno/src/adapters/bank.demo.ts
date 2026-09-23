// SIMULAÇÃO de pré-validação bancária (DICT para Pix; titularidade de conta para transferência).
// Só as chaves e contas do diretório fictício geram veredito; o resto passa "sem registro".
import { bankDirectory } from '../demo/seedData';
import { onlyDigits, normalizePixKey } from '../lib/validation';
import type { BankValidator } from './contracts';
import { wait } from './lyceum.demo';

export function createDemoBankValidator(latencyMs: () => number = () => 0): BankValidator {
  return {
    async validate(payment) {
      await wait(latencyMs());
      const cpf = onlyDigits(payment.holderCpf);
      if (payment.method === 'pix') {
        const key = payment.pixKeyType ? normalizePixKey(payment.pixKeyType, payment.pixKey ?? '') : '';
        const entry = bankDirectory.pixKeys.find(k => k.key === key);
        if (!entry) return { status: 'sem_registro', detail: 'Chave sem restrição no diretório simulado. Em produção: consulta ao DICT pelo PSP da instituição.' };
        return onlyDigits(entry.holderCpf) === cpf
          ? { status: 'confirmada', detail: 'Chave localizada no DICT simulado; o titular confere com o CPF informado.' }
          : { status: 'divergente', detail: 'A chave Pix pertence a outro CPF (consulta DICT simulada). Confirme a chave com o aluno ou responsável.' };
      }
      const entry = bankDirectory.accounts.find(a => a.bankCode === payment.bankCode && a.agency === payment.agency?.trim() && a.account === payment.account?.trim());
      if (!entry) return { status: 'sem_registro', detail: 'Conta sem restrição no diretório simulado. Em produção: validação de titularidade no banco pagador.' };
      return onlyDigits(entry.holderCpf) === cpf
        ? { status: 'confirmada', detail: 'Conta localizada na pré-validação simulada; o titular confere com o CPF informado.' }
        : { status: 'divergente', detail: 'Titularidade da conta não confere com o CPF informado (pré-validação simulada). Confirme agência, conta e dígito.' };
    },
  };
}
