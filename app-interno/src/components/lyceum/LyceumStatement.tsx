// Extrato demonstrativo inspirado na organização do Lyceum: linhas de cobrança e créditos em destaque.
// Três números que não se confundem: faturado (cobrado), a receber (em aberto) e saldo devolvível (do crédito).
import { motion } from 'motion/react';
import { Lock, Undo2 } from 'lucide-react';
import { creditBalance, creditEligibility, creditSituationLabel, statementTotals } from '../../domain/credit';
import type { LyceumCharge, LyceumCredit, Refund, StudentFinancialSnapshot } from '../../domain/types';
import { competence, date, money } from '../../lib/format';
import { press } from '../../lib/motion';
import { Tag } from '../ui/Badges';
import { DataItem } from '../ui/Surfaces';

const situationLabel: Record<LyceumCharge['situation'], string> = { quitada: 'Quitada', a_vencer: 'A vencer', vencida: 'Vencida', parcial: 'Parcial', cancelada: 'Cancelada' };

export function StudentSummary({ snapshot }: { snapshot: StudentFinancialSnapshot }) {
  const s = snapshot.student;
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
      <DataItem label="Aluno" value={s.name} />
      <DataItem label="RA" value={s.ra} mono />
      <DataItem label="Responsável financeiro" value={s.responsible.isStudent ? 'O próprio aluno' : `${s.responsible.name} (${s.responsible.relation.toLowerCase()})`} />
      <DataItem label="Curso" value={s.course} />
      <DataItem label="Modalidade" value={`${s.level} · ${s.modality} · ${s.shift}`} />
      <DataItem label="Instituição" value={s.institution} />
    </dl>
  );
}

function ChargeNote({ charge }: { charge: LyceumCharge }) {
  const compensation = charge.postings.find(p => p.kind === 'compensacao');
  const excess = charge.postedAmount - charge.billedAmount;
  if (compensation) return <Tag tone="money">Compensado com {compensation.creditId}</Tag>;
  if (excess > 0) return <Tag tone="money">Lançado a maior: +{money(excess)} virou crédito</Tag>;
  return null;
}

