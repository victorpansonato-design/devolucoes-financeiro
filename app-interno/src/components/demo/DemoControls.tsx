// Controles da apresentação: roteiro, alunos fictícios, regras configuráveis e restauração dos exemplos.
import { useState } from 'react';
import { AlertTriangle, Copy, PlayCircle, RotateCcw } from 'lucide-react';
import type { DemoDatabase } from '../../domain/types';
import { scenarios } from '../../demo/seedData';
import { dateTime } from '../../lib/format';
import type { RefundService } from '../../services/refundService';
import { Button } from '../ui/Button';
import { Check, Segmented } from '../ui/Fields';
import { Callout, Section, Tabs } from '../ui/Surfaces';

type Tab = 'roteiro' | 'alunos' | 'regras' | 'restaurar';

export const presentationScript: [string, string][] = [
  ['Solicitante · 1 min', 'Nova solicitação → RA 24100318 (Ana). Mostre o extrato, o crédito verde e o bloqueio do crédito já devolvido (RA 21400133). Preencha os dados fictícios, marque a confirmação em vermelho e registre: as 9 verificações passam e o pedido vai direto para Cobranças a Pagar.'],
  ['Financeiro · 1 min', 'Troque para Financeiro: o valor total em andamento aparece. Na visão de exceções, abra Rafael (devolução anterior no Lyceum) e registre a decisão com justificativa — ou encerre sem pagamento e veja que só a solicitante recebe e-mail.'],
  ['Cobranças a Pagar · 1 min', 'Troque de perfil, abra Ana, confirme o pagamento com data, "Anexar comprovante: Sim" (há um PDF fictício para baixar) e a declaração de execução. A baixa no Lyceum é registrada.'],
  ['Aluno · 1 min', 'No pedido, use "Prévia" ou "Abrir" do link individual: trilha concluída e comprovante. Mostre que não há RA, CPF, chave Pix ou extrato.'],
  ['Exceções · 1 min', 'Mariana: Solicitante corrige a conta (dica no formulário) e o pedido segue direto. Gustavo: pagamento confirmado com baixa pendente no Lyceum — Financeiro tenta de novo. Abra a Caixa de saída para mostrar os e-mails simulados.'],
];

export function DemoControls({ db, service, onReset, onNewRequest, onToast }: { db: DemoDatabase; service: RefundService; onReset: () => Promise<void>; onNewRequest: (ra: string) => void; onToast: (t: string) => void }) {
  const [tab, setTab] = useState<Tab>('roteiro');
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`RA ${text} copiado.`);
    } catch {
      onToast('Não foi possível copiar.');
    }
  };

  return (
    <div className="space-y-5 p-5">
      <Tabs layoutId="demo-tabs" active={tab} onChange={setTab} tabs={[{ id: 'roteiro', label: 'Roteiro de 5 minutos' }, { id: 'alunos', label: 'Alunos fictícios', count: scenarios.length }, { id: 'regras', label: 'Regras configuráveis' }, { id: 'restaurar', label: 'Restaurar' }]} />

      {tab === 'roteiro' && (
        <ol className="space-y-3">
          {presentationScript.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[11px] font-medium">{i + 1}</span>
              <div>
                <p className="text-[13px] font-semibold">{title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === 'alunos' && (
        <div className="space-y-2">
          <Callout tone="info">Todos os dados são inventados: RAs, nomes, CPFs de teste, e-mails .example, cobranças e créditos. Chave de sandbox <code className="font-mono">divergente@pix.example</code> força a correção automática.</Callout>
          {scenarios.map(s => {
            const st = db.lyceum.students.find(x => x.ra === s.ra)!;
            return (
              <div key={s.ra} className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-surface-2 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{st.name} <span className="ml-1 font-mono text-[12px] font-normal text-ink-3">{s.ra}</span></p>
                  <p className="text-[12px] font-medium text-ink-2">{s.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{s.description}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="xs" variant="ghost" onClick={() => void copy(s.ra)} aria-label={`Copiar RA ${s.ra}`}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="xs" onClick={() => onNewRequest(s.ra)}><PlayCircle className="h-3.5 w-3.5" />Consultar RA</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'regras' && (
        <div className="space-y-5">
          <Section title="Registro da solicitação no Lyceum">
            <Segmented
              label="Modo de registro no Lyceum"
              layoutId="lyceum-mode"
              value={db.config.lyceumRequestMode}
              onChange={mode => void service.updateConfig({ lyceumRequestMode: mode }).then(() => onToast(mode === 'manual' ? 'Confirmação manual em vermelho reativada.' : 'Registro automático ativado (visão futura).'))}
              options={[{ id: 'manual', label: 'Manual · confirmação do solicitante' }, { id: 'automatico', label: 'Automático · integração' }]}
            />
            <p className="text-[12px] leading-relaxed text-ink-3">Manual (hoje): o solicitante registra na aba de devolução do Lyceum e marca a confirmação em vermelho. Automático (visão futura): o sistema registra via integração e guarda a referência; a confirmação deixa de ser exigida.</p>
          </Section>
          <Section title="Integração Lyceum após pagamento">
            <Check checked={db.config.nextLyceumSyncFails} onChange={v => void service.updateConfig({ nextLyceumSyncFails: v })}>Simular falha na próxima baixa no Lyceum</Check>
          </Section>
          <Section title="Latência simulada das integrações">
            <Segmented label="Latência" layoutId="latency" value={String(db.config.latencyMs) as '0'} onChange={v => void service.updateConfig({ latencyMs: Number(v) })} options={[{ id: '0', label: 'Sem espera' }, { id: '450', label: '0,45 s' }, { id: '1200', label: '1,2 s' }]} />
          </Section>
        </div>
      )}

      {tab === 'restaurar' && (
        <div className="space-y-4">
          <Callout tone="crit" icon={<AlertTriangle className="h-4 w-4" />} title="Isto apaga o estado atual da apresentação">
            Pedidos criados, decisões, pagamentos, comprovantes anexados e e-mails simulados voltam aos exemplos iniciais. Links individuais antigos deixam de funcionar.
          </Callout>
          <p className="text-[12px] text-ink-3">Dados atuais: {db.refunds.length} pedidos, {db.outbox.length} e-mails simulados · exemplos criados em {dateTime(db.createdAt)}.</p>
          <Check checked={armed} onChange={setArmed}>Entendo que as alterações feitas nesta apresentação serão perdidas.</Check>
          <Button
            variant="danger"
            disabled={!armed || busy}
            onClick={async () => {
              setBusy(true);
              await onReset();
              setBusy(false);
              setArmed(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {busy ? 'Restaurando…' : 'Restaurar exemplos'}
          </Button>
        </div>
      )}
    </div>
  );
}
