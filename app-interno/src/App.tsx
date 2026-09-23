import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCheck, ChevronRight, CircleCheck, FileText, FlaskConical, Inbox, LayoutList, Mail, Menu, Moon, Plus, Search, ShieldAlert, Sun, X, Zap } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Card, Callout, EmptyState, Metric, Section } from './components/ui/Surfaces';
import { Chip, Segmented, Select } from './components/ui/Fields';
import { Avatar, Status, StatusBadge, Tag } from './components/ui/Badges';
import { Overlay } from './components/ui/Overlay';
import { RefundWizard } from './components/request/RefundWizard';
import { RefundDetail } from './components/detail/RefundDetail';
import { OutboxPanel } from './components/outbox/Outbox';
import { DemoControls } from './components/demo/DemoControls';
import { can, demoProfiles, roleLabel } from './domain/profiles';
import { failingChecks, hasLyceumPending, isConcluded, isMyTurn, isOpen, matchesStage, priority, responsibility, SLA_BUSINESS_DAYS, stageFilters, type StageFilter } from './domain/status';
import { failureLabel } from './domain/checks';
import type { Refund, Role } from './domain/types';
import { businessDays, date, money, plural } from './lib/format';
import { pageVariants, press, spring, toastVariants } from './lib/motion';
import { initRuntime, useDatabase, type Runtime } from './services/runtime';

type View = 'fila' | 'concluidas';
type WizardState = null | { ra?: string; correctionId?: string };
const PROFILE_KEY = 'devolucoes.demo.profile';
const sectorOptions = ['Financeiro', 'Cobranças a Pagar', 'Graduação', 'EAD', 'Técnico', 'Pós-graduação'];

const readProfile = () => {
  try {
    return demoProfiles.find(p => p.id === localStorage.getItem(PROFILE_KEY)) ?? demoProfiles[0]!;
  } catch {
    return demoProfiles[0]!;
  }
};

export default function App() {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [fatal, setFatal] = useState('');
  useEffect(() => {
    initRuntime().then(setRuntime, e => setFatal((e as Error).message));
  }, []);
  if (fatal) return <div className="flex min-h-screen items-center justify-center p-6"><Callout tone="crit" title="Não foi possível iniciar a demonstração">{fatal}</Callout></div>;
  if (!runtime)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas text-[13px] text-ink-3">
        <img src="/logo-anchieta.png" alt="Grupo Anchieta" className="w-[180px]" />
        Preparando a demonstração…
      </div>
    );
  return <Workspace runtime={runtime} />;
}

