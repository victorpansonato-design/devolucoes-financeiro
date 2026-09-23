// SIMULAÇÃO de envio. Nenhuma mensagem sai do navegador: o registro na caixa de saída é o próprio resultado.
import type { MailGateway } from './contracts';

export function createDemoMail(): MailGateway {
  return {
    async dispatch() {
      return { state: 'simulado' };
    },
  };
}
