# Devoluções Financeiras · UniAnchieta

Demonstração funcional do fluxo ideal de devoluções: solicitação pelo RA com extrato do Lyceum, verificações automáticas, encaminhamento direto para Cobranças a Pagar, exceções do Financeiro, pagamento com comprovante, baixa no Lyceum, e-mails e link público do aluno.

> **Modo demonstração.** Todas as integrações (Lyceum, e-mail Outlook/Microsoft 365, pagamento, autenticação) são **simuladas** no navegador, com **dados inteiramente fictícios**. Nenhum e-mail é enviado, nenhum pagamento é feito e nenhum sistema real é consultado. Não use com dados reais.

## Como executar

Requer Node.js 20 ou superior.

```bash
cd app-interno
npm install
npm run dev        # http://localhost:3000
npm test           # testes dos fluxos (Vitest)
npm run build      # tsc + build de produção em app-interno/dist
```

| Página | Endereço (dev) |
|---|---|
| Interface interna (Solicitante, Financeiro, Cobranças a Pagar) | `http://localhost:3000/` |
| Link público do aluno | `http://localhost:3000/acompanhamento/#/r/<token>`. Copie o link pelo pedido (**Copiar**, **Abrir** ou **Prévia**). |

As duas páginas rodam no **mesmo servidor** e no **mesmo navegador**: o estado fica no `localStorage`, e os comprovantes ficam no IndexedDB. Por isso, abrir o link público em outro aparelho mostra "link não encontrado". Para demonstrar a versão mobile, use a **Prévia** (moldura de celular) ou o modo responsivo do navegador.

Não é preciso banco, credencial, Lyceum ou Outlook. Na primeira abertura, os exemplos são criados automaticamente. O estado sobrevive à atualização da página e é compartilhado entre abas. Se o modelo de dados mudar (`SCHEMA_VERSION`) ou se os dados salvos estiverem corrompidos, os exemplos são restaurados e um aviso aparece na tela.

## Roteiro de apresentação (5 minutos)

O mesmo roteiro está no app, em **Modo demonstração → Roteiro**. Troque de perfil pela alternância no topo.

1. **Solicitante (1 min).** Clique em **Nova solicitação** e informe o RA **24100318** (Ana). Mostre o extrato, o crédito em verde e a pergunta "já houve devolução no Lyceum?". Mostre também o crédito bloqueado do RA **21400133**. Use **Preencher dados fictícios**, marque a confirmação em vermelho e registre. As 9 verificações passam e o pedido vai **direto para Cobranças a Pagar**. O link individual é gerado.
2. **Financeiro (1 min).** O indicador "Valor em andamento total" aparece. Na visão de exceções, abra **Rafael** (devolução anterior no Lyceum): registre a decisão com justificativa e a declaração de que não é duplicidade, ou encerre sem pagamento. Na caixa de saída, só a solicitante recebe o e-mail de encerramento.
3. **Cobranças a Pagar (1 min).** Abra **Ana** → **Confirmar pagamento realizado**: data, **Anexar comprovante: Sim**, arquivo (há um PDF fictício para baixar no próprio formulário) e a declaração de execução conferida. A baixa no Lyceum é registrada.
4. **Aluno (1 min).** No pedido, clique em **Prévia** ou **Abrir**. A trilha aparece concluída e o comprovante está disponível. Não aparecem RA, CPF, chave Pix nem extrato.
5. **Exceções (1 min).** **Mariana**: como Solicitante, clique em **Corrigir e reenviar** (a dica da conta correta aparece no formulário) e o pedido segue direto. **Gustavo**: o pagamento está confirmado, mas a baixa no Lyceum ficou pendente; o Financeiro clica em **Tentar a baixa novamente**. Abra a **Caixa de saída**.

Para voltar ao início, use **Modo demonstração → Restaurar**. É preciso marcar a confirmação antes.

## Alunos fictícios

| RA | Aluno | Cenário |
|---|---|---|
| 24100318 | Ana Beatriz Moreira | Crédito elegível, Pix do responsável. Pronto para solicitar e seguir direto. |
| 23200457 | Carlos Eduardo Nunes | Transferência bancária, já em Aguardando pagamento, com prioridade alta pelo prazo. |
| 22300921 | Juliana Prado Siqueira | Crédito parcialmente utilizado: R$ 2.400,00 originais − R$ 950,00 compensados = R$ 1.450,00. Um valor maior gera "saldo insuficiente". |
| 21400133 | Rafael Augusto Teixeira | Um crédito já devolvido no Lyceum (seleção bloqueada) e outro com devolução parcial anterior, em Análise do Financeiro. |
| 23100764 | Mariana Costa Albuquerque | Titularidade da conta divergente → Correção solicitada. Conta correta: Itaú 341, ag. 0412, cc 28841-3. |
| 22200588 | Lucas Henrique Barros | Pago, com comprovante PDF e baixa no Lyceum. O link público aparece concluído. |
| 24300210 | Fernanda Rocha Lima | Conta de terceiro → Financeiro encerrou sem pagamento. O aluno não recebeu e-mail. |
| 21300845 | Gustavo Martins Freitas | Pago, mas a baixa no Lyceum falhou. A pendência aparece na fila. |

A chave de sandbox `divergente@pix.example` força a correção automática ao vivo. Os CPFs são números de teste com dígito verificador válido. Todos os e-mails usam domínios `.example`.

## Estrutura

```
app-interno/
  index.html, acompanhamento/index.html   páginas interna e pública (Vite multi-page)
  src/domain/      tipos, regras de verificação/encaminhamento, permissões, e-mails, projeção pública
  src/adapters/    contracts.ts (contratos p/ TI) + *.demo.ts (Lyceum, banco, e-mail, comprovantes, link público)
  src/services/    refundService.ts (papel da API: permissões, transições, histórico, outbox) + runtime.ts
  src/demo/        dados fictícios, montagem dos exemplos, persistência versionada, PDF fictício
  src/components/  telas (fila, solicitação, extrato, detalhe, ações, caixa de saída, controles)
  src/public/      página pública do aluno
  tests/           Vitest: fluxos principais, persistência, máscaras
acompanhamento-publico/   referência estática anterior (usa /api/lookup); a versão demonstrativa está em app-interno/acompanhamento
docs/                      VISAO_TI.md (proposta, contratos, pendências) e DESIGN_SYSTEM.md
```

Os contratos que a TI precisa implementar, o que é simulado e as decisões pendentes estão em [`docs/VISAO_TI.md`](docs/VISAO_TI.md).
