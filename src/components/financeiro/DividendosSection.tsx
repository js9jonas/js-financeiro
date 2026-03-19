"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, X, Check, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";

interface ResumoDividendo {
  id: number;
  ticker: string;
  nome: string;
  tipo: string;
  total_dividendos: number;
  qtd_pagamentos: number;
  ultimo_pagamento: string | null;
  yield_sobre_custo: number;
  dividendos_12m: number;
}

interface Dividendo {
  id: number;
  ativo_id: number;
  ticker: string;
  data_pagamento: string;
  valor: number;
  quantidade_na_data: number | null;
  tipo: string;
  observacao: string | null;
}

interface Ativo {
  id: number;
  ticker: string;
  nome: string;
  tipo: string;
}

const TIPO_LABEL: Record<string, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
  amortizacao: "Amortização",
};

const inputSty = {
  background: "var(--surface2)", border: "1px solid var(--border)",
  color: "var(--text)", borderRadius: 8, padding: "6px 10px", fontSize: 13, width: "100%",
} as const;

function fmt(v: number, dec = 2) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBRL(v: number) { return "R$ " + fmt(v); }
function fmtData(d: string) {
  const s = String(d).split("T")[0];
  const [y, m, dd] = s.split("-");
  return `${dd}/${m}/${y}`;
}
function parseBR(v: string) {
  return parseFloat(v.replace(/\./g, "").replace(",", "."));
}

interface Props {
  ativos: Ativo[];
}

const FORM_VAZIO = {
  ativo_id: "", data_pagamento: "", valor: "",
  quantidade_na_data: "", tipo: "dividendo", observacao: "",
};

