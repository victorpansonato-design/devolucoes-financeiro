// Página pública do link individual. Importa só a projeção mínima e o leitor público —
// nunca o banco interno, o serviço ou o extrato.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, CircleAlert, Clock3, ExternalLink, FileText, FlaskConical, X } from 'lucide-react';
import { createBrowserProofStorage } from '../adapters/proofStorage.demo';
import { lookupPublicView, onPublicIndexChange, type LookupResult } from '../adapters/publicTracking.demo';
import { publicSteps, type PublicStep, type PublicTrackingView } from '../domain/publicView';
import { date, dateTime, money } from '../lib/format';
import { staggerContainer, staggerItem } from '../lib/motion';

const tokenFromHash = () => location.hash.match(/^#\/r\/([A-Za-z0-9_-]+)$/)?.[1];

const stateLabel: Record<PublicTrackingView['stage'], string> = {
  verificacao: 'Em verificação',
  correcao: 'Ajuste de dados',
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pagamento realizado',
  encerrado: 'Encerrada sem pagamento',
};

export function PublicTracking() {
  const [token, setToken] = useState(tokenFromHash);
  const [result, setResult] = useState<LookupResult>(() => lookupPublicView(tokenFromHash()));

  useEffect(() => {
    const refresh = () => {
      const t = tokenFromHash();
      setToken(t);
      setResult(lookupPublicView(t));
    };
    window.addEventListener('hashchange', refresh);
    const off = onPublicIndexChange(refresh);
    return () => {
      window.removeEventListener('hashchange', refresh);
      off();
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-warn-soft px-4 py-2 text-center text-[11.5px] font-medium text-warn-ink">
        <FlaskConical className="mr-1.5 inline h-3.5 w-3.5" />
        Demonstração — dados fictícios. Nenhum pagamento real.
      </div>
      <div className="mx-auto max-w-[760px] px-4 pb-12 sm:px-6">
        <header className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <img src="/logo-anchieta.png" alt="Grupo Anchieta" className="h-auto w-[164px] sm:w-[190px]" />
          <span className="hidden text-[12px] font-medium text-ink-3 sm:block">Acompanhamento de devoluções</span>
        </header>
        <main className="space-y-4">
          <div className="px-0.5 pb-2">
            <p className="text-[12px] font-semibold text-brand-text">Devolução financeira</p>
            <h1 className="mt-2 text-[28px] leading-[1.12] font-semibold sm:text-[36px]">Acompanhe sua solicitação</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">Veja a etapa atual do pedido. A página se atualiza sozinha.</p>
          </div>
          {result.status === 'ok' ? <Tracking view={result.view} /> : <Problem status={result.status} hasToken={!!token} />}
          <p className="px-0.5 pt-2 text-[12.5px] leading-relaxed text-ink-3">
            Esta página mostra o andamento informado pela equipe UniAnchieta. O link é pessoal: não o compartilhe. Para corrigir dados ou esclarecer dúvidas, fale com a equipe pelo canal em que fez a solicitação, informando o protocolo.
          </p>
        </main>
      </div>
    </div>
  );
}

function Problem({ status, hasToken }: { status: LookupResult['status']; hasToken: boolean }) {
  const message = !hasToken
    ? 'Abra o link individual recebido da equipe UniAnchieta para acompanhar sua solicitação.'
    : status === 'invalid' || status === 'not_found'
      ? 'Link não encontrado ou não é mais válido. Peça um novo link à equipe UniAnchieta.'
      : 'Não foi possível carregar agora. Na demonstração, abra este link no mesmo navegador em que a interface interna está aberta.';
  return <section className="rounded-xl bg-surface px-6 py-14 text-center text-[14px] leading-relaxed text-ink-2">{message}</section>;
}

function Tracking({ view }: { view: PublicTrackingView }) {
  const steps = publicSteps(view);
  const tone = view.stage === 'pago' ? 'text-money bg-money-soft' : view.stage === 'encerrado' ? 'text-ink-2 bg-surface-2' : view.stage === 'correcao' ? 'text-warn-ink bg-warn-soft' : 'text-brand-text bg-brand-soft';
  return (
    <>
      <section className="grid grid-cols-2 gap-5 rounded-xl bg-surface p-5 sm:grid-cols-[1.6fr_1fr] sm:p-7">
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[12px] font-medium text-ink-3">Aluno</span>
          <p className="mt-1.5 text-[19px] leading-snug font-semibold break-words">{view.studentName}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[12px] font-medium text-ink-3">{view.stage === 'pago' ? 'Valor devolvido' : 'Valor da devolução'}</span>
          <p className={`mt-1.5 font-mono text-[26px] leading-none font-medium ${view.stage === 'encerrado' ? 'text-ink-3' : 'text-money'}`}>{money(view.amount)}</p>
        </div>
        <div className="col-span-2 h-px bg-hairline" />
        <div>
          <span className="text-[12px] font-medium text-ink-3">Forma de pagamento</span>
          <p className="mt-1.5 text-[15px] font-medium">{view.method === 'pix' ? 'Pix' : 'Transferência bancária'}</p>
        </div>
        <div>
          <span className="text-[12px] font-medium text-ink-3">Protocolo</span>
          <p className="mt-1.5 font-mono text-[14px]">{view.protocol}</p>
        </div>
      </section>

      <section aria-label="Etapas da devolução" className="rounded-xl bg-surface p-5 sm:p-7">
        <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-[19px] font-semibold">Andamento</h2>
          <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${tone}`}>{stateLabel[view.stage]}</span>
        </div>
        <motion.ol variants={staggerContainer} initial="initial" animate="animate">
          {steps.map((s, i) => <Step key={s.key} step={s} last={i === steps.length - 1} />)}
        </motion.ol>
      </section>

      {view.stage === 'pago' && view.proof && <ProofCard proof={view.proof} />}
      <p className="px-0.5 text-[12px] text-ink-4">Última atualização: {dateTime(view.updatedAt)}</p>
    </>
  );
}

function Step({ step, last }: { step: PublicStep; last: boolean }) {
  const icon = { done: <Check className="h-4 w-4" />, current: <Clock3 className="h-4 w-4" />, attention: <CircleAlert className="h-4 w-4" />, closed: <X className="h-4 w-4" />, future: <span className="h-1.5 w-1.5 rounded-full bg-ink-4" /> }[step.state];
  const dot = { done: 'bg-money text-white', current: 'bg-brand text-on-brand', attention: 'bg-warn text-white', closed: 'bg-ink-3 text-white', future: 'bg-surface-2' }[step.state];
  return (
    <motion.li variants={staggerItem} className="relative flex gap-4 pb-7 last:pb-0">
      {!last && <span className={`absolute top-8 bottom-0 left-[15px] w-0.5 ${step.state === 'done' ? 'bg-money/35' : 'bg-hairline'}`} />}
      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${dot}`} aria-hidden="true">{icon}</span>
      <div className={`pt-1 ${step.state === 'future' ? 'text-ink-3' : ''}`}>
        <h3 className="text-[15px] font-semibold">{step.title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{step.description}</p>
        {step.at && <p className="mt-1 text-[12px] font-medium text-ink-2">{step.key === 'pago' ? `Pago em ${date(step.at)}` : dateTime(step.at)}</p>}
      </div>
    </motion.li>
  );
}

function ProofCard({ proof }: { proof: NonNullable<PublicTrackingView['proof']> }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const storage = await createBrowserProofStorage();
      const blob = await storage.get(proof.id);
      if (!blob) throw new Error('Comprovante indisponível neste navegador. Na demonstração, os arquivos ficam no navegador em que foram anexados.');
      setUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Comprovante de pagamento" className="space-y-4 rounded-xl bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold">Comprovante de pagamento</h2>
            <p className="mt-0.5 truncate text-[13px] text-ink-3">{proof.name}</p>
          </div>
        </div>
        {!url ? (
          <button type="button" disabled={busy} onClick={() => void load()} className="h-10 w-full rounded-full bg-brand px-5 text-[14px] font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-60 sm:w-auto">
            {busy ? 'Carregando…' : 'Ver comprovante'}
          </button>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-surface-2 px-5 text-[14px] font-medium hover:bg-surface-3 sm:w-auto">
            <ExternalLink className="h-4 w-4" />Abrir em nova aba
          </a>
        )}
      </div>
      {error && <p role="alert" className="text-[13px] text-crit-ink">{error}</p>}
      {url && (proof.type === 'application/pdf' ? <iframe title="Comprovante" src={url} className="h-[480px] w-full rounded-lg bg-surface-2" /> : <img src={url} alt="Comprovante de pagamento" className="mx-auto max-h-[480px] rounded-lg" />)}
    </section>
  );
}
