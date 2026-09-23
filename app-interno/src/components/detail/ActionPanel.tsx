// Ações permitidas ao perfil atual na etapa atual. A mesma matriz (can.*) é conferida de novo pelo serviço.
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, CircleCheck, Download, FileText, Loader2, Pencil, RotateCw, ShieldAlert } from 'lucide-react';
import { checkLabel, forwardBlockers, overridable } from '../../domain/checks';
import { maskedDestination } from '../../domain/notifications';
import { can } from '../../domain/profiles';
import { failingChecks, responsibility } from '../../domain/status';
import type { DemoDatabase, DemoProfile, Refund } from '../../domain/types';
import { demoProofBlob } from '../../demo/demoPdf';
import { civilDate, date, fileSize, money, moneyInput, parseMoney } from '../../lib/format';
import { PROOF_MAX_BYTES, type RefundService } from '../../services/refundService';
import { OutcomeIcon } from '../ui/Badges';
import { Button } from '../ui/Button';
import { Check, Field, Input, Segmented, TextArea } from '../ui/Fields';
import { Callout } from '../ui/Surfaces';

interface Props {
  refund: Refund;
  profile: DemoProfile;
  db: DemoDatabase;
  service: RefundService;
  onCorrect: () => void;
  onToast: (text: string) => void;
}

type Pending = null | 'correction' | 'close' | 'hold' | 'schedule' | 'pay' | 'manual';

function Panel({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl bg-surface-2 p-4">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {children}
      <div className="flex flex-wrap justify-end gap-2">{footer}</div>
    </section>
  );
}

export function ActionPanel({ refund: r, profile, db, service, onCorrect, onToast }: Props) {
  const role = profile.role;
  const [pending, setPending] = useState<Pending>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPending(null);
    setError('');
  }, [r.id, r.status]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      setPending(null);
      setText('');
      onToast(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const start = (p: Pending) => {
    setPending(p);
    setText('');
    setError('');
  };
  const cancel = <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>Cancelar</Button>;
  const errorBox = error && <Callout tone="crit" title="Ação não concluída">{error}</Callout>;

  if (pending === 'correction' || pending === 'close' || pending === 'hold')
    return (
      <Panel
        title={pending === 'correction' ? 'Solicitar correção ao solicitante' : pending === 'close' ? 'Encerrar sem pagamento' : 'Reter para análise do Financeiro'}
        footer={<>{cancel}<Button variant={pending === 'close' ? 'danger' : 'primary'} disabled={busy || text.trim().length < 10} onClick={() => void run(() => (pending === 'correction' ? service.requestCorrection(profile, r.id, r.version, text) : pending === 'close' ? service.closeWithoutPayment(profile, r.id, r.version, text) : service.holdForAnalysis(profile, r.id, r.version, text)), pending === 'correction' ? 'Correção solicitada. A solicitante foi avisada na caixa de saída.' : pending === 'close' ? 'Pedido encerrado. Só a solicitante foi avisada; o aluno não recebe e-mail.' : 'Pedido retido para análise.')}>{busy ? 'Salvando…' : 'Confirmar'}</Button></>}
      >
        <Field label={pending === 'correction' ? 'O que precisa ser corrigido?' : pending === 'close' ? 'Motivo do encerramento (interno)' : 'Motivo da retenção'} required help={pending === 'close' ? 'O motivo fica no histórico e no aviso à solicitante. O aluno vê apenas "encerrada sem pagamento".' : 'Mínimo de 10 caracteres.'}>
          {id => <TextArea id={id} data-autofocus value={text} onChange={e => setText(e.target.value)} maxLength={1000} />}
        </Field>
        {errorBox}
      </Panel>
    );

  if (pending === 'schedule') return <ScheduleForm refund={r} busy={busy} error={errorBox} onCancel={() => setPending(null)} onSubmit={d => void run(() => service.schedulePayment(profile, r.id, r.version, d), 'Agendamento registrado. O pedido continua aguardando pagamento.')} />;

  if (pending === 'pay') return <PaymentForm refund={r} db={db} busy={busy} error={errorBox} onCancel={() => setPending(null)} onSubmit={(input, failLyceum) => void run(async () => { if (failLyceum) await service.updateConfig({ nextLyceumSyncFails: true }); await service.confirmPayment(profile, r.id, r.version, input); }, 'Pagamento confirmado. Aluno e solicitante avisados; baixa no Lyceum em andamento.')} />;

  if (pending === 'manual')
    return <ManualLyceumForm busy={busy} error={errorBox} onCancel={() => setPending(null)} onSubmit={(reference, note) => void run(() => service.registerManualLyceumSync(profile, r.id, r.version, { reference, note }), 'Baixa manual registrada. Pedido concluído.')} />;

  // Financeiro decide a exceção.
  if (can.resolveException(role, r)) return <ExceptionForm refund={r} profile={profile} service={service} onCorrection={() => start('correction')} onClose={() => start('close')} onToast={onToast} />;

  const actions: ReactNode[] = [];
  if (can.resubmit(role, r)) actions.push(<Button key="fix" variant="primary" onClick={onCorrect}><Pencil className="h-4 w-4" />Corrigir e reenviar</Button>);
  if (can.confirmPayment(role, r)) actions.push(<Button key="pay" variant="primary" onClick={() => start('pay')}><CircleCheck className="h-4 w-4" />Confirmar pagamento realizado</Button>);
  if (can.schedule(role, r)) actions.push(<Button key="sch" onClick={() => start('schedule')}>Registrar agendamento</Button>);
  if (can.treatLyceum(role, r))
    actions.push(
      <Button key="retry" variant="primary" disabled={busy} onClick={() => void run(() => service.retryLyceumSync(profile, r.id), 'Nova tentativa enviada ao Lyceum.')}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}Tentar a baixa novamente
      </Button>,
      <Button key="manual" onClick={() => start('manual')}>Registrar baixa manual</Button>,
    );
  if (can.hold(role, r)) actions.push(<Button key="hold" onClick={() => start('hold')}>Reter para análise</Button>);
  if (can.requestCorrection(role, r)) actions.push(<Button key="corr" onClick={() => start('correction')}>Solicitar correção</Button>);
  if (can.close(role, r)) actions.push(<Button key="close" variant="ghost" onClick={() => start('close')}>Encerrar sem pagamento</Button>);

  const who = responsibility(r);
  if (!actions.length)
    return (
      <p className="rounded-xl bg-surface-2 p-4 text-[12.5px] leading-relaxed text-ink-2">
        {who.sector ? <>Nenhuma ação para o seu perfil nesta etapa. Quem age agora: <strong className="font-semibold text-ink">{who.sector}</strong> — {who.action.toLowerCase()}.</> : <>Pedido concluído. Nenhuma ação pendente.</>}
      </p>
    );
  return (
    <div className="space-y-3">
      {errorBox}
      <div className="flex flex-wrap justify-end gap-2">{actions.reverse()}</div>
    </div>
  );
}