export default function DividendosSection({ ativos }: Props) {
  const [resumo, setResumo] = useState<ResumoDividendo[]>([]);
  const [historico, setHistorico] = useState<Record<number, Dividendo[]>>({});
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Dividendo | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const totalGeral = resumo.reduce((acc, r) => acc + Number(r.total_dividendos), 0);
  const total12m = resumo.reduce((acc, r) => acc + Number(r.dividendos_12m), 0);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/investimentos/dividendos", { cache: "no-store" });
    setResumo(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarHistorico(ativo_id: number) {
    if (historico[ativo_id]) return;
    const res = await fetch(`/api/investimentos/dividendos?ativo_id=${ativo_id}`, { cache: "no-store" });
    const data = await res.json();
    setHistorico(h => ({ ...h, [ativo_id]: data }));
  }

  function toggleAberto(id: number) {
    if (!abertos[id]) carregarHistorico(id);
    setAbertos(a => ({ ...a, [id]: !a[id] }));
  }

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModal(true);
  }

  function abrirEdicao(d: Dividendo) {
    setEditando(d);
    setForm({
      ativo_id: String(d.ativo_id),
      data_pagamento: String(d.data_pagamento).split("T")[0],
      valor: String(d.valor),
      quantidade_na_data: d.quantidade_na_data ? String(d.quantidade_na_data) : "",
      tipo: d.tipo,
      observacao: d.observacao ?? "",
    });
    setModal(true);
  }

  async function salvar() {
    if (!form.ativo_id || !form.data_pagamento || !form.valor) return;
    await fetch("/api/investimentos/dividendos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ativo_id: parseInt(form.ativo_id),
        data_pagamento: form.data_pagamento,
        valor: parseBR(form.valor),
        quantidade_na_data: form.quantidade_na_data ? parseBR(form.quantidade_na_data) : null,
        tipo: form.tipo,
        observacao: form.observacao || null,
      }),
    });
    setModal(false);
    setForm(FORM_VAZIO);
    setHistorico({});
    await carregar();
  }

  async function salvarEdicao() {
    if (!editando || !form.data_pagamento || !form.valor) return;
    await fetch(`/api/investimentos/dividendos?id=${editando.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data_pagamento: form.data_pagamento,
        valor: parseBR(form.valor),
        quantidade_na_data: form.quantidade_na_data ? parseBR(form.quantidade_na_data) : null,
        tipo: form.tipo,
        observacao: form.observacao || null,
      }),
    });
    setModal(false);
    setEditando(null);
    setHistorico({});
    await carregar();
  }

  async function deletar(id: number, ativo_id: number) {
    if (!confirm("Remover este lançamento?")) return;
    await fetch(`/api/investimentos/dividendos?id=${id}`, { method: "DELETE" });
    setHistorico(h => ({ ...h, [ativo_id]: h[ativo_id]?.filter(d => d.id !== id) }));
    await carregar();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Proventos recebidos</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Dividendos, JCP e rendimentos por ativo
          </p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#22c55e", color: "#fff" }}>
          <Plus size={15} /> Registrar provento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Total recebido</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#22c55e" }}>{fmtBRL(totalGeral)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Últimos 12 meses</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#22c55e" }}>{fmtBRL(total12m)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Ativos pagadores</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{resumo.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Carregando...</p>
      ) : resumo.length === 0 ? (
        <div className="rounded-xl border p-8 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p style={{ color: "var(--text-muted)" }}>Nenhum provento registrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {resumo.map(r => (
            <div key={r.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <button className="w-full flex items-center justify-between px-5 py-3"
                style={{ background: "var(--surface)" }}
                onClick={() => toggleAberto(r.id)}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm" style={{ color: "#22c55e" }}>{r.ticker}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.nome}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "#dcfce7", color: "#166534" }}>
                    {r.qtd_pagamentos} pagamentos
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total recebido</p>
                    <p className="text-sm font-bold" style={{ color: "#22c55e" }}>{fmtBRL(Number(r.total_dividendos))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Yield s/ custo</p>
                    <p className="text-sm font-bold" style={{ color: "#0369a1" }}>{fmt(Number(r.yield_sobre_custo))}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Último</p>
                    <p className="text-sm" style={{ color: "var(--text)" }}>
                      {r.ultimo_pagamento ? fmtData(r.ultimo_pagamento) : "—"}
                    </p>
                  </div>
                  {abertos[r.id]
                    ? <ChevronUp size={16} color="var(--text-muted)" />
                    : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
              </button>

              {abertos[r.id] && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {!historico[r.id] ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Carregando...</p>
                  ) : (
                    <table className="w-full" style={{ background: "var(--surface2)" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Data", "Tipo", "Valor", "Qtd na data", "Observação", ""].map((h, i) => (
                            <th key={i} style={{
                              color: "var(--text-muted)", fontSize: 11, fontWeight: 600,
                              textTransform: "uppercase", letterSpacing: "0.05em",
                              padding: "8px 14px", textAlign: i >= 2 && i < 5 ? "right" : "left",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historico[r.id].map(d => (
                          <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                            <td className="px-4 py-2 text-sm" style={{ color: "var(--text)" }}>
                              {fmtData(d.data_pagamento)}
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "#dcfce7", color: "#166534" }}>
                                {TIPO_LABEL[d.tipo] ?? d.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-semibold" style={{ color: "#22c55e" }}>
                              {fmtBRL(Number(d.valor))}
                            </td>
                            <td className="px-4 py-2 text-sm text-right" style={{ color: "var(--text-muted)" }}>
                              {d.quantidade_na_data ? fmt(Number(d.quantidade_na_data), 0) : "—"}
                            </td>
                            <td className="px-4 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                              {d.observacao ?? "—"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => abrirEdicao(d)}
                                  className="p-1 rounded" style={{ color: "#0ea5e9" }}>
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => deletar(d.id, r.id)}
                                  className="p-1 rounded" style={{ color: "#ef4444" }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                {editando ? "Editar provento" : "Registrar provento"}
              </h2>
              <button onClick={() => setModal(false)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Ativo *</label>
                <select style={inputSty} value={form.ativo_id}
                  onChange={e => setForm(f => ({ ...f, ativo_id: e.target.value }))}
                  disabled={!!editando}>
                  <option value="">— Selecione —</option>
                  {ativos.map(a => (
                    <option key={a.id} value={a.id}>{a.ticker} — {a.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Data do pagamento *</label>
                <input type="date" style={inputSty} value={form.data_pagamento}
                  onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Tipo</label>
                <select style={inputSty} value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor total recebido *</label>
                <input style={inputSty} placeholder="0,00" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Qtd de cotas na data</label>
                <input style={inputSty} placeholder="0" value={form.quantidade_na_data}
                  onChange={e => setForm(f => ({ ...f, quantidade_na_data: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Observação</label>
                <input style={inputSty} value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={editando ? salvarEdicao : salvar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#22c55e", color: "#fff" }}>
                <Check size={14} /> {editando ? "Salvar alteração" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}