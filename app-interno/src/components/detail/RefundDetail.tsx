// Detalhe do pedido: só o essencial — quem age agora, a ação do perfil e os dados para pagar.
import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, ExternalLink, FileText, Loader2, Smartphone } from 'lucide-react';
import { can } from '../../domain/profiles';
import { isMyTurn, responsibility } from '../../domain/status';
import type { DemoDatabase, DemoProfile, Refund } from '../../domain/types';
import { date, dateTime, money } from '../../lib/format';
import { maskAccount, maskPixKey } from '../../lib/mask';
import { bankName } from '../../lib/validation';
import type { RefundService } from '../../services/refundService';
import { links } from '../../services/runtime';
import { StatusBadge, Tag } from '../ui/Badges';
import { Button } from '../ui/Button';
import { Overlay } from '../ui/Overlay';
import { Callout, DataItem } from '../ui/Surfaces';
import { ActionPanel } from './ActionPanel';

interface Props {
  refund: Refund;
  db: DemoDatabase;
  profile: DemoProfile;
  service: RefundService;
  onCorrect: () => void;
  onToast: (t: string) => void;
}

export function RefundDetail({ refund: r, db, profile, service, onCorrect, onToast }: Props) {
  const [proofOpen, setProofOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const who = responsibility(r);
  const trackingUrl = links.tracking(r.tracking.token);
  const full = can.viewFullPayment(profile.role);
  const p = r.payment;
  const destination = p.method === 'pix' ? `Pix · ${full ? p.pixKey : maskPixKey(p.pixKeyType, p.pixKey)}` : `${bankName(p.bankCode)} · ag. ${p.agency} · conta ${full ? p.account : maskAccount(p.account)}`;
  const sync = r.lyceumSync;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      onToast('Link copiado.');
    } catch {
      onToast('Não foi possível copiar.');
    }
  };

  return (
    <div className="space-y-5 p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[22px] leading-tight font-semibold">{r.student.name}</h2>
          <p className="mt-1 text-[12px] text-ink-3">RA <span className="font-mono">{r.student.ra}</span> · {r.student.course}</p>
        </div>
        <span className={`shrink-0 font-mono text-[22px] leading-none font-medium ${r.status === 'pago' ? 'text-money' : 'text-ink'}`}>{money(r.amount)}</span>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3.5 py-2.5">
        <StatusBadge refund={r} />
        <span className="text-[12px] text-ink-2">
          {who.sector ? <>Agora: <strong className="font-semibold text-ink">{who.sector}</strong> · {who.action}</> : who.action}
          {isMyTurn(r, profile) && <span className="ml-2"><Tag tone="brand">Seu perfil</Tag></span>}
        </span>
      </div>

      {r.status === 'correcao' && r.correction && <Callout tone="warn" title="O que corrigir">{r.correction.reason}</Callout>}
      {r.status === 'encerrado' && r.closure && <Callout tone="ok" title="Encerrado sem pagamento">{r.closure.reason}</Callout>}
      {sync?.status === 'falhou' && <Callout tone="crit" icon={<AlertTriangle className="h-4 w-4" />} title="Baixa no Lyceum pendente">Pagamento confirmado, mas o Lyceum não registrou a baixa. Tente de novo ou registre manualmente.</Callout>}

      <ActionPanel refund={r} profile={profile} db={db} service={service} onCorrect={onCorrect} onToast={onToast} />

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
        <DataItem label="Crédito" value={r.credit.origin} />
        <DataItem label="Solicitado por" value={`${r.requester.name} · ${date(r.createdAt)}`} />
        <DataItem label="Pagar para" value={p.holderName} />
        <DataItem label={p.method === 'pix' ? 'Pix' : 'Transferência'} value={destination} />
        {r.paymentRecord && <DataItem label="Pago em" value={date(r.paymentRecord.paidAt)} />}
        {r.paymentRecord && sync && (
          <DataItem label="Baixa no Lyceum" value={sync.status === 'pendente' ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Registrando…</span> : sync.status === 'falhou' ? 'Pendente' : sync.reference} />
        )}
      </dl>

      {r.paymentRecord?.proof && (
        <button type="button" onClick={() => setProofOpen(true)} className="flex w-full items-center gap-3 rounded-lg bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3">
          <FileText className="h-5 w-5 shrink-0 text-ink-3" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.paymentRecord.proof.name}</span>
          <span className="text-[12px] font-medium text-brand-text">Ver comprovante</span>
        </button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
        <span className="text-[12px] font-medium text-ink-3">Link do aluno</span>
        <div className="flex gap-1.5">
          <Button size="xs" onClick={() => void copy()}><Copy className="h-3.5 w-3.5" />Copiar</Button>
          <Button size="xs" onClick={() => setPreviewOpen(true)}><Smartphone className="h-3.5 w-3.5" />Prévia</Button>
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2 hover:bg-surface-2"><ExternalLink className="h-3.5 w-3.5" />Abrir</a>
        </div>
      </div>

      <ProofViewer open={proofOpen} onClose={() => setProofOpen(false)} refund={r} profile={profile} service={service} />
      <Overlay open={previewOpen} onClose={() => setPreviewOpen(false)} title="Link do aluno" subtitle="Como o aluno vê no celular." size="md">
        <div className="flex justify-center bg-canvas p-5">
          <iframe title="Prévia do acompanhamento" src={trackingUrl} className="h-[640px] w-[375px] max-w-full rounded-xl bg-surface" />
        </div>
      </Overlay>
    </div>
  );
}

function ProofViewer({ open, onClose, refund, profile, service }: { open: boolean; onClose: () => void; refund: Refund; profile: DemoProfile; service: RefundService }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let objectUrl = '';
    service
      .getProof(profile, refund.id)
      .then(({ blob }) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setUrl(objectUrl);
      })
      .catch(e => alive && setError((e as Error).message));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl('');
      setError('');
    };
  }, [open, refund.id, profile, service]);
  const proof = refund.paymentRecord?.proof;
  return (
    <Overlay open={open} onClose={onClose} title="Comprovante" subtitle={proof && `${proof.name} · ${dateTime(proof.uploadedAt)}`} size="lg" footer={url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-medium hover:bg-surface-3"><ExternalLink className="h-3.5 w-3.5" />Abrir em nova aba</a>}>
      <div className="bg-canvas p-4">
        {error ? <Callout tone="crit">{error}</Callout> : !url ? <div className="shimmer h-80 rounded-md" /> : proof?.type === 'application/pdf' ? <iframe title="Comprovante" src={url} className="h-[70vh] w-full rounded-lg bg-surface" /> : <img src={url} alt="Comprovante" className="mx-auto max-h-[70vh] rounded-lg" />}
      </div>
    </Overlay>
  );
}