function Workspace({ runtime }: { runtime: Runtime }) {
  const db = useDatabase(runtime.store);
  const { service } = runtime;
  const [profile, setProfileState] = useState(readProfile);
  const [view, setView] = useState<View>('fila');
  const [stage, setStage] = useState<StageFilter>('all');
  const [sector, setSector] = useState('all');
  const [prio, setPrio] = useState<'all' | 'alta' | 'normal'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState>(null);
  const [panel, setPanel] = useState<null | 'outbox' | 'demo' | 'guide' | 'menu'>(null);
  const [toast, setToast] = useState(runtime.notice ?? '');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const searchRef = useRef<HTMLInputElement>(null);

  const setProfile = (id: string) => {
    const next = demoProfiles.find(p => p.id === id)!;
    setProfileState(next);
    try {
      localStorage.setItem(PROFILE_KEY, next.id);
    } catch {
      /* sem armazenamento */
    }
    setWizard(null);
    setToast(`Visualizando como ${roleLabel[next.role]} (simulação, não é login).`);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Link interno dos e-mails: #/pedido/<id>
  useEffect(() => {
    const open = () => {
      const id = location.hash.match(/^#\/pedido\/([\w-]+)$/)?.[1];
      if (id) setSelected(id);
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const openRefund = useCallback((id: string) => {
    setWizard(null);
    setPanel(null);
    setSelected(id);
  }, []);
  const closeRefund = () => {
    setSelected(null);
    if (location.hash.startsWith('#/pedido/')) history.replaceState(null, '', location.pathname);
  };

  const toggleTheme = () => {
    const value = !dark;
    setDark(value);
    document.documentElement.classList.toggle('dark', value);
    try {
      localStorage.setItem('devolucoes.v1.theme', value ? 'dark' : 'light');
    } catch {
      /* sem armazenamento */
    }
  };

  const refunds = useMemo(() => [...db.refunds].sort((a, b) => (priority(b).level === 'alta' ? 1 : 0) - (priority(a).level === 'alta' ? 1 : 0) || a.createdAt.localeCompare(b.createdAt)), [db.refunds]);
  const open = refunds.filter(isOpen);
  const done = [...refunds.filter(isConcluded)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const base = view === 'fila' ? open : done;
  const q = search.trim().toLowerCase();
  const filtered = base.filter(
    r =>
      matchesStage(r, view === 'fila' ? stage : 'all') &&
      (sector === 'all' || responsibility(r).sector === sector) &&
      (prio === 'all' || priority(r).level === prio) &&
      (!q || r.student.ra.startsWith(q) || `${r.student.name} ${r.protocol}`.toLowerCase().includes(q)),
  );
  const exactRa = q && /^\d+$/.test(q) ? filtered.filter(r => r.student.ra === q) : [];
  const current = db.refunds.find(r => r.id === selected) ?? null;
  const correction = wizard?.correctionId ? db.refunds.find(r => r.id === wizard.correctionId) ?? null : null;
  const inProgressTotal = db.refunds.filter(r => ['analise_financeiro', 'correcao', 'aguardando_pagamento'].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const count = (fn: (r: Refund) => boolean) => open.filter(fn).length;
  const clearFilters = () => {
    setStage('all');
    setSector('all');
    setPrio('all');
    setSearch('');
  };

  const nav = (
    <>
      <div className="flex h-[88px] shrink-0 items-center px-5">
        <img src="/logo-anchieta.png" alt="Grupo Anchieta" className="h-auto w-[176px] object-contain" />
      </div>
      <div className="px-5 pb-4 text-[12px] font-medium text-ink-3">Devoluções financeiras</div>
      <nav aria-label="Navegação principal" className="space-y-1 px-3">
        {([
          { id: 'fila', label: 'Fila de devoluções', icon: LayoutList, badge: open.length },
          { id: 'concluidas', label: 'Concluídas', icon: CircleCheck },
        ] as const).map(item => (
          <motion.button key={item.id} whileTap={press} onClick={() => { setView(item.id); clearFilters(); setPanel(null); }} aria-current={view === item.id ? 'page' : undefined} className={`relative flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${view === item.id ? 'text-on-brand' : 'text-ink-2 hover:bg-surface-2'}`}>
            {view === item.id && <motion.span layoutId="sidebar-active" transition={spring} className="absolute inset-0 rounded-md bg-brand" />}
            <item.icon className="relative h-4 w-4" />
            <span className="relative flex-1">{item.label}</span>
            {'badge' in item && <span className={`relative rounded-sm px-1.5 font-mono text-[10.5px] ${view === item.id ? 'bg-white/15' : 'bg-surface-2 text-ink-3'}`}>{item.badge}</span>}
          </motion.button>
        ))}
      </nav>
      <div className="mt-auto space-y-3 p-4">
        <Button variant="ghost" size="sm" onClick={() => setPanel('guide')} className="w-full justify-start"><FileText className="h-4 w-4" />Como funciona</Button>
        <button type="button" onClick={() => setPanel('demo')} className="block w-full rounded-xl bg-surface-2 p-3.5 text-left transition-colors hover:bg-surface-3">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold"><FlaskConical className="h-3.5 w-3.5 text-warn" />Modo demonstração</span>
          <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-3">Dados fictícios, integrações simuladas, nada é enviado ou pago. Roteiro e restauração aqui.</span>
        </button>
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={profile.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{profile.name}</p>
            <p className="text-[11px] text-ink-3">{profile.team} · perfil simulado</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col bg-surface lg:flex">{nav}</aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-hairline bg-surface/90 backdrop-blur-xl">
          <div className="flex h-[60px] items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="sm" square onClick={() => setPanel('menu')} aria-label="Abrir menu" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
              <button type="button" onClick={() => setPanel('demo')} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-warn-soft px-2.5 text-[11.5px] font-semibold text-warn-ink">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-warn text-warn" />Modo demonstração
              </button>
              <span className="hidden items-center gap-2 text-[12px] text-ink-3 xl:flex">Financeiro<ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-ink">Devoluções</span></span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden text-[11.5px] text-ink-3 2xl:block">Perfil de apresentação</span>
              <div className="hidden md:block">
                <Segmented label="Perfil de apresentação" layoutId="profile-switch" value={profile.id} onChange={setProfile} options={demoProfiles.map(p => ({ id: p.id, label: roleLabel[p.role] }))} />
              </div>
              <Select aria-label="Perfil de apresentação" value={profile.id} onChange={e => setProfile(e.target.value)} className="w-[150px] md:hidden">
                {demoProfiles.map(p => <option key={p.id} value={p.id}>{roleLabel[p.role]}</option>)}
              </Select>
              <Button variant="ghost" size="sm" square aria-label="Caixa de saída demonstrativa" onClick={() => setPanel('outbox')} className="relative"><Mail className="h-4 w-4" /><span className="absolute -top-0.5 -right-0.5 rounded-sm bg-surface-3 px-1 font-mono text-[9.5px] text-ink-2">{db.outbox.length}</span></Button>
              <Button variant="ghost" size="sm" square aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={toggleTheme} className="hidden sm:inline-flex">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
          <motion.div key={`${view}-${profile.id}`} variants={pageVariants} initial="initial" animate="animate" className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[24px] leading-[1.15] font-semibold sm:text-[30px]">{view === 'fila' ? 'Fila de devoluções' : 'Concluídas'}</h1>
                <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-ink-3">
                  {view === 'fila' ? 'Uma fila compartilhada por todos os setores. Cada pedido mostra quem precisa agir agora.' : 'Pagamentos confirmados com baixa no Lyceum e solicitações encerradas sem pagamento.'}
                </p>
              </div>
              {can.create(profile.role) && (
                <Button variant="primary" onClick={() => setWizard({})}><Plus className="h-4 w-4" />Nova solicitação</Button>
              )}
            </div>

            {view === 'fila' && (
              <div className={`grid grid-cols-2 gap-x-4 gap-y-5 py-1 ${can.viewTotals(profile.role) ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
                <Metric value={String(open.length).padStart(2, '0')} label="Em andamento" />
                <Metric value={String(count(r => r.status === 'analise_financeiro')).padStart(2, '0')} label="Análise do Financeiro" />
                <Metric value={String(count(r => r.status === 'correcao')).padStart(2, '0')} label="Correção solicitada" />
                <Metric value={String(count(r => r.status === 'aguardando_pagamento')).padStart(2, '0')} label="Aguardando pagamento" tone={profile.role === 'pagamentos' ? 'brand' : undefined} />
                {can.viewTotals(profile.role) && <Metric value={money(inProgressTotal)} label="Valor em andamento total" tone={profile.role === 'financeiro' ? 'brand' : undefined} />}
              </div>
            )}

            {view === 'fila' && profile.role === 'financeiro' && <FinanceOverview refunds={db.refunds} onOpen={openRefund} />}

            <Card>
              <div className="space-y-3 px-4 pt-4 sm:px-5">
                <div className="flex flex-col gap-2.5 lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
                    <input
                      ref={searchRef}
                      type="search"
                      inputMode="search"
                      aria-label="Busca rápida por RA, aluno ou protocolo"
                      placeholder="Busca rápida pelo RA (tecla /), aluno ou protocolo"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && filtered.length === 1) openRefund(filtered[0]!.id);
                      }}
                      className="h-9 w-full rounded-md bg-surface-2 pr-8 pl-9 text-[13px] transition-colors outline-none placeholder:text-ink-4 hover:bg-surface-3 focus:ring-2 focus:ring-focus [&::-webkit-search-cancel-button]:hidden"
                    />
                    {search && <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-4 hover:text-ink"><X className="h-4 w-4" /></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 lg:flex">
                    <Select aria-label="Setor responsável" value={sector} onChange={e => setSector(e.target.value)} className="lg:w-[200px]">
                      <option value="all">Todos os setores</option>
                      {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select aria-label="Prioridade" value={prio} onChange={e => setPrio(e.target.value as typeof prio)} className="lg:w-[160px]">
                      <option value="all">Todas as prioridades</option>
                      <option value="alta">Prioridade alta</option>
                      <option value="normal">Prioridade normal</option>
                    </Select>
                  </div>
                </div>
                {view === 'fila' && (
                  <div className="scroll-slim -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Filtrar por etapa">
                    {stageFilters.map(f => <Chip key={f.id} active={stage === f.id} onClick={() => setStage(f.id)} count={open.filter(r => matchesStage(r, f.id)).length}>{f.label}</Chip>)}
                  </div>
                )}
                {exactRa.length > 0 && <p className="text-[12px] text-ink-3">RA {q}: {plural(exactRa.length, 'pedido encontrado', 'pedidos encontrados')}{exactRa.length === 1 && ' · Enter abre o pedido'}.</p>}
              </div>

              <div className="mt-3 hidden grid-cols-[minmax(210px,1.6fr)_minmax(150px,1fr)_110px_minmax(170px,1.1fr)_minmax(190px,1.3fr)_96px_16px] gap-4 border-y border-hairline px-5 py-2 text-[11px] font-medium text-ink-3 xl:grid">
                <span>Aluno · protocolo</span>
                <span>Crédito</span>
                <span className="text-right">Valor</span>
                <span>Etapa</span>
                <span>Quem age agora</span>
                <span>Prazo</span>
                <span />
              </div>
              {filtered.length ? (
                <ul className="mt-3 divide-y divide-hairline border-t border-hairline xl:mt-0 xl:border-t-0">
                  {filtered.map(r => <QueueRow key={r.id} refund={r} mine={isMyTurn(r, profile)} onOpen={() => openRefund(r.id)} role={profile.role} />)}
                </ul>
              ) : (
                <EmptyState
                  title={base.length ? 'Nenhum pedido com esses filtros' : view === 'fila' ? 'Fila vazia' : 'Nada concluído ainda'}
                  message={base.length ? 'Tente outro RA ou remova os filtros.' : 'Os pedidos aparecem aqui assim que chegarem a esta etapa.'}
                  action={base.length ? <Button size="sm" onClick={clearFilters}>Limpar filtros</Button> : undefined}
                />
              )}
              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-3 text-[11px] text-ink-3">
                <span>{plural(filtered.length, 'pedido', 'pedidos')}</span>
                <span>Prazo informado: até {SLA_BUSINESS_DAYS} dias úteis a partir do cadastro · prioridade alta a partir de 10 dias úteis ou pendência Lyceum</span>
              </footer>
            </Card>
          </motion.div>
        </main>
      </div>

      <Overlay open={!!current && !wizard} title={current?.protocol ?? ''} drawer size="md" onClose={closeRefund}>
        {current && <RefundDetail key={current.id} refund={current} db={db} profile={profile} service={service} onToast={setToast} onCorrect={() => setWizard({ correctionId: current.id })} />}
      </Overlay>

      <Overlay open={!!wizard} title={correction ? `Corrigir ${correction.protocol}` : 'Nova solicitação de devolução'} subtitle={correction ? 'As verificações serão executadas de novo ao reenviar.' : 'Consulta pelo RA no Lyceum (simulado). Só crédito elegível pode ser selecionado.'} size="xl" onClose={() => setWizard(null)}>
        {wizard && (can.create(profile.role) || correction) && <RefundWizard key={wizard.correctionId ?? wizard.ra ?? 'new'} service={service} profile={profile} db={db} correction={correction ?? undefined} initialRa={wizard.ra} onOpenRefund={openRefund} onClose={() => setWizard(null)} onToast={setToast} />}
        {wizard && !can.create(profile.role) && !correction && <div className="p-5"><Callout tone="warn">Apenas o perfil Solicitante registra solicitações. Troque o perfil de apresentação no topo.</Callout></div>}
      </Overlay>

      <Overlay open={panel === 'outbox'} title="Caixa de saída demonstrativa" subtitle="E-mails simulados — nenhum foi enviado" drawer size="lg" onClose={() => setPanel(null)}>
        <OutboxPanel emails={db.outbox} onOpenRefund={openRefund} />
      </Overlay>

      <Overlay open={panel === 'demo'} title="Controles da demonstração" subtitle="Roteiro, alunos fictícios, regras configuráveis e restauração" size="lg" onClose={() => setPanel(null)}>
        <DemoControls
          db={db}
          service={service}
          onToast={setToast}
          onNewRequest={ra => {
            setPanel(null);
            if (profile.role !== 'solicitante') setProfile('solicitante');
            setWizard({ ra });
          }}
          onReset={async () => {
            await runtime.reset();
            setSelected(null);
            setWizard(null);
            setPanel(null);
            clearFilters();
            setToast('Exemplos restaurados.');
          }}
        />
      </Overlay>

      <Overlay open={panel === 'guide'} title="Como funciona" size="lg" onClose={() => setPanel(null)}>
        <Guide />
      </Overlay>

      <Overlay open={panel === 'menu'} title="Devoluções" onClose={() => setPanel(null)} size="md">
        <div className="flex min-h-[520px] flex-col">{nav}</div>
      </Overlay>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" variants={toastVariants} initial="initial" animate="animate" exit="exit" className="fixed right-4 bottom-5 left-4 z-[60] flex items-center gap-3 rounded-xl bg-ink px-5 py-4 text-[13px] text-canvas shadow-overlay sm:left-auto sm:max-w-md">
            <CheckCheck className="h-4 w-4 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QueueRow({ refund: r, mine, onOpen, role }: { refund: Refund; mine: boolean; onOpen: () => void; role: Role }) {
  const who = responsibility(r);
  const p = priority(r);
  const days = businessDays(r.createdAt);
  return (
    <li className="relative">
      {p.level === 'alta' && <span className={`absolute inset-y-0 left-0 w-0.5 ${p.overdue || r.lyceumSync?.status === 'falhou' ? 'bg-crit' : 'bg-risk'}`} />}
      <motion.button whileTap={{ scale: 0.995 }} onClick={onOpen} aria-label={`Abrir ${r.protocol} de ${r.student.name}`} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-hover sm:px-5 xl:grid-cols-[minmax(210px,1.6fr)_minmax(150px,1fr)_110px_minmax(170px,1.1fr)_minmax(190px,1.3fr)_96px_16px]">
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.student.name} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium">{r.student.name}</span>
            <span className="mt-0.5 block text-[11px] text-ink-3">RA <span className="font-mono">{r.student.ra}</span> · <span className="font-mono">{r.protocol}</span></span>
          </span>
        </span>
        <span className="hidden min-w-0 text-[12px] text-ink-2 xl:block">
          <span className="block truncate">{r.credit.origin}</span>
          <span className="block truncate text-[11px] text-ink-4">{r.payment.method === 'pix' ? 'Pix' : 'Transferência'} · {r.requester.sector}</span>
        </span>
        <span className={`text-right font-mono text-[13.5px] font-medium ${r.status === 'pago' ? 'text-money' : r.status === 'encerrado' ? 'text-ink-3' : 'text-ink'}`}>{money(r.amount)}</span>
        <span className="min-w-0"><StatusBadge refund={r} /></span>
        <span className="min-w-0 text-[12px] text-ink-2">
          {who.sector ? (
            <>
              <span className="flex items-center gap-1.5 font-semibold text-ink">{who.sector}{mine && <Tag tone="brand">Seu perfil</Tag>}</span>
              <span className="block truncate text-[11px] text-ink-3">{who.action}</span>
            </>
          ) : (
            <span className="text-ink-3">{who.action}</span>
          )}
        </span>
        <span className="text-[11.5px] text-ink-3 xl:text-left">
          {isOpen(r) ? (
            <>
              {p.level === 'alta' ? <Status tone={p.overdue || r.lyceumSync?.status === 'falhou' ? 'crit' : 'risk'} solid>Alta</Status> : <span className="font-medium text-ink-2">Normal</span>}
              <span className="block">{hasLyceumPending(r) ? 'pago' : `${days} de ${SLA_BUSINESS_DAYS} dias úteis`}</span>
            </>
          ) : (
            <span>{r.status === 'pago' ? `pago em ${date(r.paymentRecord?.paidAt)}` : `encerrado em ${date(r.closure?.at)}`}</span>
          )}
        </span>
        <ChevronRight className="hidden h-4 w-4 text-ink-4 xl:block" />
        {role === 'financeiro' && r.status === 'analise_financeiro' && (
          <span className="col-span-2 text-[11.5px] text-warn-ink xl:col-span-7 xl:pl-[46px]">Exceção: {failingChecks(r).map(c => failureLabel[c.id]).join(' · ')}</span>
        )}
      </motion.button>
    </li>
  );
}

function FinanceOverview({ refunds, onOpen }: { refunds: Refund[]; onOpen: (id: string) => void }) {
  const exceptions = refunds.filter(r => r.status === 'analise_financeiro');
  const lyceum = refunds.filter(r => hasLyceumPending(r) && r.lyceumSync?.status === 'falhou');
  const firstRuns = refunds.map(r => r.checkRuns[0]).filter(Boolean);
  const direct = firstRuns.filter(run => run!.decision.rule === 'encaminhamento_direto').length;
  const waiting = refunds.filter(r => r.status === 'aguardando_pagamento');
  const items = [...exceptions, ...lyceum];
  return (
    <Card className="p-5">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Section title={`Exceções e pendências do Financeiro · ${items.length}`}>
          {items.length ? (
            <ul className="divide-y divide-hairline">
              {items.map(r => (
                <li key={r.id}>
                  <button type="button" onClick={() => onOpen(r.id)} className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-surface-hover">
                    <ShieldAlert className={`mt-0.5 h-4 w-4 shrink-0 ${r.status === 'pago' ? 'text-crit' : 'text-warn'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{r.student.name} · <span className="font-mono">{money(r.amount)}</span></span>
                      <span className="block text-[12px] text-ink-3">{r.status === 'pago' ? `Baixa no Lyceum falhou após pagamento: ${r.lyceumSync?.error}` : failingChecks(r).map(c => c.detail).join(' ')}</span>
                    </span>
                    <span className="shrink-0 text-[12px] font-medium text-brand-text">{r.status === 'pago' ? 'Tratar' : 'Decidir'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-[12px] text-ink-3">Nenhuma exceção aguardando decisão.</p>
          )}
        </Section>
        <Section title="Acompanhamento do fluxo automático">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-money" />
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">{direct} de {firstRuns.length}</strong> pedidos seguiram direto para Cobranças a Pagar, sem aprovação manual. O Financeiro atua nas exceções.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">{waiting.length}</strong> aguardando pagamento ({money(waiting.reduce((s, r) => s + r.amount, 0))}). Retenha para análise se identificar risco.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </Card>
  );
}

function Guide() {
  const steps: [string, string][] = [
    ['1. Solicitante', 'Informa o RA; o Lyceum traz cadastro, extrato e créditos. Escolhe um crédito elegível, informa só os dados de pagamento que faltam e confirma o registro na aba de devolução do Lyceum.'],
    ['2. Verificações automáticas', 'Nove regras: crédito localizado, devolução anterior, pedido duplicado, saldo, cobranças vencidas, registro no Lyceum, dados de pagamento, titularidade e pré-validação bancária.'],
    ['3. Encaminhamento', 'Tudo aprovado: vai direto para Cobranças a Pagar. Duplicidade, saldo insuficiente ou inconsistência: Análise do Financeiro. Dados errados: Correção solicitada.'],
    ['4. Financeiro', 'Acompanha o fluxo e decide exceções com justificativa registrada. Duplicidade confirmada não pode ser encaminhada.'],
    ['5. Cobranças a Pagar', 'Executa o pagamento fora do sistema e confirma aqui a data, a execução conferida e o comprovante (opcional). Agendamento não conta como pagamento.'],
    ['6. Lyceum e aluno', 'Após o pagamento, a baixa é registrada no Lyceum (com pendência clara se falhar) e o aluno recebe a confirmação com o link individual.'],
  ];
  return (
    <div className="space-y-5 p-5">
      <div className="space-y-4">
        {steps.map(([title, text]) => (
          <div key={title}>
            <h3 className="text-[13px] font-semibold">{title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{text}</p>
          </div>
        ))}
      </div>
      <Callout tone="warn" title="Demonstração">
        Perfis são alternância de apresentação, não autenticação. Lyceum, e-mail, pagamento e link público são simulados no navegador. A TI implementa SSO, API, autorização no servidor e integrações reais.
      </Callout>
    </div>
  );
}