function ExceptionForm({ refund: r, profile, service, onCorrection, onClose, onToast }: { refund: Refund; profile: DemoProfile; service: RefundService; onCorrection: () => void; onClose: () => void; onToast: (t: string) => void }) {
  const results = r.checkRuns.at(-1)?.results ?? [];
  const failing = failingChecks(r);
  const blockers = forwardBlockers(results);
  const saldo = results.find(c => c.id === 'saldo_disponivel' && c.adjustable);
  const duplicity = overridable(results).some(c => c.id === 'devolucao_anterior');
  const [choice, setChoice] = useState<'encaminhar' | 'correcao' | 'encerrar'>(blockers.length && !saldo ? 'correcao' : 'encaminhar');
  const [justification, setJustification] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [adjust, setAdjust] = useState(saldo ? moneyInput(r.credit.availableAtRequest) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hardBlock = blockers.filter(b => !(b.adjustable && saldo));
  const adjustedAmount = saldo ? parseMoney(adjust) : null;
  const canForward = !hardBlock.length && justification.trim().length >= 15 && (!duplicity || reviewed) && (!saldo || (adjustedAmount !== null && adjustedAmount > 0));

  async function forward() {
    setBusy(true);
    setError('');
    try {
      await service.forwardException(profile, r.id, r.version, { justification, duplicityReviewed: reviewed, adjustedAmount: saldo ? adjustedAmount ?? undefined : undefined });
      onToast('Exceção resolvida e encaminhada para Cobranças a Pagar. Decisão registrada no histórico.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl bg-surface-2 p-4">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        <div>
          <h3 className="text-[15px] font-semibold">Decidir a exceção</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">Registre a decisão. Nenhuma exceção segue sem justificativa.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {failing.map(c => (
          <li key={c.id} className="flex items-start gap-2.5 rounded-lg bg-surface p-3">
            <OutcomeIcon outcome={c.outcome} />
            <div className="min-w-0 text-[12px] leading-relaxed">
              <p className="font-semibold text-ink">{checkLabel[c.id]}{c.blocking && !c.adjustable && <span className="ml-1.5 text-crit-ink">· impede o encaminhamento</span>}</p>
              <p className="text-ink-2">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <Segmented label="Decisão" layoutId={`decision-${r.id}`} value={choice} onChange={setChoice} options={[{ id: 'encaminhar', label: 'Encaminhar para pagamento' }, { id: 'correcao', label: 'Solicitar correção' }, { id: 'encerrar', label: 'Encerrar' }]} />
      {choice === 'encaminhar' && (
        <div className="space-y-3">
          {hardBlock.length > 0 && <Callout tone="crit" title="Encaminhamento bloqueado">{hardBlock.map(b => b.detail).join(' ')} Solicite correção ou encerre registrando o motivo.</Callout>}
          {saldo && (
            <Field label="Valor a pagar (ajustado ao saldo)" required help={`Saldo devolvível no Lyceum: ${money(r.credit.availableAtRequest)}. Solicitado: ${money(r.amount)}.`}>
              {id => <Input id={id} value={adjust} onChange={e => setAdjust(e.target.value)} className="font-mono" />}
            </Field>
          )}
          {duplicity && (
            <div className="rounded-lg bg-crit-soft p-3">
              <Check checked={reviewed} onChange={setReviewed} tone="crit">Conferi a devolução anterior no Lyceum e confirmo que o saldo restante não é duplicidade.</Check>
            </div>
          )}
          <Field label="Justificativa da decisão" required help="Mínimo de 15 caracteres. Fica no histórico e na trilha de auditoria.">
            {id => <TextArea id={id} value={justification} onChange={e => setJustification(e.target.value)} placeholder="Ex.: devolução anterior refere-se a outra parcela; saldo conferido no Lyceum." />}
          </Field>
          {error && <Callout tone="crit" title="Não foi possível encaminhar">{error}</Callout>}
          <div className="flex justify-end">
            <Button variant="primary" disabled={!canForward || busy} onClick={() => void forward()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Registrar decisão e encaminhar<ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      {choice === 'correcao' && <div className="flex justify-end"><Button variant="primary" onClick={onCorrection}>Escrever pedido de correção</Button></div>}
      {choice === 'encerrar' && <div className="flex justify-end"><Button variant="danger" onClick={onClose}>Encerrar com motivo</Button></div>}
    </section>
  );
}

function ScheduleForm({ refund: r, busy, error, onCancel, onSubmit }: { refund: Refund; busy: boolean; error: ReactNode; onCancel: () => void; onSubmit: (d: string) => void }) {
  const today = civilDate();
  const [value, setValue] = useState(r.schedule?.date ?? today);
  return (
    <Panel title="Registrar agendamento" footer={<><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button variant="primary" disabled={busy || value < today} onClick={() => onSubmit(value)}>Salvar agendamento</Button></>}>
      <Callout tone="info">Agendamento é só previsão: o pedido continua em Aguardando pagamento e o aluno não é avisado até a confirmação da execução.</Callout>
      <Field label="Data prevista" required>{id => <Input id={id} type="date" min={today} value={value} onChange={e => setValue(e.target.value)} />}</Field>
      {error}
    </Panel>
  );
}

function PaymentForm({ refund: r, db, busy, error, onCancel, onSubmit }: { refund: Refund; db: DemoDatabase; busy: boolean; error: ReactNode; onCancel: () => void; onSubmit: (input: Parameters<RefundService['confirmPayment']>[3], failLyceum: boolean) => void }) {
  const today = civilDate();
  const [paidAt, setPaidAt] = useState(today);
  const [attach, setAttach] = useState<'sim' | 'nao' | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [failLyceum, setFailLyceum] = useState(db.config.nextLyceumSyncFails);

  useEffect(() => {
    if (!file) return setPreview('');
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const ext = file?.name.split('.').pop()?.toLowerCase() ?? '';
  const fileError = attach === 'sim' ? (!file ? 'Selecione o comprovante.' : !['pdf', 'png', 'jpg', 'jpeg'].includes(ext) ? 'Use PDF, PNG ou JPG.' : file.size > PROOF_MAX_BYTES ? 'Arquivo acima de 5 MB.' : null) : null;
  const dateError = !paidAt ? 'Informe a data.' : paidAt > today ? 'Data futura: registre como agendamento.' : paidAt < civilDate(r.createdAt) ? 'Anterior à solicitação.' : null;
  const ready = confirmed && !!attach && !fileError && !dateError;

  const downloadDemo = () => {
    const blob = demoProofBlob({ title: `Comprovante de ${r.payment.method === 'pix' ? 'Pix' : 'transferência'}`, lines: [['Protocolo', r.protocol], ['Favorecido', r.payment.holderName], ['Destino', maskedDestination(r)], ['Valor', money(r.amount)], ['Data', date(paidAt)]] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-demo-${r.protocol}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <Panel
      title="Confirmar pagamento realizado"
      footer={<><Button variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button><Button variant="primary" disabled={!ready || busy} onClick={() => onSubmit({ paidAt, executedAndVerified: confirmed, attachProof: attach === 'sim', file: attach === 'sim' && file ? { blob: file, name: file.name } : undefined, bankReference }, failLyceum)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}Confirmar pagamento</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data em que o pagamento foi executado" required error={dateError}>{id => <Input id={id} type="date" max={today} value={paidAt} onChange={e => setPaidAt(e.target.value)} />}</Field>
        <Field label="Referência bancária (opcional)" help="Ex.: identificador E2E do Pix.">{id => <Input id={id} value={bankReference} onChange={e => setBankReference(e.target.value)} className="font-mono" maxLength={40} />}</Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-[12px] font-medium">Anexar comprovante? <span className="text-crit">*</span></legend>
        <Segmented label="Anexar comprovante" layoutId={`attach-${r.id}`} value={attach || ('' as 'sim')} onChange={v => { setAttach(v); setFile(null); }} options={[{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }]} />
      </fieldset>
      {attach === 'sim' && (
        <div className="space-y-2">
          <Field label="Comprovante (PDF, PNG ou JPG, até 5 MB)" required error={file ? fileError : null}>
            {id => <input id={id} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full rounded-md bg-surface p-2 text-[12.5px] file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-[12px] file:font-medium" />}
          </Field>
          <button type="button" onClick={downloadDemo} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-text hover:underline"><Download className="h-3.5 w-3.5" />Baixar um comprovante fictício para testar</button>
          {file && !fileError && (
            <div className="flex items-center gap-3 rounded-lg bg-surface p-3">
              {file.type.startsWith('image/') ? <img src={preview} alt="Prévia do comprovante" className="h-16 w-16 rounded-sm object-cover" /> : <FileText className="h-8 w-8 text-ink-3" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{file.name}</p>
                <p className="text-[11px] text-ink-3">{fileSize(file.size)}</p>
              </div>
              <a href={preview} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-brand-text hover:underline">Abrir prévia</a>
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg bg-surface p-3">
        <Check checked={confirmed} onChange={setConfirmed}>
          Confirmo que o pagamento de <strong className="font-semibold">{money(r.amount)}</strong> ({maskedDestination(r)}) <strong className="font-semibold">já foi executado e conferido</strong> no banco. Previsão ou agendamento não contam como pagamento.
        </Check>
      </div>
      <Check checked={failLyceum} onChange={setFailLyceum}>
        <span className="text-[12px] text-ink-3">Demonstração: simular falha na baixa do Lyceum após confirmar.</span>
      </Check>
      {error}
    </Panel>
  );
}

function ManualLyceumForm({ busy, error, onCancel, onSubmit }: { busy: boolean; error: ReactNode; onCancel: () => void; onSubmit: (reference: string, note: string) => void }) {
  const [reference, setReference] = useState(`LYC-DV-${new Date().getFullYear()}-`);
  const [note, setNote] = useState('');
  const valid = /^LYC-[A-Z]{2,3}-\d{4}-\d{4,6}$/i.test(reference.trim()) && note.trim().length >= 10;
  return (
    <Panel title="Registrar baixa manual no Lyceum" footer={<><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button variant="primary" disabled={!valid || busy} onClick={() => onSubmit(reference, note)}>Registrar baixa</Button></>}>
      <Callout tone="info">Use quando a baixa foi feita diretamente no Lyceum. Em produção, o sistema confere a referência no Lyceum antes de concluir.</Callout>
      <Field label="Referência da devolução no Lyceum" required help="Formato LYC-DV-AAAA-00000.">{id => <Input id={id} value={reference} onChange={e => setReference(e.target.value)} className="font-mono" />}</Field>
      <Field label="Observação" required>{id => <TextArea id={id} value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: baixa lançada manualmente após indisponibilidade da integração." />}</Field>
      {error}
    </Panel>
  );
}
