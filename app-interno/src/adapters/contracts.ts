// CONTRATOS DE INTEGRAÇÃO — o que a TI implementa para substituir a demonstração.
// Cada interface tem uma versão *.demo.ts neste diretório. O serviço (src/services/refundService.ts) só conhece
// estas interfaces; trocar a implementação não exige mudar regras de fluxo nem telas.
import type { BankValidationResult } from '../domain/checks';
import type { OutboxEmail, PaymentData, ProofMeta, StudentFinancialSnapshot } from '../domain/types';

export interface StudentSearchHit {
  ra: string;
  name: string;
  course: string;
  modality: string;
}

export type LyceumPaymentResult = { ok: true; reference: string; at: string } | { ok: false; error: string };

/**
 * Lyceum. Produção: API/serviço autorizado (ou views/tabelas liberadas) com credencial de serviço.
 * - RA → cadastro, responsável financeiro, cobranças e créditos com identificador único.
 * - Registro da solicitação na aba de devolução (substitui a confirmação manual, quando existir).
 * - Baixa da devolução após o pagamento, com referência de retorno.
 */
export interface LyceumGateway {
  searchStudents(query: string): Promise<StudentSearchHit[]>;
  getFinancialSnapshot(ra: string): Promise<StudentFinancialSnapshot>;
  registerRefundRequest(input: { ra: string; creditId: string; amount: number; protocol: string }): Promise<{ reference: string }>;
  registerRefundPayment(input: { ra: string; creditId: string; amount: number; paidAt: string; protocol: string; refundId: string }): Promise<LyceumPaymentResult>;
  /** Produção: confere no Lyceum se a referência informada existe. Demonstração: grava a referência no Lyceum simulado. */
  confirmManualRefund(input: { ra: string; creditId: string; amount: number; date: string; reference: string; refundId: string }): Promise<void>;
}

/** Pré-validação de titularidade (DICT para Pix, serviço do banco pagador para contas). */
export interface BankValidator {
  validate(payment: PaymentData): Promise<BankValidationResult>;
}

/**
 * Despacho de e-mail. Produção: Microsoft Graph (POST /users/{caixa-institucional}/sendMail) ou conector
 * Exchange Online aprovado, lendo a caixa de saída persistida, com reenvio e registro de falha.
 */
export interface MailGateway {
  dispatch(email: OutboxEmail): Promise<{ state: OutboxEmail['state'] }>;
}

/** Armazenamento de comprovantes. Produção: storage privado com URL assinada de curta duração e retenção definida. */
export interface ProofStorage {
  put(file: Blob, meta: ProofMeta): Promise<void>;
  get(id: string): Promise<Blob | null>;
  clear(): Promise<void>;
  /** false quando o navegador não oferece IndexedDB — o comprovante não sobrevive à atualização da página. */
  readonly durable: boolean;
}
