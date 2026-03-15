"use client";
import { useEffect, useState, useCallback, memo } from "react";
import { Plus, Pencil, Check, X, CreditCard, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { TIPO_DESPESA_LABEL, TIPO_DESPESA_COR, type TipoDespesa } from "@/types/financeiro";
export const dynamic = 'force-dynamic';

function parseBR(v: string): number {
  if (v.includes(",")) return parseFloat(v.replace(/\./g, "").replace(",", "."));
  return parseFloat(v);
}
function fmt(v: number) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function fmtData(d: string | null) {
  if (!d) return null;
  return new Date(String(d).split("T")[0] + "T12:00:00").toLocaleDateString("pt-BR");
}
// Converte dd/mm/aaaa → aaaa-mm-dd para salvar
function parseDateBR(v: string): string | null {
  if (!v) return null;
  const parts = v.split("/");
  if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  // Se já vier no formato ISO aceita também
  if (v.match(/^\d{4}-\d{2}-\d{2}$/)) return v;
  return null;
}
// Converte aaaa-mm-dd → dd/mm/aaaa para exibir no input
function isoParaBR(d: string | null): string {
  if (!d) return "";
  const s = String(d).split("T")[0];
  const [y, m, dd] = s.split("-");
  return `${dd}/${m}/${y}`;
}

// Máscara de data com auto-advance inteligente
// Regra: se o dígito digitado torna o campo impossível, avança automaticamente
// Ex: digitar "4" no dia → impossível ter dia >= 40 → avança para mês
// Ex: digitar "2" no dia (se anterior já era 1) → dd completo → avança para mês
function maskDate(raw: string, prev: string): string {
  const prevDigits = prev.replace(/\D/g, "");
  const rawDigits = raw.replace(/\D/g, "");

  // Backspace / apagando — retorna sem forçar máscara
  if (rawDigits.length < prevDigits.length) {
    if (rawDigits.length <= 2) return rawDigits;
    if (rawDigits.length <= 4) return rawDigits.slice(0, 2) + "/" + rawDigits.slice(2);
    return rawDigits.slice(0, 2) + "/" + rawDigits.slice(2, 4) + "/" + rawDigits.slice(4, 8);
  }

  let d = rawDigits.slice(0, 8); // máx 8 dígitos (ddmmaaaa)

  // Segmento DIA (posições 0-1)
  if (d.length >= 1) {
    const d1 = parseInt(d[0]);
    // Se primeiro dígito do dia > 3, impossível ser dia válido → insere 0 na frente
    if (d1 > 3) d = "0" + d;
  }
  if (d.length >= 2) {
    const day = parseInt(d.slice(0, 2));
    // Se dia > 31, corta para 2 dígitos zerados
    if (day > 31) d = "0" + d.slice(0, 1) + d.slice(2);
  }

  // Segmento MÊS (posições 2-3)
  if (d.length >= 3) {
    const m1 = parseInt(d[2]);
    // Se primeiro dígito do mês > 1, impossível ser mês válido → insere 0
    if (m1 > 1) d = d.slice(0, 2) + "0" + d.slice(2);
  }
  if (d.length >= 4) {
    const month = parseInt(d.slice(2, 4));
    if (month > 12) d = d.slice(0, 2) + "0" + d[2] + d.slice(4);
  }

  // Monta string com separadores
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yy = d.slice(4, 8);

  if (d.length <= 2) return dd;
  if (d.length <= 4) return dd + "/" + mm;
  return dd + "/" + mm + "/" + yy;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface Item {
  id: number;
  descricao: string;
  tipo_despesa: TipoDespesa | null;
  valor: number;
  data_vencimento: string | null;
  recorrente: boolean;
  conta_id: number | null;
  conta_nome: string | null;
  conta_cor: string | null;
  observacao: string | null;
  transacao_id: number | null;
  data_pagamento: string | null;
  valor_pago: number | null;
  conta_paga_nome: string | null;
}
interface Conta { id: number; nome: string; cor: string; saldo_atual: number; fluxo_caixa: boolean; }
type EditForm = {
  descricao: string; valor: string; tipo_despesa: string;
  data_vencimento: string; conta_id: string; observacao: string; recorrente: boolean;
};

const inputSty = {
  background: "var(--surface2)", border: "1px solid var(--border)",
  color: "var(--text)", borderRadius: 8, padding: "4px 8px", fontSize: 13, width: "100%",
} as const;
const thSty = {
  color: "var(--text-muted)", textAlign: "left" as const, padding: "10px 16px",
  fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em",
};

// ── Card ──────────────────────────────────────────────────────────────────────
const CardItem = memo(function CardItem({ item, contas, mes, ano, onPagar, onSalvar, onDesativar, onToggleRecorrente, busca }: {
  item: Item; contas: Conta[]; mes: number; ano: number;
  onPagar: (id: number, valor: number, conta_id: number | null) => void;
  onSalvar: (id: number, form: EditForm) => void;
  onDesativar: (id: number) => void;
  onToggleRecorrente: (id: number, recorrente: boolean) => void;
  busca: string;
}) {
  const [editando, setEditando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [form, setForm] = useState<EditForm>({

    descricao: item.descricao,
    valor: String(item.valor),
    tipo_despesa: item.tipo_despesa ?? "",
    data_vencimento: isoParaBR(item.data_vencimento),
    conta_id: String(item.conta_id ?? ""),
    observacao: item.observacao ?? "",
    recorrente: item.recorrente ?? true,
  });
  const [valorPgto, setValorPgto] = useState(String(item.valor));
  const [contaPgto, setContaPgto] = useState(String(item.conta_id ?? ""));

  // Atualiza form se item mudar (ex: após salvar)
  useEffect(() => {
    setForm({
      descricao: item.descricao, valor: String(item.valor),
      tipo_despesa: item.tipo_despesa ?? "",
      data_vencimento: isoParaBR(item.data_vencimento),
      conta_id: String(item.conta_id ?? ""), observacao: item.observacao ?? "",
      recorrente: item.recorrente ?? true,
    });
    setValorPgto(String(item.valor));
    setContaPgto(String(item.conta_id ?? ""));
  }, [item]);

  const pago = !!item.data_pagamento;
  const cor = item.tipo_despesa ? TIPO_DESPESA_COR[item.tipo_despesa] : "#64748b";
  const label = item.tipo_despesa ? TIPO_DESPESA_LABEL[item.tipo_despesa] : null;

  function highlight(text: string) {
    if (!busca.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(busca.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return <>{text.slice(0, idx)}<mark style={{ background: "#fde68a", borderRadius: 2 }}>{text.slice(idx, idx + busca.length)}</mark>{text.slice(idx + busca.length)}</>;
  }

  if (editando) return (
    <tr style={{ background: "var(--surface2)", borderTop: "1px solid var(--border)" }}>
      <td colSpan={8} className="px-3 py-3">
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="col-span-2">
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Descrição</p>
            <input style={inputSty} value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Valor</p>
            <input style={inputSty} value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Vencimento (dd/mm/aaaa)</p>
            <input style={inputSty} placeholder="dd/mm/aaaa" value={form.data_vencimento} maxLength={10}
              onChange={e => setForm(f => ({ ...f, data_vencimento: maskDate(e.target.value, f.data_vencimento) }))} />
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Tipo</p>
            <select style={inputSty} value={form.tipo_despesa}
              onChange={e => setForm(f => ({ ...f, tipo_despesa: e.target.value }))}>
              <option value="">—</option>
              {Object.entries(TIPO_DESPESA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Conta padrão</p>
            <select style={inputSty} value={form.conta_id}
              onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))}>
              <option value="">—</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Observação</p>
            <input style={inputSty} value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditando(false)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}>
            <X size={12} /> Cancelar
          </button>
          <button onClick={() => { onSalvar(item.id, form); setEditando(false); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "#0ea5e9", color: "#fff" }}>
            <Check size={12} /> Salvar
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <tr className="border-t" style={{
        borderColor: "var(--border)",
        background: pago ? "var(--surface2)" : "var(--surface)",
        opacity: pago ? 0.75 : 1,
      }}>
        {/* Recorrente toggle */}
        <td className="px-4 py-3 text-center">
          <button
            onClick={() => onToggleRecorrente(item.id, !item.recorrente)}
            title={item.recorrente ? "Recorrente — clique para desmarcar" : "Não recorrente — clique para marcar"}
            className="flex items-center justify-center mx-auto w-6 h-6 rounded-full transition-colors"
            style={{
              background: item.recorrente ? "#dbeafe" : "var(--surface2)",
              color: item.recorrente ? "#1d4ed8" : "var(--text-muted)",
              border: `1px solid ${item.recorrente ? "#93c5fd" : "var(--border)"}`,
            }}>
            <RefreshCw size={11} />
          </button>
        </td>

        {/* Vencimento */}
        <td className="px-4 py-3 text-sm" style={{ minWidth: 90 }}>
          {item.data_vencimento
            ? <span className="font-medium" style={{ color: "var(--text)" }}>{fmtData(item.data_vencimento)}</span>
            : <span style={{ color: "var(--text-muted)" }}>—</span>}
        </td>

        {/* Descrição */}
        <td className="px-4 py-3">
          <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{highlight(item.descricao)}</p>
          {item.observacao && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{highlight(item.observacao)}</p>}
        </td>

        {/* Tipo */}
        <td className="px-4 py-3">
          {label && <span className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: cor + "22", color: cor }}>{label}</span>}
        </td>

        {/* Conta */}
        <td className="px-4 py-3">
          {item.conta_nome && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: item.conta_cor ?? "#64748b" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.conta_nome}</span>
            </div>
          )}
        </td>

        {/* Valor */}
        <td className="px-4 py-3 text-right">
          <p className="font-semibold text-sm" style={{ color: pago ? "#22c55e" : "#ef4444" }}>
            R$ {fmt(pago && item.valor_pago ? item.valor_pago : item.valor)}
          </p>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {pago ? (
            <div>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "#dcfce7", color: "#166534" }}>
                <Check size={10} /> Pago {fmtData(item.data_pagamento)}
              </span>
              {item.conta_paga_nome && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.conta_paga_nome}</p>
              )}
            </div>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#fee2e2", color: "#991b1b" }}>Pendente</span>
          )}
        </td>

        {/* Ações */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 justify-end">
            <button onClick={() => setPagando(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "#dcfce7", color: "#166534" }}>
              <CreditCard size={13} /> Pagar
            </button>
            <button onClick={() => setEditando(true)} className="p-1.5 rounded-lg"
              style={{ color: "var(--text-muted)" }}>
              <Pencil size={13} />
            </button>
            <button onClick={() => { if (confirm("Remover da lista?")) onDesativar(item.id); }}
              className="p-1.5 rounded-lg" style={{ color: "#ef4444" }}>
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Painel pagar */}
      {pagando && (
        <tr style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0" }}>
          <td colSpan={8} className="px-4 py-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: "#166534" }}>Valor pago</p>
                <input style={{ ...inputSty, width: 150 }} value={valorPgto}
                  onChange={e => setValorPgto(e.target.value)} />
              </div>
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: "#166534" }}>Conta</p>
                <select style={{ ...inputSty, width: 170 }} value={contaPgto}
                  onChange={e => setContaPgto(e.target.value)}>
                  <option value="">—</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button onClick={() => {
                const v = parseBR(valorPgto);
                const c = contaPgto ? parseInt(contaPgto) : item.conta_id;
                onPagar(item.id, isNaN(v) ? item.valor : v, c);
                setPagando(false);
              }} className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "#16a34a", color: "#fff" }}>
                <Check size={14} /> Confirmar
              </button>
              <button onClick={() => setPagando(false)} className="p-1.5" style={{ color: "#166534" }}>
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

