"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Pencil, Trash2, Check, X } from "lucide-react";
import { TIPO_DESPESA_LABEL, TIPO_DESPESA_COR, type TipoDespesa } from "@/types/financeiro";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(v: number) {
  if (v >= 1000) return `R$${(v/1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}
function isoParaBR(iso: string) {
  if (!iso) return "";
  return iso.split("T")[0].split("-").reverse().join("/");
}
function brParaIso(br: string) {
  if (!br) return "";
  const [d, m, a] = br.split("/");
  return `${a}-${m}-${d}`;
}

interface Transacao {
  id: number;
  descricao: string;
  valor: number;
  tipo_despesa: TipoDespesa;
  data_pagamento: string;
  observacao: string;
  conta_nome: string;
  conta_cor: string;
  conta_id: number;
}

interface ResumoTipo { tipo_despesa: string; total: string; quantidade: string; }
interface TotalMensal { mes: string; total: string; }
interface Comparativo { mes: string; tipo_despesa: string; total: string; }

interface HistoricoData {
  resumoTipo: ResumoTipo[];
  comparativo: Comparativo[];
  totalMensal: TotalMensal[];
  transacoes: Transacao[];
  totalMesAnterior: number;
}

interface EditForm {
  descricao: string;
  valor: string;
  tipo_despesa: string;
  data_pagamento: string;
  conta_id: string;
  observacao: string;
}

interface Conta { id: number; nome: string; cor: string; }

export default function HistoricoPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [data, setData] = useState<HistoricoData | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [hRes, cRes] = await Promise.all([
      fetch(`/api/historico?mes=${mes}&ano=${ano}`),
      fetch("/api/contas/saldos"),
    ]);
    setData(await hRes.json());
    setContas(await cRes.json());
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const navMes = (dir: number) => {
    const d = new Date(ano, mes - 1 + dir, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
  };

  const abrirEditar = (t: Transacao) => {
    setEditando(t.id);
    setEditForm({
      descricao: t.descricao,
      valor: String(t.valor),
      tipo_despesa: t.tipo_despesa ?? "",
      data_pagamento: isoParaBR(t.data_pagamento),
      conta_id: String(t.conta_id ?? ""),
      observacao: t.observacao ?? "",
    });
  };

  const cancelarEditar = () => { setEditando(null); setEditForm(null); };

  const salvarEditar = async (id: number) => {
    if (!editForm) return;
    setSalvando(true);
    await fetch(`/api/transacoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: editForm.descricao,
        valor: parseFloat(editForm.valor.replace(",", ".")),
        tipo_despesa: editForm.tipo_despesa || null,
        data_pagamento: brParaIso(editForm.data_pagamento) || null,
        conta_id: editForm.conta_id ? parseInt(editForm.conta_id) : null,
        observacao: editForm.observacao || null,
      }),
    });
    setSalvando(false);
    cancelarEditar();
    carregar();
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    setExcluindo(id);
    await fetch(`/api/transacoes/${id}`, { method: "DELETE" });
    setExcluindo(null);
    carregar();
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><p style={{ color: "var(--text-muted)" }}>Carregando...</p></div>;
  }

  const totalMes = data.resumoTipo.reduce((acc, r) => acc + Number(r.total), 0);
  const variacaoAbs = totalMes - data.totalMesAnterior;
  const variacaoPct = data.totalMesAnterior > 0 ? ((variacaoAbs / data.totalMesAnterior) * 100).toFixed(1) : "—";

  const dadosLinha = data.totalMensal.map(d => ({
    mes: MESES[parseInt(d.mes.split("-")[1]) - 1] + "/" + d.mes.split("-")[0].slice(2),
    total: Number(d.total),
  }));

  const mesesUnicos = Array.from(new Set(data.comparativo.map(d => d.mes))).sort();
  const tiposUnicos = Array.from(new Set(data.comparativo.map(d => d.tipo_despesa)));
  const dadosBarras = mesesUnicos.map(m => {
    const obj: Record<string, string | number> = {
      mes: MESES[parseInt(m.split("-")[1]) - 1] + "/" + m.split("-")[0].slice(2),
    };
    tiposUnicos.forEach(t => {
      const found = data.comparativo.find(d => d.mes === m && d.tipo_despesa === t);
      obj[t] = found ? Number(found.total) : 0;
    });
    return obj;
  });

  const transacoesFiltradas = data.transacoes.filter(t => {
    const passaTipo = filtroTipo === "todos" || t.tipo_despesa === filtroTipo;
    const passaBusca = !busca || t.descricao.toLowerCase().includes(busca.toLowerCase());
    return passaTipo && passaBusca;
  });

  const inputCls = "rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-400 w-full";
  const inputSty = { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Histórico</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Análise de gastos por período</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-2 rounded-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <ChevronLeft size={16} />
          </button>
          <span className="px-4 py-2 rounded-lg text-sm font-semibold min-w-32 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            {MESES[mes - 1]} {ano}
          </span>
          <button onClick={() => navMes(1)} className="p-2 rounded-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Total do Mês</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#ef4444" }}>R$ {fmt(totalMes)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {data.resumoTipo.reduce((a, r) => a + Number(r.quantidade), 0)} lançamentos
          </p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Mês Anterior</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>R$ {fmt(data.totalMesAnterior)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Variação</p>
          <div className="flex items-center gap-2 mt-1">
            {variacaoAbs === 0 ? <Minus size={18} style={{ color: "var(--text-muted)" }} />
              : variacaoAbs > 0 ? <TrendingUp size={18} style={{ color: "#ef4444" }} />
              : <TrendingDown size={18} style={{ color: "#22c55e" }} />}
            <p className="text-2xl font-bold"
              style={{ color: variacaoAbs > 0 ? "#ef4444" : variacaoAbs < 0 ? "#22c55e" : "var(--text)" }}>
              {variacaoAbs > 0 ? "+" : ""}{variacaoPct}%
            </p>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {variacaoAbs > 0 ? "+" : ""}R$ {fmt(Math.abs(variacaoAbs))} vs anterior
          </p>
        </div>
      </div>

      {/* Resumo por tipo */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>
          Gastos por Tipo — {MESES[mes - 1]} {ano}
        </h2>
        <div className="flex flex-col gap-2">
          {data.resumoTipo.map(r => {
            const pct = totalMes > 0 ? (Number(r.total) / totalMes) * 100 : 0;
            const cor = TIPO_DESPESA_COR[r.tipo_despesa as TipoDespesa] ?? "#64748b";
            const label = TIPO_DESPESA_LABEL[r.tipo_despesa as TipoDespesa] ?? r.tipo_despesa;
            return (
              <div key={r.tipo_despesa}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
                    <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.quantidade}x</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>R$ {fmt(Number(r.total))}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: cor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico linha */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>
          Evolução dos Últimos 12 Meses
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dadosLinha}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <Tooltip formatter={(v) => [`R$ ${fmt(Number(v))}`, "Total"]}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico barras */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>
          Comparativo por Tipo — Últimos 12 Meses
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dadosBarras}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend formatter={(v) => TIPO_DESPESA_LABEL[v as TipoDespesa] ?? v} wrapperStyle={{ fontSize: 11 }} />
            {tiposUnicos.map(t => (
              <Bar key={t} dataKey={t} stackId="a" fill={TIPO_DESPESA_COR[t as TipoDespesa] ?? "#64748b"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista de transações */}
      <div className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <div className="p-4 border-b flex items-center gap-3 flex-wrap"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Lançamentos
          </h2>
          <input
            placeholder="Buscar..."
            className="flex-1 min-w-32 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select
            className="rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos os tipos</option>
            {Object.entries(TIPO_DESPESA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{transacoesFiltradas.length} registros</span>
        </div>

        <div style={{ background: "var(--surface)", borderRadius: "0 0 12px 12px" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)" }}>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Conta</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Data</th>
                <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Valor</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              ) : transacoesFiltradas.map(t => {
                const cor = TIPO_DESPESA_COR[t.tipo_despesa] ?? "#64748b";
                const label = TIPO_DESPESA_LABEL[t.tipo_despesa] ?? t.tipo_despesa;
                const dataFmt = t.data_pagamento ? isoParaBR(t.data_pagamento) : "—";
                const isEditando = editando === t.id;

                return (
                  <tr key={t.id} className="border-t" style={{ borderColor: "var(--border)", background: isEditando ? "var(--surface2)" : undefined }}>
                    {isEditando && editForm ? (
                      <>
                        <td className="px-4 py-2">
                          <input className={inputCls} style={inputSty}
                            value={editForm.descricao}
                            onChange={e => setEditForm(f => f ? { ...f, descricao: e.target.value } : f)} />
                          <input className={`${inputCls} mt-1`} style={inputSty}
                            placeholder="Observação"
                            value={editForm.observacao}
                            onChange={e => setEditForm(f => f ? { ...f, observacao: e.target.value } : f)} />
                        </td>
                        <td className="px-4 py-2">
                          <select className={inputCls} style={inputSty}
                            value={editForm.tipo_despesa}
                            onChange={e => setEditForm(f => f ? { ...f, tipo_despesa: e.target.value } : f)}>
                            <option value="">—</option>
                            {Object.entries(TIPO_DESPESA_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select className={inputCls} style={inputSty}
                            value={editForm.conta_id}
                            onChange={e => setEditForm(f => f ? { ...f, conta_id: e.target.value } : f)}>
                            <option value="">—</option>
                            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input className={inputCls} style={inputSty}
                            placeholder="DD/MM/AAAA"
                            value={editForm.data_pagamento}
                            onChange={e => setEditForm(f => f ? { ...f, data_pagamento: e.target.value } : f)} />
                        </td>
                        <td className="px-4 py-2">
                          <input className={`${inputCls} text-right`} style={inputSty}
                            value={editForm.valor}
                            onChange={e => setEditForm(f => f ? { ...f, valor: e.target.value } : f)} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => salvarEditar(t.id)} disabled={salvando}
                              className="p-1.5 rounded-lg" style={{ background: "#0ea5e9", color: "#fff" }}
                              title="Salvar">
                              <Check size={13} />
                            </button>
                            <button onClick={cancelarEditar}
                              className="p-1.5 rounded-lg" style={{ background: "var(--border)", color: "var(--text-muted)" }}
                              title="Cancelar">
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: "var(--text)" }}>{t.descricao}</p>
                          {t.observacao && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.observacao}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {t.tipo_despesa && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ background: cor + "22", color: cor }}>{label}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: t.conta_cor ?? "#64748b" }} />
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t.conta_nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{dataFmt}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#ef4444" }}>
                          R$ {fmt(Number(t.valor))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => abrirEditar(t)}
                              className="p-1.5 rounded-lg hover:bg-sky-50" style={{ color: "var(--text-muted)" }}
                              title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => excluir(t.id)} disabled={excluindo === t.id}
                              className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }}
                              title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}