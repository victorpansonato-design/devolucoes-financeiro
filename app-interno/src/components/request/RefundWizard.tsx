// Solicitação pelo RA: consulta o Lyceum (simulado), mostra o extrato, deixa escolher UM crédito elegível e pede
// só o que falta para pagar. O mesmo formulário atende a correção (começa direto nos dados de pagamento).
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check as CheckIcon, Copy, ExternalLink, Loader2, Search, Sparkles, WandSparkles } from 'lucide-react';
import type { StudentSearchHit } from '../../adapters/contracts';
import { paymentDataIssues } from '../../domain/checks';
import { creditBalance, creditEligibility } from '../../domain/credit';
import type { DemoDatabase, DemoProfile, HolderKind, PaymentData, PaymentMethod, PixKeyType, Refund, StudentFinancialSnapshot } from '../../domain/types';
import { scenarioFor, scenarios } from '../../demo/seedData';
import { money, moneyInput, parseMoney } from '../../lib/format';
import { staggerContainer, staggerItem } from '../../lib/motion';
import { accountError, agencyError, banks, formatCpf, isValidCpf, nameError, pixKeyError, pixKeyTypes } from '../../lib/validation';
import type { RefundService } from '../../services/refundService';
import { links } from '../../services/runtime';
import { OutcomeIcon, Tag } from '../ui/Badges';
import { Button } from '../ui/Button';
import { Check, Field, Input, Segmented, Select } from '../ui/Fields';
import { Callout, Section } from '../ui/Surfaces';
import { ChargesTable, CreditCard, StatementLegend, StudentSummary } from '../lyceum/LyceumStatement';

type Step = 'aluno' | 'pagamento' | 'resultado';

interface Props {
  service: RefundService;
  profile: DemoProfile;
  db: DemoDatabase;
  correction?: Refund;
  initialRa?: string;
  onOpenRefund: (id: string) => void;
  onClose: () => void;
  onToast: (text: string) => void;
}

const emptyPayment = (): PaymentData => ({ method: 'pix', holderKind: 'responsavel', holderName: '', holderCpf: '', pixKeyType: 'cpf', pixKey: '', bankCode: '', agency: '', account: '', accountType: 'corrente' });