// ── Página ────────────────────────────────────────────────────────────────────
export default function PagamentosPage() {
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [itens, setItens] = useState<Item[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novoForm, setNovoForm] = useState<EditForm>({
    descricao: "", valor: "", tipo_despesa: "",
    data_vencimento: "", conta_id: "", observacao: "", recorrente: true,
  });

  const carregar = useCallback(async (m: number, a: number) => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch(`/api/pagamentos?mes=${m}&ano=${a}`),
      fetch("/api/contas/saldos"),
    ]);
    setItens(await pRes.json());
    setContas(await cRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(mes, ano); }, [mes, ano, carregar]);

  function navMes(dir: number) {
    let m = mes + dir, a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAno(a);
  }

  const pagar = useCallback(async (id: number, valor: number, conta_id: number | null) => {
    const res = await fetch(`/api/pagamentos/${id}/pagar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor, conta_id, mes, ano }),
    });
    if (!res.ok) { const e = await res.json(); alert("Erro: " + e.error); return; }
    carregar(mes, ano);
  }, [mes, ano, carregar]);

  const salvar = useCallback(async (id: number, f: EditForm) => {
    const res = await fetch(`/api/pagamentos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: f.descricao,
        valor: parseBR(f.valor),
        tipo_despesa: f.tipo_despesa || null,
        data_vencimento: parseDateBR(f.data_vencimento),
        conta_id: f.conta_id ? parseInt(f.conta_id) : null,
        observacao: f.observacao || null,
      }),
    });
    if (!res.ok) { const e = await res.json(); alert("Erro: " + e.error); return; }
    carregar(mes, ano);
  }, [mes, ano, carregar]);

  const desativar = useCallback(async (id: number) => {
    await fetch(`/api/pagamentos/${id}`, { method: "DELETE" });
    carregar(mes, ano);
  }, [mes, ano, carregar]);

  const toggleRecorrente = useCallback(async (id: number, recorrente: boolean) => {
    const item = itens.find(x => x.id === id);
    if (!item) return;
    await fetch(`/api/pagamentos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: item.descricao, valor: item.valor,
        tipo_despesa: item.tipo_despesa, data_vencimento: item.data_vencimento
          ? String(item.data_vencimento).split("T")[0] : null,
        conta_id: item.conta_id, observacao: item.observacao, recorrente,
      }),
    });
    carregar(mes, ano);
  }, [itens, mes, ano, carregar]);

  const adicionar = async () => {
    if (!novoForm.descricao || !novoForm.valor) return;
    setSalvando(true);
    const res = await fetch("/api/pagamentos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: novoForm.descricao,
        valor: parseBR(novoForm.valor),
        tipo_despesa: novoForm.tipo_despesa || null,
        data_vencimento: parseDateBR(novoForm.data_vencimento),
        conta_id: novoForm.conta_id ? parseInt(novoForm.conta_id) : null,
        observacao: novoForm.observacao || null,
        recorrente: novoForm.recorrente ?? true,
      }),
    });
    setSalvando(false);
    if (!res.ok) { const e = await res.json(); alert("Erro: " + e.error); return; }
    setNovoForm({ descricao: "", valor: "", tipo_despesa: "", data_vencimento: "", conta_id: "", observacao: "", recorrente: true });
    setMostraForm(false);
    carregar(mes, ano);
  };

  const filtrados = busca.trim()
    ? itens.filter(p =>
      p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      (p.observacao ?? "").toLowerCase().includes(busca.toLowerCase())
    )
    : itens;

  const agora2 = new Date();
  const mesAtual = agora2.getMonth() + 1;
  const anoAtual = agora2.getFullYear();
  const isFuturo = ano > anoAtual || (ano === anoAtual && mes > mesAtual);

  // Itens que entram no cálculo do mês (recorrentes sempre; não-recorrentes só no mês atual)
  const itensDoMes = isFuturo ? itens.filter(p => p.recorrente) : itens;

  const pagos = itens.filter(p => p.data_pagamento);
  const totalPago = pagos.reduce((acc, p) => acc + Number(p.valor_pago ?? p.valor), 0);

  // Pendentes com data dentro do mês (ou sem data no mês atual)
  const pendentesMes = itensDoMes.filter(p => {
    if (p.data_pagamento) return false;
    if (!p.data_vencimento) return !isFuturo;
    const d = new Date(String(p.data_vencimento).split("T")[0] + "T12:00:00");
    return d.getMonth() + 1 === mes && d.getFullYear() === ano;
  });
  const totalPendente = pendentesMes.reduce((acc, p) => acc + Number(p.valor), 0);
  const total = totalPago + totalPendente;
  const pendentes = pendentesMes.length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Pagamentos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {pagos.length}/{itens.length} pagos · {pendentes} pendentes
          </p>
        </div>
        <button onClick={() => setMostraForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#0ea5e9", color: "#fff" }}>
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Navegação mês */}
      <div className="flex items-center gap-3">
        <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg"
          style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-semibold" style={{ color: "var(--text)", minWidth: 160, textAlign: "center" }}>
          {MESES[mes - 1]} {ano}
        </span>
        <button onClick={() => navMes(1)} className="p-1.5 rounded-lg"
          style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Saldos contas de fluxo */}
      {contas.filter(c => c.fluxo_caixa).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {contas.filter(c => c.fluxo_caixa).map(c => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.cor ?? "#64748b" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.nome}</span>
              <span className="text-sm font-semibold ml-1"
                style={{ color: Number(c.saldo_atual) >= 0 ? "#0ea5e9" : "#ef4444" }}>
                R$ {Number(c.saldo_atual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Total do mês</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#ef4444" }}>R$ {fmt(total)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Saldo Fluxo</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#0ea5e9" }}>
            R$ {fmt(contas.filter(c => c.fluxo_caixa).reduce((acc, c) => acc + Number(c.saldo_atual), 0))}
          </p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Pendente</p>
          <p className="text-xl font-bold mt-1" style={{ color: pendentes > 0 ? "#f59e0b" : "#22c55e" }}>
            R$ {fmt(total - totalPago)}
          </p>
        </div>
      </div>

      {/* Busca */}
      <input type="text" placeholder="Buscar por descrição ou observação..."
        value={busca} onChange={e => setBusca(e.target.value)}
        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />

      {/* Formulário novo */}
      {mostraForm && (
        <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "#0ea5e9" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Novo pagamento</h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Descrição *</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={novoForm.descricao} onChange={e => setNovoForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor *</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm outline-none" placeholder="0,00"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={novoForm.valor} onChange={e => setNovoForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Vencimento (dd/mm/aaaa)</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm outline-none" placeholder="dd/mm/aaaa"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={novoForm.data_vencimento} maxLength={10} onChange={e => setNovoForm(f => ({ ...f, data_vencimento: maskDate(e.target.value, f.data_vencimento) }))} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Tipo</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={novoForm.tipo_despesa} onChange={e => setNovoForm(f => ({ ...f, tipo_despesa: e.target.value }))}>
                <option value="">—</option>
                {Object.entries(TIPO_DESPESA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Conta padrão</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={novoForm.conta_id} onChange={e => setNovoForm(f => ({ ...f, conta_id: e.target.value }))}>
                <option value="">—</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Observação</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={novoForm.observacao} onChange={e => setNovoForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <input type="checkbox" id="novo-rec" checked={novoForm.recorrente}
                onChange={e => setNovoForm(f => ({ ...f, recorrente: e.target.checked }))} />
              <label htmlFor="novo-rec" className="text-xs" style={{ color: "var(--text-muted)" }}>
                Recorrente (aparece em meses futuros na projeção de pendentes)
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setMostraForm(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              <X size={14} /> Cancelar
            </button>
            <button onClick={adicionar} disabled={salvando || !novoForm.descricao || !novoForm.valor}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "#0ea5e9", color: "#fff" }}>
              <Check size={14} /> {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full" style={{ background: "var(--surface)" }}>
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...thSty, textAlign: "center", width: 40 }} title="Recorrente">↻</th>
                <th style={thSty}>Vencimento</th>
                <th style={thSty}>Descrição</th>
                <th style={thSty}>Tipo</th>
                <th style={thSty}>Conta</th>
                <th style={{ ...thSty, textAlign: "right" }}>Valor</th>
                <th style={thSty}>Status</th>
                <th style={{ ...thSty, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12"
                  style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {busca ? "Nenhum resultado" : "Nenhum pagamento cadastrado"}
                </td></tr>
              ) : filtrados.map(p => (
                <CardItem key={p.id} item={p} contas={contas} mes={mes} ano={ano} busca={busca}
                  onPagar={pagar} onSalvar={salvar} onDesativar={desativar} onToggleRecorrente={toggleRecorrente} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}