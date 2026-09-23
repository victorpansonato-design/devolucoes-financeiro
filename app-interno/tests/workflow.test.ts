import { describe, expect, it } from 'vitest';
import { creditBalance, creditEligibility } from '../src/domain/credit';
import { demoProfiles } from '../src/domain/profiles';
import { buildPublicIndex, publicSteps, toPublicView } from '../src/domain/publicView';
import { isOpen, responsibility } from '../src/domain/status';
import type { PaymentData } from '../src/domain/types';
import { demoProofBlob } from '../src/demo/demoPdf';
import { students } from '../src/demo/seedData';
import { setup } from './helpers';

const [solicitante, financeiro, pagamentos] = demoProfiles as [typeof demoProfiles[0], typeof demoProfiles[1], typeof demoProfiles[2]];
const ana = students.find(s => s.ra === '24100318')!;
const anaPix: PaymentData = { method: 'pix', holderKind: 'responsavel', holderName: ana.responsible.name, holderCpf: ana.responsible.cpf, pixKeyType: 'email', pixKey: 'claudia.moreira@familia.example' };

describe('exemplos de demonstração', () => {
  it('cria os cenários coerentes', async () => {
    const { store, byRa } = await setup();
    const db = store.read();
    expect(db.lyceum.students.length).toBeGreaterThanOrEqual(6);
    expect(byRa('23200457').status).toBe('aguardando_pagamento');
    expect(byRa('22200588').status).toBe('pago');
    expect(byRa('22200588').paymentRecord?.proof?.type).toBe('application/pdf');
    expect(byRa('22200588').lyceumSync?.status).toBe('sincronizado');
    expect(byRa('21300845').lyceumSync?.status).toBe('falhou');
    expect(isOpen(byRa('21300845'))).toBe(true);
    expect(byRa('24300210').status).toBe('encerrado');
    expect(byRa('23100764').status).toBe('correcao');
    expect(byRa('21400133').status).toBe('analise_financeiro');
    expect(db.lyceum.students.every(s => s.email.endsWith('.example') && s.responsible.email.endsWith('.example'))).toBe(true);
  });

  it('crédito parcialmente utilizado mostra saldo inferior ao original', async () => {
    const { store } = await setup();
    const credit = store.read().lyceum.credits['22300921']![0]!;
    const balance = creditBalance(credit);
    expect(balance.original).toBe(240000);
    expect(balance.used).toBe(95000);
    expect(balance.available).toBe(145000);
    expect(balance.situation).toBe('parcialmente_utilizado');
  });
});