export function ChargesTable({ charges }: { charges: LyceumCharge[] }) {
  const totals = statementTotals(charges);
  const cell = 'text-right font-mono text-[12px]';
  return (
    <div>
      <div className="hidden grid-cols-[1.1fr_0.8fr_0.9fr_repeat(4,1fr)_0.9fr] gap-3 border-b border-hairline px-3 pb-2 text-[11px] font-medium text-ink-3 lg:grid">
        <span>Tipo</span>
        <span>Competência</span>
        <span>Vencimento</span>
        <span className="text-right">Valor original</span>
        <span className="text-right">Faturado</span>
        <span className="text-right">A receber</span>
        <span className="text-right">Lançado</span>
        <span className="text-right">Situação</span>
      </div>
      <ul className="divide-y divide-hairline">
        {charges.map(c => (
          <li key={c.id} className="px-3 py-2">
            <div className="grid grid-cols-2 items-baseline gap-x-3 gap-y-1 lg:grid-cols-[1.1fr_0.8fr_0.9fr_repeat(4,1fr)_0.9fr]">
              <span className="text-[12.5px] font-medium">{c.type}</span>
              <span className="text-right font-mono text-[12px] text-ink-2 lg:text-left">{competence(c.competence)}</span>
              <span className="hidden font-mono text-[12px] text-ink-3 lg:block">{date(c.dueDate)}</span>
              <span className={`${cell} hidden text-ink-3 lg:block`}>{money(c.originalAmount)}</span>
              <span className={`${cell} hidden lg:block`}>{money(c.billedAmount)}</span>
              <span className={`${cell} hidden lg:block ${c.receivableAmount ? 'text-ink' : 'text-ink-4'}`}>{money(c.receivableAmount)}</span>
              <span className={`${cell} hidden lg:block ${c.postedAmount > c.billedAmount ? 'font-semibold text-money' : ''}`}>{money(c.postedAmount)}</span>
              <span className={`hidden text-right text-[12px] lg:block ${c.situation === 'vencida' ? 'font-semibold text-crit-ink' : c.situation === 'a_vencer' ? 'text-ink-2' : 'text-ink-3'}`}>{situationLabel[c.situation]}</span>
              {/* Mobile: valores empilhados, mesmos rótulos. */}
              <dl className="col-span-2 grid grid-cols-3 gap-2 text-[11px] lg:hidden">
                <div><dt className="text-ink-4">Faturado</dt><dd className="font-mono text-[12px]">{money(c.billedAmount)}</dd></div>
                <div><dt className="text-ink-4">A receber</dt><dd className="font-mono text-[12px]">{money(c.receivableAmount)}</dd></div>
                <div><dt className="text-ink-4">Lançado</dt><dd className={`font-mono text-[12px] ${c.postedAmount > c.billedAmount ? 'font-semibold text-money' : ''}`}>{money(c.postedAmount)}</dd></div>
                <div className="col-span-3 text-ink-3">Venc. {date(c.dueDate)} · original {money(c.originalAmount)} · {situationLabel[c.situation]}</div>
              </dl>
            </div>
            <div className="mt-1 empty:hidden"><ChargeNote charge={c} /></div>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-3 border-t border-hairline-strong px-3 pt-2.5 text-[11px] text-ink-3 lg:grid-cols-[1.1fr_0.8fr_0.9fr_repeat(4,1fr)_0.9fr]">
        <span className="col-span-3 font-medium text-ink-2 lg:col-span-4">Totais do extrato</span>
        <span className="text-right lg:block"><span className="block lg:hidden">Faturado</span><span className="font-mono text-[12px] text-ink">{money(totals.billed)}</span></span>
        <span className="text-right"><span className="block lg:hidden">A receber</span><span className="font-mono text-[12px] text-ink">{money(totals.receivable)}</span></span>
        <span className="text-right"><span className="block lg:hidden">Lançado</span><span className="font-mono text-[12px] text-ink">{money(totals.posted)}</span></span>
      </div>
    </div>
  );
}

export function CreditCard({ credit, refunds, selected, onSelect, readOnly = false }: { credit: LyceumCredit; refunds: Refund[]; selected: boolean; onSelect?: () => void; readOnly?: boolean }) {
  const balance = creditBalance(credit);
  const eligibility = readOnly ? { selectable: false } : creditEligibility(credit, refunds);
  const lastRefund = credit.refunds.at(-1);
  const interactive = !readOnly && eligibility.selectable && onSelect;
  const Tag_ = interactive ? motion.button : 'div';
  return (
    <Tag_
      {...(interactive ? { type: 'button' as const, whileTap: press, onClick: onSelect, 'aria-pressed': selected } : {})}
      className={`relative block w-full overflow-hidden rounded-lg p-4 pl-5 text-left transition-colors ${eligibility.selectable || readOnly ? 'bg-money-soft' : 'bg-surface-2'} ${interactive ? 'cursor-pointer hover:brightness-[0.98]' : ''} ${selected ? 'ring-2 ring-money' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${eligibility.selectable || readOnly ? 'bg-money' : 'bg-ink-4'}`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {!readOnly && (
            <span aria-hidden="true" className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${eligibility.selectable ? 'bg-surface' : 'bg-surface-3'}`}>
              {selected ? <span className="h-2 w-2 rounded-full bg-money" /> : !eligibility.selectable && <Lock className="h-2.5 w-2.5 text-ink-4" />}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              Crédito · {credit.origin}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-2">{credit.originDetail}</p>
            <p className="mt-1 font-mono text-[11px] text-ink-3">{credit.id} · gerado em {date(credit.createdAt)}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[11px] font-medium text-ink-3">Saldo devolvível</span>
          <span className={`block font-mono text-[20px] leading-tight font-medium ${balance.available ? 'text-money' : 'text-ink-3'}`}>{money(balance.available)}</span>
          <span className="text-[11px] font-medium text-ink-3">{creditSituationLabel[balance.situation]}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11.5px] text-ink-2">
        <span>Original {money(balance.original)}</span>
        <span className="text-ink-4">−</span>
        <span>Compensado em cobranças {money(balance.used)}</span>
        <span className="text-ink-4">−</span>
        <span>Já devolvido {money(balance.refunded)}</span>
        <span className="text-ink-4">=</span>
        <span className="font-semibold text-ink">{money(balance.available)}</span>
      </div>
      <div className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-2">
        <Undo2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
        <span>
          Já houve devolução deste crédito no Lyceum?{' '}
          {lastRefund ? (
            <strong className="font-semibold text-crit-ink">
              Sim — {credit.refunds.map(r => `${r.reference} em ${date(r.date)} (${money(r.amount)})`).join('; ')}
            </strong>
          ) : (
            <strong className="font-semibold text-ink">Não</strong>
          )}
        </span>
      </div>
      {!readOnly && !eligibility.selectable && eligibility.reason && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-crit-ink">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {eligibility.reason}
        </p>
      )}
    </Tag_>
  );
}

export function StatementLegend() {
  return (
    <p className="text-[11.5px] leading-relaxed text-ink-3">
      <strong className="font-medium text-ink-2">Faturado</strong> é o que foi cobrado após descontos. <strong className="font-medium text-ink-2">A receber</strong> é a parte ainda em aberto.{' '}
      <strong className="font-medium text-ink-2">Lançado</strong> soma pagamentos e compensações. <strong className="font-medium text-money">Saldo devolvível</strong> pertence ao crédito: original − compensado − já devolvido.
    </p>
  );
}