export function RefundWizard({ service, profile, db, correction, initialRa, onOpenRefund, onClose, onToast }: Props) {
  const [step, setStep] = useState<Step>(correction ? 'pagamento' : 'aluno');
  const [query, setQuery] = useState(correction?.student.ra ?? initialRa ?? '');
  const [hits, setHits] = useState<StudentSearchHit[]>([]);
  const [snapshot, setSnapshot] = useState<StudentFinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [creditId, setCreditId] = useState(correction?.credit.id ?? '');
  const [payment, setPayment] = useState<PaymentData>(correction ? { ...emptyPayment(), ...correction.payment } : emptyPayment());
  const [amountText, setAmountText] = useState(correction ? moneyInput(correction.amount) : '');
  const [confirmed, setConfirmed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Refund | null>(null);
  const auto = db.config.lyceumRequestMode === 'automatico';

  async function loadStudent(ra: string) {
    setLoading(true);
    setError('');
    setHits([]);
    try {
      const snap = await service.getFinancialSnapshot(ra);
      setSnapshot(snap);
      setQuery(ra);
      if (!correction) {
        const first = snap.credits.find(c => creditEligibility(c, db.refunds).selectable);
        setCreditId(first?.id ?? '');
        setPayment(p => withHolder({ ...emptyPayment(), method: p.method }, snap.student.responsible.isStudent ? 'aluno' : 'responsavel', snap));
        setAmountText(first ? moneyInput(creditBalance(first).available) : '');
      }
    } catch (e) {
      setSnapshot(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (correction) void loadStudent(correction.student.ra);
    else if (initialRa) void loadStudent(initialRa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca rápida pelo RA (ou nome) no Lyceum simulado.
  useEffect(() => {
    if (correction || snapshot?.student.ra === query.trim()) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => void service.searchStudents(q).then(h => alive && setHits(h)), 180);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, service, snapshot, correction]);

  const credit = snapshot?.credits.find(c => c.id === creditId);
  const balance = credit ? creditBalance(credit) : null;
  const amount = parseMoney(amountText);
  const scenario = snapshot ? scenarioFor(snapshot.student.ra) : undefined;

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.amount = amount === null || amount <= 0 ? 'Informe um valor maior que zero.' : null;
    if (payment.holderKind === 'outro') {
      e.holderName = nameError(payment.holderName);
      e.holderCpf = isValidCpf(payment.holderCpf) ? null : 'CPF inválido.';
    }
    if (payment.method === 'pix') {
      e.pixKey = payment.pixKeyType ? pixKeyError(payment.pixKeyType, payment.pixKey ?? '') : 'Escolha o tipo de chave.';
      if (!e.pixKey && payment.pixKeyType === 'cpf' && isValidCpf(payment.pixKey ?? '') && formatCpf(payment.pixKey ?? '') !== formatCpf(payment.holderCpf)) e.pixKey = 'Chave do tipo CPF deve ser o CPF do titular.';
    } else {
      e.bankCode = payment.bankCode ? null : 'Selecione o banco.';
      e.agency = agencyError(payment.agency ?? '');
      e.account = accountError(payment.account ?? '');
    }
    e.lyceum = !auto && !correction && !confirmed ? 'Confirme o registro no Lyceum.' : null;
    return e;
  }, [amount, payment, confirmed, auto, correction]);
  const valid = Object.values(errors).every(v => !v) && paymentDataIssues(payment).length === 0;
  const show = (key: string) => (showErrors ? errors[key] : null);
  const set = (patch: Partial<PaymentData>) => setPayment(p => ({ ...p, ...patch }));

  async function submit() {
    setShowErrors(true);
    if (!valid || amount === null || !snapshot) return;
    setSaving(true);
    setError('');
    try {
      const refund = correction
        ? await service.resubmit(profile, correction.id, correction.version, { amount, payment })
        : await service.createRefund(profile, { ra: snapshot.student.ra, creditId, amount, payment, lyceumConfirmed: confirmed });
      setResult(refund);
      setStep('resultado');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast('Link copiado.');
    } catch {
      onToast('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  const steps: [Step, string][] = correction ? [['pagamento', 'Correção'], ['resultado', 'Verificações']] : [['aluno', 'Aluno e crédito'], ['pagamento', 'Pagamento'], ['resultado', 'Verificações']];

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-5 p-5">
        <ol className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
          {steps.map(([id, label], i) => (
            <li key={id} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-3 w-3 text-ink-4" />}
              <span className={step === id ? 'font-semibold text-ink' : ''}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        {step === 'aluno' && (
          <>
            <Field label="RA do aluno" required help="Digite o RA ou parte do nome. A consulta ao Lyceum é simulada.">
              {id => (
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
                  <Input
                    id={id}
                    data-autofocus
                    inputMode="search"
                    autoComplete="off"
                    placeholder="Ex.: 24100318"
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value);
                      if (snapshot) setSnapshot(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && hits[0]) void loadStudent(hits[0].ra);
                    }}
                    className="pl-9 font-mono"
                  />
                  {hits.length > 0 && !snapshot && (
                    <ul className="absolute inset-x-0 top-10 z-10 overflow-hidden rounded-xl bg-surface shadow-overlay">
                      {hits.map(h => (
                        <li key={h.ra}>
                          <button type="button" onClick={() => void loadStudent(h.ra)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-hover">
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium">{h.name}</span>
                              <span className="block text-[11px] text-ink-3">{h.course} · {h.modality}</span>
                            </span>
                            <span className="font-mono text-[12px] text-ink-2">{h.ra}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Field>

            {!snapshot && !loading && (
              <Section title="Alunos fictícios da demonstração">
                <div className="grid gap-2 sm:grid-cols-2">
                  {scenarios.map(s => {
                    const st = db.lyceum.students.find(x => x.ra === s.ra)!;
                    return (
                      <button key={s.ra} type="button" onClick={() => void loadStudent(s.ra)} className="rounded-lg bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-medium">{st.name}</span>
                          <span className="font-mono text-[11px] text-ink-3">{s.ra}</span>
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-3">{s.title}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            {loading && (
              <div className="space-y-3" aria-live="polite">
                <p className="flex items-center gap-2 text-[12px] text-ink-3"><Loader2 className="h-3.5 w-3.5 animate-spin" />Consultando Lyceum (simulado)…</p>
                <div className="shimmer h-16 rounded-md" />
                <div className="shimmer h-40 rounded-md" />
              </div>
            )}

            {snapshot && !loading && (
              <div className="space-y-5">
                <Section title="Dados do Lyceum" action={<Tag>Consulta simulada</Tag>}>
                  <StudentSummary snapshot={snapshot} />
                </Section>
                <Section title="Créditos do aluno — selecione um crédito elegível">
                  <div className="space-y-2.5">
                    {snapshot.credits.map(c => (
                      <CreditCard key={c.id} credit={c} refunds={db.refunds} selected={c.id === creditId} onSelect={() => {
                        setCreditId(c.id);
                        setAmountText(moneyInput(creditBalance(c).available));
                      }} />
                    ))}
                    {snapshot.credits.length === 0 && <Callout tone="ok">Nenhum crédito para este RA.</Callout>}
                  </div>
                </Section>
                <Section title="Extrato financeiro demonstrativo">
                  <StatementLegend />
                  <ChargesTable charges={snapshot.charges} />
                </Section>
              </div>
            )}
          </>
        )}

        {step === 'pagamento' && snapshot && credit && balance && (
          <div className="space-y-5">
            {correction?.correction && (
              <Callout tone="warn" title={`Correção solicitada por ${correction.correction.by}`}>
                {correction.correction.reason}
                {scenario?.correctionHint && <p className="mt-1 font-medium text-ink">Dica da demonstração: {scenario.correctionHint}</p>}
              </Callout>
            )}
            <Section title="Preenchido automaticamente">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
                <div><dt className="text-[11px] font-medium text-ink-4">Aluno</dt><dd className="text-[13px] font-medium">{snapshot.student.name}</dd></div>
                <div><dt className="text-[11px] font-medium text-ink-4">RA</dt><dd className="font-mono text-[13px]">{snapshot.student.ra}</dd></div>
                <div><dt className="text-[11px] font-medium text-ink-4">Curso</dt><dd className="text-[13px] font-medium">{snapshot.student.course}</dd></div>
                <div><dt className="text-[11px] font-medium text-ink-4">Crédito</dt><dd className="font-mono text-[12px]">{credit.id}</dd></div>
                <div><dt className="text-[11px] font-medium text-ink-4">Motivo (origem)</dt><dd className="text-[13px] font-medium">{credit.origin}</dd></div>
                <div><dt className="text-[11px] font-medium text-ink-4">Saldo devolvível</dt><dd className="font-mono text-[13px] font-semibold text-money">{money(balance.available)}</dd></div>
              </dl>
            </Section>

            <Section
              title="Só o que falta para pagar"
              action={
                scenario?.payment && (
                  <Button size="xs" variant="ghost" onClick={() => setPayment(p => withHolder({ ...p, ...scenario.payment }, scenario.payment!.holderKind ?? p.holderKind, snapshot))}>
                    <WandSparkles className="h-3.5 w-3.5" />Preencher dados fictícios
                  </Button>
                )
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor a devolver" required error={show('amount')} help={amount !== null && amount > balance.available ? `Acima do saldo de ${money(balance.available)}: o pedido irá para Análise do Financeiro.` : `Sugerido: saldo devolvível de ${money(balance.available)}.`}>
                  {id => <Input id={id} inputMode="decimal" value={amountText} onChange={e => setAmountText(e.target.value)} className="font-mono" aria-invalid={!!show('amount')} />}
                </Field>
                <Field label="Titular da conta" required>
                  {() => (
                    <Segmented
                      label="Titular da conta"
                      layoutId="holder-kind"
                      value={payment.holderKind}
                      onChange={k => setPayment(p => withHolder(p, k, snapshot))}
                      options={[...(snapshot.student.responsible.isStudent ? [] : [{ id: 'responsavel' as HolderKind, label: 'Responsável' }]), { id: 'aluno' as HolderKind, label: 'Aluno' }, { id: 'outro' as HolderKind, label: 'Outro titular' }]}
                    />
                  )}
                </Field>
                {payment.holderKind === 'outro' ? (
                  <>
                    <Field label="Nome do titular" required error={show('holderName')}>{id => <Input id={id} value={payment.holderName} onChange={e => set({ holderName: e.target.value })} />}</Field>
                    <Field label="CPF do titular" required error={show('holderCpf')} help="Conta de terceiro sempre passa por Análise do Financeiro.">
                      {id => <Input id={id} inputMode="numeric" value={payment.holderCpf} onChange={e => set({ holderCpf: formatCpf(e.target.value) })} className="font-mono" />}
                    </Field>
                  </>
                ) : (
                  <p className="text-[12px] text-ink-3 sm:col-span-2">Titular: <strong className="font-medium text-ink">{payment.holderName}</strong> · CPF do cadastro no Lyceum (preenchido automaticamente).</p>
                )}
                <Field label="Forma de pagamento" required>
                  {() => <Segmented label="Forma de pagamento" layoutId="method" value={payment.method} onChange={(m: PaymentMethod) => set({ method: m })} options={[{ id: 'pix', label: 'Pix' }, { id: 'transferencia', label: 'Transferência bancária' }]} />}
                </Field>
                <div className="hidden sm:block" />
                {payment.method === 'pix' ? (
                  <>
                    <Field label="Tipo de chave" required>
                      {id => (
                        <Select id={id} value={payment.pixKeyType} onChange={e => set({ pixKeyType: e.target.value as PixKeyType, pixKey: e.target.value === 'cpf' ? payment.holderCpf : '' })}>
                          {pixKeyTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </Select>
                      )}
                    </Field>
                    <Field label="Chave Pix" required error={show('pixKey')}>
                      {id => <Input id={id} value={payment.pixKey} placeholder={pixKeyTypes.find(t => t.id === payment.pixKeyType)?.placeholder} onChange={e => set({ pixKey: e.target.value })} aria-invalid={!!show('pixKey')} />}
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Banco" required error={show('bankCode')}>
                      {id => (
                        <Select id={id} value={payment.bankCode} onChange={e => set({ bankCode: e.target.value })}>
                          <option value="">Selecione</option>
                          {banks.map(b => <option key={b.code} value={b.code}>{b.code} · {b.name}</option>)}
                        </Select>
                      )}
                    </Field>
                    <Field label="Tipo de conta" required>
                      {id => (
                        <Select id={id} value={payment.accountType} onChange={e => set({ accountType: e.target.value as PaymentData['accountType'] })}>
                          <option value="corrente">Conta corrente</option>
                          <option value="poupanca">Poupança</option>
                        </Select>
                      )}
                    </Field>
                    <Field label="Agência" required error={show('agency')}>{id => <Input id={id} inputMode="numeric" placeholder="0000" value={payment.agency} onChange={e => set({ agency: e.target.value })} className="font-mono" />}</Field>
                    <Field label="Conta com dígito" required error={show('account')}>{id => <Input id={id} placeholder="00000-0" value={payment.account} onChange={e => set({ account: e.target.value })} className="font-mono" />}</Field>
                  </>
                )}
              </div>
            </Section>

            {!correction &&
              (auto ? (
                <Callout tone="info" title="Registro no Lyceum automático (regra configurada)">
                  A integração registrará a solicitação na aba de devolução do Lyceum ao enviar. A confirmação manual não é exigida neste modo.
                </Callout>
              ) : (
                <div className="rounded-lg bg-crit-soft p-3.5">
                  <Check checked={confirmed} onChange={setConfirmed} tone="crit">
                    Confirmo que já registrei a solicitação na aba de devolução do Lyceum e conferi o valor do crédito.
                  </Check>
                  {show('lyceum') && <p role="alert" className="mt-1.5 pl-7 text-[11.5px] font-medium text-crit">{errors.lyceum}</p>}
                </div>
              ))}
            {error && <Callout tone="crit" title="Não foi possível enviar">{error}</Callout>}
          </div>
        )}

        {step === 'resultado' && result && <Result refund={result} onCopy={copy} />}
        {step === 'aluno' && error && <Callout tone="crit">{error}</Callout>}
      </div>

      <footer className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-surface px-5 py-3.5">
        {step === 'aluno' && (
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={!credit || !snapshot} onClick={() => setStep('pagamento')}>
              Continuar com {credit ? money(creditBalance(credit).available) : 'o crédito'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
        {step === 'pagamento' && (
          <>
            <Button variant="ghost" onClick={() => (correction ? onClose() : setStep('aluno'))}>
              {correction ? 'Cancelar' : <><ArrowLeft className="h-4 w-4" />Voltar</>}
            </Button>
            <Button variant="primary" disabled={saving || !snapshot} onClick={() => void submit()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Verificando…</> : <><CheckIcon className="h-4 w-4" />{correction ? 'Reenviar para verificação' : 'Registrar solicitação'}</>}
            </Button>
          </>
        )}
        {step === 'resultado' && result && (
          <>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button variant="primary" onClick={() => onOpenRefund(result.id)}>Abrir pedido<ArrowRight className="h-4 w-4" /></Button>
          </>
        )}
      </footer>
    </div>
  );
}

function withHolder(p: PaymentData, kind: HolderKind, snap: StudentFinancialSnapshot): PaymentData {
  const s = snap.student;
  if (kind === 'aluno') return { ...p, holderKind: kind, holderName: s.name, holderCpf: s.cpf, pixKey: p.pixKeyType === 'cpf' ? s.cpf : p.pixKey };
  if (kind === 'responsavel') return { ...p, holderKind: kind, holderName: s.responsible.name, holderCpf: s.responsible.cpf, pixKey: p.pixKeyType === 'cpf' ? s.responsible.cpf : p.pixKey };
  return { ...p, holderKind: kind, holderName: p.holderKind === 'outro' ? p.holderName : '', holderCpf: p.holderKind === 'outro' ? p.holderCpf : '' };
}

function Result({ refund, onCopy }: { refund: Refund; onCopy: (t: string) => void }) {
  const run = refund.checkRuns.at(-1)!;
  const url = links.tracking(refund.tracking.token);
  const tone = run.decision.status === 'aguardando_pagamento' ? 'money' : run.decision.status === 'correcao' ? 'warn' : 'warn';
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-medium text-ink-3">{refund.protocol} registrada</p>
        <h3 className="mt-1 text-[20px] font-semibold">{refund.student.name} · <span className="font-mono">{money(refund.amount)}</span></h3>
      </div>
      <Callout tone={tone} icon={<Sparkles className="h-4 w-4" />} title={run.decision.status === 'aguardando_pagamento' ? 'Encaminhada diretamente para Cobranças a Pagar' : run.decision.status === 'correcao' ? 'Devolvida para correção' : 'Enviada para Análise do Financeiro'}>
        {run.decision.summary}
      </Callout>
      <Section title={`Verificações automáticas · ${run.results.filter(r => r.outcome === 'aprovada').length} de ${run.results.length} aprovadas`}>
        <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="divide-y divide-hairline">
          {run.results.map(c => (
            <motion.li key={c.id} variants={staggerItem} className="flex items-start gap-2.5 py-2">
              <OutcomeIcon outcome={c.outcome} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{c.label}</p>
                <p className="text-[12px] leading-relaxed text-ink-3">{c.detail}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Section>
      <Section title="Link individual do aluno">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={url} onFocus={e => e.currentTarget.select()} className="font-mono text-[11.5px]" aria-label="Link individual" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onCopy(url)}><Copy className="h-3.5 w-3.5" />Copiar</Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2"><ExternalLink className="h-3.5 w-3.5" />Abrir</a>
          </div>
        </div>
        <p className="text-[11.5px] text-ink-4">O aluno não recebe e-mail agora: a confirmação só é gerada quando o pagamento for concluído.</p>
      </Section>
    </div>
  );
}