describe('solicitação → encaminhamento direto → pagamento com comprovante → link público', () => {
  it('percorre o fluxo feliz', async () => {
    const { store, service } = await setup();
    const credit = store.read().lyceum.credits[ana.ra]![0]!;
    const created = await service.createRefund(solicitante, { ra: ana.ra, creditId: credit.id, amount: credit.originalAmount, payment: anaPix, lyceumConfirmed: true });
    expect(created.status).toBe('aguardando_pagamento');
    expect(created.checkRuns[0]!.decision.rule).toBe('encaminhamento_direto');
    expect(created.checkRuns[0]!.results.every(c => c.outcome === 'aprovada')).toBe(true);
    expect(responsibility(created).sector).toBe('Cobranças a Pagar');
    expect(created.tracking.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Antes do pagamento, a projeção pública não tem comprovante.
    expect(toPublicView(created).proof).toBeUndefined();
    expect(toPublicView(created).stage).toBe('aguardando_pagamento');

    // Agendar não marca como pago.
    const scheduled = await service.schedulePayment(pagamentos, created.id, created.version, '2026-09-25');
    expect(scheduled.status).toBe('aguardando_pagamento');

    await expect(service.confirmPayment(pagamentos, created.id, scheduled.version, { paidAt: '2026-09-23', executedAndVerified: false, attachProof: false })).rejects.toThrow(/executado e conferido/);
    await expect(service.confirmPayment(solicitante, created.id, scheduled.version, { paidAt: '2026-09-23', executedAndVerified: true, attachProof: false })).rejects.toThrow(/Cobranças a Pagar/);
    await expect(service.confirmPayment(pagamentos, created.id, scheduled.version, { paidAt: '2026-09-23', executedAndVerified: true, attachProof: true })).rejects.toThrow(/arquivo/);
    await expect(
      service.confirmPayment(pagamentos, created.id, scheduled.version, { paidAt: '2026-09-23', executedAndVerified: true, attachProof: true, file: { blob: new Blob(['texto']), name: 'x.pdf' } }),
    ).rejects.toThrow(/não corresponde/);

    const blob = demoProofBlob({ title: 'Teste', lines: [['Valor', 'R$ 1,00']] });
    const paid = await service.confirmPayment(pagamentos, created.id, scheduled.version, { paidAt: '2026-09-23', executedAndVerified: true, attachProof: true, file: { blob, name: 'comprovante.pdf' } });
    expect(paid.status).toBe('pago');
    await service.idle();
    const final = store.read().refunds.find(r => r.id === created.id)!;
    expect(final.lyceumSync?.status).toBe('sincronizado');
    expect(final.lyceumSync?.reference).toMatch(/^LYC-DV-/);

    // Lyceum simulado passa a mostrar a devolução: nova solicitação para o mesmo crédito é bloqueada.
    const lyceumCredit = store.read().lyceum.credits[ana.ra]![0]!;
    expect(creditEligibility(lyceumCredit, store.read().refunds).selectable).toBe(false);

    const view = buildPublicIndex(store.read().refunds)[final.tracking.token]!;
    expect(view.stage).toBe('pago');
    expect(view.proof?.name).toBe('comprovante.pdf');
    expect(publicSteps(view).map(s => s.state)).toEqual(['done', 'done', 'done', 'done']);
    const serialized = JSON.stringify(view);
    for (const secret of [ana.ra, ana.responsible.cpf, 'claudia.moreira@familia.example', credit.id]) expect(serialized).not.toContain(secret);

    const emails = store.read().outbox.filter(e => e.refundId === created.id);
    expect(emails.map(e => e.trigger).sort()).toEqual(['pagamento_aluno', 'pagamento_colaborador']);
    const student = emails.find(e => e.trigger === 'pagamento_aluno')!;
    expect(student.to.map(t => t.kind)).toEqual(['aluno', 'responsavel']);
    expect(student.body).toContain(final.tracking.token);
    for (const e of emails) {
      expect(e.body).not.toContain('claudia.moreira@familia.example');
      expect(e.body).not.toContain(ana.responsible.cpf);
      expect(e.state).toBe('simulado');
    }
  });
});

describe('exceção → correção → reenvio', () => {
  it('corrige a conta e segue direto para pagamento', async () => {
    const { store, service, byRa } = await setup();
    const r = byRa('23100764');
    expect(r.checkRuns[0]!.results.find(c => c.id === 'validacao_bancaria')!.outcome).toBe('reprovada');
    expect(store.read().outbox.some(e => e.refundId === r.id && e.trigger === 'correcao_solicitada' && e.to[0]!.kind === 'colaborador')).toBe(true);
    await expect(service.resubmit(financeiro, r.id, r.version, { amount: r.amount, payment: r.payment })).rejects.toThrow(/Solicitante/);
    const fixed = await service.resubmit(solicitante, r.id, r.version, { amount: r.amount, payment: { ...r.payment, account: '28841-3' } });
    expect(fixed.status).toBe('aguardando_pagamento');
    expect(fixed.history.some(h => h.kind === 'reenvio')).toBe(true);
    await expect(service.resubmit(solicitante, r.id, r.version, { amount: r.amount, payment: r.payment })).rejects.toThrow();
  });

  it('saldo insuficiente vai ao Financeiro, que ajusta o valor com justificativa', async () => {
    const { store, service } = await setup();
    const juliana = students.find(s => s.ra === '22300921')!;
    const credit = store.read().lyceum.credits[juliana.ra]![0]!;
    const created = await service.createRefund(solicitante, {
      ra: juliana.ra, creditId: credit.id, amount: 240000, lyceumConfirmed: true,
      payment: { method: 'pix', holderKind: 'responsavel', holderName: juliana.responsible.name, holderCpf: juliana.responsible.cpf, pixKeyType: 'telefone', pixKey: '+55 (11) 98765-0921' },
    });
    expect(created.status).toBe('analise_financeiro');
    await expect(service.forwardException(financeiro, created.id, created.version, { justification: 'Conferido no Lyceum pelo Financeiro.', duplicityReviewed: false })).rejects.toThrow(/Não é possível encaminhar/);
    const forwarded = await service.forwardException(financeiro, created.id, created.version, { justification: 'Valor ajustado ao saldo devolvível conferido no Lyceum.', adjustedAmount: 145000, duplicityReviewed: false });
    expect(forwarded.status).toBe('aguardando_pagamento');
    expect(forwarded.amount).toBe(145000);
    expect(forwarded.decisions.at(-1)!.adjustedAmount).toBe(145000);
  });
});

describe('duplicidade', () => {
  it('bloqueia crédito já devolvido no Lyceum', async () => {
    const { store, service } = await setup();
    const blocked = store.read().lyceum.credits['21400133']![0]!;
    expect(creditEligibility(blocked, store.read().refunds).selectable).toBe(false);
    await expect(service.createRefund(solicitante, { ra: '21400133', creditId: blocked.id, amount: 1000, payment: anaPix, lyceumConfirmed: true })).rejects.toThrow(/bloqueada/);
  });

  it('não permite encaminhar devolução anterior sem registrar a decisão', async () => {
    const { service, byRa } = await setup();
    const r = byRa('21400133');
    expect(r.checkRuns[0]!.results.find(c => c.id === 'devolucao_anterior')!.outcome).toBe('atencao');
    await expect(service.forwardException(financeiro, r.id, r.version, { justification: 'curta', duplicityReviewed: true })).rejects.toThrow(/15 caracteres/);
    await expect(service.forwardException(financeiro, r.id, r.version, { justification: 'Devolução anterior se refere à parcela de julho.', duplicityReviewed: false })).rejects.toThrow(/duplicidade/);
    const ok = await service.forwardException(financeiro, r.id, r.version, { justification: 'Devolução anterior se refere à parcela de julho.', duplicityReviewed: true });
    expect(ok.status).toBe('aguardando_pagamento');
    expect(ok.decisions[0]!.overriddenChecks).toContain('devolucao_anterior');
  });
});

describe('encerramento sem pagamento', () => {
  it('avisa só o colaborador, nunca o aluno', async () => {
    const { store, service, byRa } = await setup();
    const seeded = byRa('24300210');
    expect(store.read().outbox.filter(e => e.refundId === seeded.id).some(e => e.to.some(t => t.kind === 'aluno' || t.kind === 'responsavel'))).toBe(false);
    const r = byRa('21400133');
    await expect(service.closeWithoutPayment(pagamentos, r.id, r.version, 'Duplicidade confirmada no Lyceum.')).rejects.toThrow(/Financeiro/);
    const closed = await service.closeWithoutPayment(financeiro, r.id, r.version, 'Duplicidade confirmada no Lyceum.');
    expect(closed.status).toBe('encerrado');
    const emails = store.read().outbox.filter(e => e.refundId === r.id && e.trigger === 'encerrada_sem_pagamento');
    expect(emails).toHaveLength(1);
    expect(emails[0]!.to.every(t => t.kind === 'colaborador')).toBe(true);
    expect(toPublicView(closed).stage).toBe('encerrado');
    expect(JSON.stringify(toPublicView(closed))).not.toContain('Duplicidade');
  });
});

describe('falha no Lyceum após pagamento', () => {
  it('mantém o pagamento e resolve com nova tentativa', async () => {
    const { store, service, byRa } = await setup();
    const r = byRa('21300845');
    expect(r.status).toBe('pago');
    expect(responsibility(r).sector).toBe('Financeiro');
    expect(store.read().outbox.filter(e => e.refundId === r.id && e.trigger === 'lyceum_pendente')).toHaveLength(1);
    const retried = await service.retryLyceumSync(financeiro, r.id);
    expect(retried.status).toBe('pago');
    expect(retried.lyceumSync?.status).toBe('sincronizado');
    expect(isOpen(retried)).toBe(false);
  });
});
