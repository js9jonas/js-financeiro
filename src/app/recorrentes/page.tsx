"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight, Check, X, RefreshCw } from "lucide-react";
import { TIPO_DESPESA_LABEL, TIPO_DESPESA_COR, type TipoDespesa } from "@/types/financeiro";

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

function fmt(v: number) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

interface Recorrente {
  id: number;
  descricao: string;
  tipo_despesa: TipoDespesa | null;
  valor_padrao: number;
  dia_vencimento: number;
  conta_id: number | null;
  conta_nome: string | null;
  conta_cor: string | null;
  observacao: string | null;
  ativo: boolean;
}

interface Conta {
  id: number;
  nome: string;
  cor: string;
}

const VAZIO = {
  descricao: "",
  tipo_despesa: "",
  valor_padrao: "",
  dia_vencimento: "1",
  conta_id: "",
  observacao: "",
};

export default function RecorrentesPage() {
  const [recorrentes, setRecorrentes] = useState<Recorrente[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusGeracao, setStatusGeracao] = useState<{ gerado: boolean; quantidade?: number } | null>(null);
  const [gerando, setGerando] = useState(false);

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();

  const carregar = useCallback(async () => {
    setLoading(true);
    const [rRes, cRes, gRes] = await Promise.all([
      fetch("/api/recorrentes"),
      fetch("/api/contas/saldos"),
      fetch(`/api/recorrentes/gerar?mes=${mes}&ano=${ano}`),
    ]);
    setRecorrentes(await rRes.json());
    setContas(await cRes.json());
    setStatusGeracao(await gRes.json());
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(VAZIO);
    setMostraForm(true);
  };

  const abrirEditar = (r: Recorrente) => {
    setEditando(r.id);
    setForm({
      descricao: r.descricao,
      tipo_despesa: r.tipo_despesa ?? "",
      valor_padrao: String(r.valor_padrao),
      dia_vencimento: String(r.dia_vencimento),
      conta_id: String(r.conta_id ?? ""),
      observacao: r.observacao ?? "",
    });
    setMostraForm(true);
  };

  const cancelar = () => {
    setMostraForm(false);
    setEditando(null);
    setForm(VAZIO);
  };

  const salvar = async () => {
    if (!form.descricao || !form.valor_padrao) return;
    setSalvando(true);

    const body = {
      descricao: form.descricao,
      tipo_despesa: form.tipo_despesa || null,
      valor_padrao: parseFloat(form.valor_padrao.replace(",", ".")),
      dia_vencimento: parseInt(form.dia_vencimento),
      conta_id: form.conta_id ? parseInt(form.conta_id) : null,
      observacao: form.observacao || null,
    };

    const url = editando ? `/api/recorrentes/${editando}` : "/api/recorrentes";
    const method = editando ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSalvando(false);
    cancelar();
    carregar();
  };

  const toggleAtivo = async (r: Recorrente) => {
    await fetch(`/api/recorrentes/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !r.ativo }),
    });
    carregar();
  };

  const gerarMes = async () => {
    setGerando(true);
    const res = await fetch("/api/recorrentes/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, ano }),
    });
    const data = await res.json();
    setStatusGeracao({ gerado: true, quantidade: data.quantidade });
    setGerando(false);
    carregar();
  };

  const ativos = recorrentes.filter(r => r.ativo);
  const inativos = recorrentes.filter(r => !r.ativo);
  const totalMensal = ativos.reduce((acc, r) => acc + Number(r.valor_padrao), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Recorrentes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Despesas fixas geradas automaticamente todo mês
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#0ea5e9", color: "#fff" }}
        >
          <Plus size={16} /> Novo recorrente
        </button>
      </div>

      {/* Card de status da geração */}
      <div
        className="rounded-xl border p-4 flex items-center justify-between"
        style={{
          background: statusGeracao?.gerado ? "#f0fdf4" : "#fffbeb",
          borderColor: statusGeracao?.gerado ? "#bbf7d0" : "#fde68a",
        }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: statusGeracao?.gerado ? "#15803d" : "#92400e" }}>
            {statusGeracao?.gerado
              ? `✓ Mês ${mes}/${ano} já gerado — ${statusGeracao.quantidade ?? "?"} lançamentos criados`
              : `⚠ Mês ${mes}/${ano} ainda não foi gerado`
            }
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Previsão mensal: R$ {fmt(totalMensal)} ({ativos.length} recorrentes ativos)
          </p>
        </div>
        {!statusGeracao?.gerado && (
          <button
            onClick={gerarMes}
            disabled={gerando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "#f59e0b", color: "#fff" }}
          >
            {gerando ? <><RefreshCw size={14} className="animate-spin" /> Gerando...</> : "Gerar agora"}
          </button>
        )}
      </div>

      {/* Formulário */}
      {mostraForm && (
        <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "#0ea5e9" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            {editando ? "Editar recorrente" : "Novo recorrente"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Descrição *</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Conta de luz"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor padrão (R$) *</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.valor_padrao}
                onChange={e => setForm(f => ({ ...f, valor_padrao: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Dia do vencimento *</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.dia_vencimento}
                onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value }))}
              >
                {DIAS.map(d => <option key={d} value={d}>Dia {d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Tipo</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.tipo_despesa}
                onChange={e => setForm(f => ({ ...f, tipo_despesa: e.target.value }))}
              >
                <option value="">— sem tipo —</option>
                {Object.entries(TIPO_DESPESA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Conta</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.conta_id}
                onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))}
              >
                <option value="">— sem conta —</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Observação</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.observacao}
                onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={cancelar}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando || !form.descricao || !form.valor_padrao}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "#0ea5e9", color: "#fff" }}
            >
              <Check size={14} /> {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de ativos */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Ativos ({ativos.length})
          </h2>
        </div>
        <div style={{ background: "var(--surface)" }}>
          {ativos.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" style={{ color: "var(--text)" }}>{r.descricao}</span>
                  {r.tipo_despesa && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: (TIPO_DESPESA_COR[r.tipo_despesa] ?? "#64748b") + "22",
                        color: TIPO_DESPESA_COR[r.tipo_despesa] ?? "#64748b"
                      }}>
                      {TIPO_DESPESA_LABEL[r.tipo_despesa]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>Dia {r.dia_vencimento}</span>
                  {r.conta_nome && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.conta_cor ?? "#64748b" }} />
                      {r.conta_nome}
                    </span>
                  )}
                  {r.observacao && <span className="truncate max-w-xs">{r.observacao}</span>}
                </div>
              </div>
              <span className="font-semibold text-sm shrink-0" style={{ color: "#ef4444" }}>
                R$ {fmt(r.valor_padrao)}
              </span>
              <button
                onClick={() => abrirEditar(r)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => toggleAtivo(r)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#22c55e" }}
                title="Desativar"
              >
                <ToggleRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de inativos */}
      {inativos.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="px-4 py-3 border-b" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Inativos ({inativos.length})
            </h2>
          </div>
          <div style={{ background: "var(--surface)" }}>
            {inativos.map(r => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-0 opacity-50"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>{r.descricao}</span>
                </div>
                <span className="text-sm shrink-0" style={{ color: "var(--text-muted)" }}>R$ {fmt(r.valor_padrao)}</span>
                <button
                  onClick={() => toggleAtivo(r)}
                  className="p-1.5 rounded-lg"
                  style={{ color: "var(--text-muted)" }}
                  title="Reativar"
                >
                  <ToggleLeft size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}