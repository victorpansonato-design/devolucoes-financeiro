// Caixa de saída demonstrativa: tudo o que o sistema enviaria por e-mail, com estado "Simulado — não enviado".
import { useState } from 'react';
import { ChevronDown, Mail } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { OutboxEmail } from '../../domain/types';
import { dateTime } from '../../lib/format';
import { collapseVariants } from '../../lib/motion';
import { Tag } from '../ui/Badges';
import { Segmented } from '../ui/Fields';
import { Callout, EmptyState } from '../ui/Surfaces';

const kindLabel = { aluno: 'Aluno', responsavel: 'Responsável', colaborador: 'Colaborador', equipe: 'Equipe' } as const;

export function EmailCard({ email, onOpenRefund, defaultOpen = false }: { email: OutboxEmail; onOpenRefund?: (id: string) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <article className="rounded-lg bg-surface-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 p-3.5 text-left">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold">{email.subject}</span>
          <span className="mt-0.5 block text-[12px] text-ink-2">Para: {email.to.map(t => `${t.name} <${t.email}> · ${kindLabel[t.kind]}`).join(', ')}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
            <Tag>{email.triggerLabel}</Tag>
            <Tag tone="brand">Simulado — não enviado</Tag>
            <span>{dateTime(email.at)}</span>
          </span>
        </span>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-ink-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div variants={collapseVariants} initial="initial" animate="animate" exit="exit" className="overflow-hidden">
            <div className="border-t border-hairline px-3.5 py-3">
              <p className="text-[11px] text-ink-4">Evento disparador: {email.triggerLabel} · protocolo {email.protocol}</p>
              <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{email.body}</p>
              {onOpenRefund && (
                <button type="button" onClick={() => onOpenRefund(email.refundId)} className="mt-3 text-[12px] font-medium text-brand-text hover:underline">
                  Abrir pedido {email.protocol}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

type Filter = 'all' | 'aluno' | 'interno';

export function OutboxPanel({ emails, onOpenRefund }: { emails: OutboxEmail[]; onOpenRefund: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const sorted = [...emails].sort((a, b) => b.at.localeCompare(a.at));
  const isStudent = (e: OutboxEmail) => e.to.some(t => t.kind === 'aluno' || t.kind === 'responsavel');
  const list = sorted.filter(e => filter === 'all' || (filter === 'aluno' ? isStudent(e) : !isStudent(e)));
  return (
    <div className="space-y-4 p-5">
      <Callout tone="info" title="Nenhuma mensagem sai desta demonstração">
        Em produção, o despacho usará a infraestrutura Microsoft 365 aprovada (por exemplo, Microsoft Graph <code className="font-mono">sendMail</code> numa caixa institucional), lendo esta caixa de saída com reenvio e registro de falha.
      </Callout>
      <Segmented
        label="Filtrar e-mails"
        layoutId="outbox-filter"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: `Todos · ${sorted.length}` },
          { id: 'aluno', label: `Aluno/responsável · ${sorted.filter(isStudent).length}` },
          { id: 'interno', label: `Equipes · ${sorted.filter(e => !isStudent(e)).length}` },
        ]}
      />
      {list.length ? <div className="space-y-2">{list.map(e => <EmailCard key={e.id} email={e} onOpenRefund={onOpenRefund} />)}</div> : <EmptyState title="Nenhum e-mail" message="Os e-mails aparecem aqui quando uma transição exigir aviso." />}
    </div>
  );
}
