"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Plus, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, X, Check, Trash2,
} from "lucide-react";
import DividendosSection from "@/components/financeiro/DividendosSection";
import RendaFixaSection from "@/components/financeiro/RendaFixaSection";
export const dynamic = "force-dynamic";

type Tipo = "acao" | "fii" | "etf" | "crypto" | "renda_fixa";

interface Ativo {
  id: number;
  ticker: string;
  nome: string;
  tipo: Tipo;
  moeda: string;
  coingecko_id: string | null;
  quantidade_total: number;
  preco_medio: number;
  custo_total: number;
  preco_atual: number | null;
  variacao_dia: number | null;
  atualizado_em: string | null;
}

interface Compra {
  id: number;
  ativo_id: number;
  data_compra: string;
  quantidade: number;
  preco_unitario: number;
  taxas: number;
  corretora: string | null;
  observacao: string | null;
}

const TIPO_LABEL: Record<Tipo, string> = {
  acao: "Ações", fii: "FIIs", etf: "ETFs", crypto: "Crypto", renda_fixa: "Renda Fixa",
};

const TIPO_COR: Record<Tipo, string> = {
  acao: "#3b82f6", fii: "#8b5cf6", etf: "#06b6d4", crypto: "#f59e0b", renda_fixa: "#22c55e",
};

function fmt(v: number, dec = 2) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBRL(v: number) { return "R$ " + fmt(v); }
function fmtPct(v: number) { return (v >= 0 ? "+" : "") + fmt(v) + "%"; }
function fmtData(d: string) {
  const s = String(d).split("T")[0];
  const [y, m, dd] = s.split("-");
  return `${dd}/${m}/${y}`;
}

const inputSty = {
  background: "var(--surface2)", border: "1px solid var(--border)",
  color: "var(--text)", borderRadius: 8, padding: "6px 10px", fontSize: 13, width: "100%",
} as const;

function parseBR(v: string) {
  return parseFloat(v.replace(/\./g, "").replace(",", "."));
}

export default function InvestimentosPage() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({
    acao: true, fii: true, etf: true, crypto: true, renda_fixa: true,
  });
  const [ativosAbertos, setAtivosAbertos] = useState<Record<number, boolean>>({});
  const [compras, setCompras] = useState<Record<number, Compra[]>>({});

  const [modalAtivo, setModalAtivo] = useState(false);
  const [modalCompra, setModalCompra] = useState<number | null>(null);
  const [modalPrecoManual, setModalPrecoManual] = useState<Ativo | null>(null);

  const [formAtivo, setFormAtivo] = useState({
    ticker: "", nome: "", tipo: "acao" as Tipo, moeda: "BRL", coingecko_id: "",
  });
  const [formCompra, setFormCompra] = useState({
    data_compra: "", quantidade: "", preco_unitario: "", taxas: "", corretora: "", observacao: "",
  });
  const [precoManual, setPrecoManual] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/investimentos/ativos", { cache: "no-store" });
    setAtivos(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarCompras(ativo_id: number) {
    if (compras[ativo_id]) return;
    const res = await fetch(`/api/investimentos/compras?ativo_id=${ativo_id}`, { cache: "no-store" });
    const data = await res.json();
    setCompras(c => ({ ...c, [ativo_id]: data }));
  }

  function toggleAtivo(id: number) {
    if (!ativosAbertos[id]) carregarCompras(id);
    setAtivosAbertos(a => ({ ...a, [id]: !a[id] }));
  }

  async function atualizarPrecos() {
    setAtualizando(true);
    await fetch("/api/investimentos/precos", { method: "POST" });
    await carregar();
    setAtualizando(false);
  }

  async function salvarAtivo() {
    if (!formAtivo.ticker || !formAtivo.tipo) return;
    await fetch("/api/investimentos/ativos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formAtivo),
    });
    setModalAtivo(false);
    setFormAtivo({ ticker: "", nome: "", tipo: "acao", moeda: "BRL", coingecko_id: "" });
    await carregar();
  }

  async function salvarCompra() {
    if (!modalCompra || !formCompra.data_compra || !formCompra.quantidade || !formCompra.preco_unitario) return;
    await fetch("/api/investimentos/compras", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ativo_id: modalCompra,
        data_compra: formCompra.data_compra,
        quantidade: parseBR(formCompra.quantidade),
        preco_unitario: parseBR(formCompra.preco_unitario),
        taxas: formCompra.taxas ? parseBR(formCompra.taxas) : 0,
        corretora: formCompra.corretora || null,
        observacao: formCompra.observacao || null,
      }),
    });
    setModalCompra(null);
    setFormCompra({ data_compra: "", quantidade: "", preco_unitario: "", taxas: "", corretora: "", observacao: "" });
    setCompras(c => { const n = { ...c }; delete n[modalCompra]; return n; });
    await carregar();
  }

  async function deletarCompra(id: number, ativo_id: number) {
    if (!confirm("Remover esta compra?")) return;
    await fetch(`/api/investimentos/compras?id=${id}`, { method: "DELETE" });
    setCompras(c => ({ ...c, [ativo_id]: c[ativo_id]?.filter(x => x.id !== id) }));
    await carregar();
  }

  async function salvarPrecoManual() {
    if (!modalPrecoManual || !precoManual) return;
    await fetch("/api/investimentos/precos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo_id: modalPrecoManual.id, preco_atual: parseBR(precoManual) }),
    });
    setModalPrecoManual(null);
    setPrecoManual("");
    await carregar();
  }

  const grupos = (["acao", "fii", "etf", "crypto", "renda_fixa"] as Tipo[])
    .map(tipo => ({ tipo, itens: ativos.filter(a => a.tipo === tipo) }))
    .filter(g => g.itens.length > 0);

  const patrimonioTotal = ativos.reduce((acc, a) => {
    const val = a.preco_atual ? Number(a.quantidade_total) * Number(a.preco_atual) : Number(a.custo_total);
    return acc + val;
  }, 0);
  const custoTotal = ativos.reduce((acc, a) => acc + Number(a.custo_total), 0);
  const lucroTotal = patrimonioTotal - custoTotal;
  const rentabilidadePct = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Investimentos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Patrimônio e evolução dos ativos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={atualizarPrecos} disabled={atualizando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <RefreshCw size={15} className={atualizando ? "animate-spin" : ""} />
            {atualizando ? "Atualizando..." : "Atualizar preços"}
          </button>
          <button onClick={() => setModalAtivo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#0ea5e9", color: "#fff" }}>
            <Plus size={15} /> Novo ativo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Patrimônio atual</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#0369a1" }}>{fmtBRL(patrimonioTotal)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Custo total</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{fmtBRL(custoTotal)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Lucro / Prejuízo</p>
          <p className="text-xl font-bold mt-1" style={{ color: lucroTotal >= 0 ? "#22c55e" : "#ef4444" }}>
            {lucroTotal >= 0 ? "+" : ""}{fmtBRL(lucroTotal)}
          </p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Rentabilidade</p>
          <div className="flex items-center gap-1 mt-1">
            {rentabilidadePct >= 0 ? <TrendingUp size={16} color="#22c55e" /> : <TrendingDown size={16} color="#ef4444" />}
            <p className="text-xl font-bold" style={{ color: rentabilidadePct >= 0 ? "#22c55e" : "#ef4444" }}>
              {fmtPct(rentabilidadePct)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p style={{ color: "var(--text-muted)" }}>Nenhum ativo cadastrado ainda.</p>
          <button onClick={() => setModalAtivo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#0ea5e9", color: "#fff" }}>
            <Plus size={14} /> Cadastrar primeiro ativo
          </button>
        </div>
      ) : grupos.map(({ tipo, itens }) => {
        const cor = TIPO_COR[tipo];
        const aberto = gruposAbertos[tipo];
        const subtotal = itens.reduce((acc, a) =>
          acc + (a.preco_atual ? Number(a.quantidade_total) * Number(a.preco_atual) : Number(a.custo_total)), 0);
        const subtotalCusto = itens.reduce((acc, a) => acc + Number(a.custo_total), 0);
        const subtotalLucro = subtotal - subtotalCusto;

        return (
          <div key={tipo} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <button className="w-full flex items-center justify-between px-5 py-3"
              style={{ background: cor + "18", borderBottom: aberto ? `1px solid ${cor}33` : "none" }}
              onClick={() => setGruposAbertos(g => ({ ...g, [tipo]: !g[tipo] }))}>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: cor }} />
                <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{TIPO_LABEL[tipo]}</span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: cor + "22", color: cor }}>{itens.length} ativos</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Patrimônio</p>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{fmtBRL(subtotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resultado</p>
                  <p className="text-sm font-bold" style={{ color: subtotalLucro >= 0 ? "#22c55e" : "#ef4444" }}>
                    {subtotalLucro >= 0 ? "+" : ""}{fmtBRL(subtotalLucro)}
                  </p>
                </div>
                {aberto ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
            </button>

            {aberto && (
              <table className="w-full" style={{ background: "var(--surface)" }}>
                <thead>
                  <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                    {["Ticker", "Qtd", "P. Médio", "P. Atual", "Var. Dia", "Investido", "Atual", "Resultado", ""].map((h, i) => (
                      <th key={i} style={{
                        color: "var(--text-muted)", fontSize: 11, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "8px 14px", textAlign: i >= 1 ? "right" : "left",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map(a => {
                    const valorAtual = a.preco_atual ? Number(a.quantidade_total) * Number(a.preco_atual) : null;
                    const resultado = valorAtual != null ? valorAtual - Number(a.custo_total) : null;
                    const resultadoPct = a.custo_total > 0 && resultado != null
                      ? (resultado / Number(a.custo_total)) * 100 : null;
                    const ativoAberto = ativosAbertos[a.id];

                    return (
                      <>
                        <tr key={a.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                          {/* Ticker clicável */}
                          <td className="px-4 py-3">
                            <button className="flex items-center gap-2 text-left"
                              onClick={() => toggleAtivo(a.id)}>
                              <div>
                                <p className="font-bold text-sm" style={{ color: cor }}>{a.ticker}</p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.nome}</p>
                              </div>
                              {ativoAberto
                                ? <ChevronUp size={12} color="var(--text-muted)" />
                                : <ChevronDown size={12} color="var(--text-muted)" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right text-sm" style={{ color: "var(--text)" }}>
                            {fmt(Number(a.quantidade_total), a.tipo === "crypto" ? 8 : 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm" style={{ color: "var(--text)" }}>
                            {Number(a.custo_total) > 0 ? fmtBRL(Number(a.preco_medio)) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {a.preco_atual != null ? (
                              <button onClick={() => { setModalPrecoManual(a); setPrecoManual(String(a.preco_atual)); }}
                                className="font-semibold hover:underline" style={{ color: "var(--text)" }}>
                                {fmtBRL(Number(a.preco_atual))}
                              </button>
                            ) : (
                              <button onClick={() => setModalPrecoManual(a)}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ background: "#fef3c7", color: "#92400e" }}>
                                Informar
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {a.variacao_dia != null ? (
                              <span style={{ color: Number(a.variacao_dia) >= 0 ? "#22c55e" : "#ef4444" }}>
                                {fmtPct(Number(a.variacao_dia))}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm" style={{ color: "var(--text-muted)" }}>
                            {fmtBRL(Number(a.custo_total))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: "var(--text)" }}>
                            {valorAtual != null ? fmtBRL(valorAtual) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {resultado != null ? (
                              <div>
                                <p style={{ color: resultado >= 0 ? "#22c55e" : "#ef4444" }}>
                                  {resultado >= 0 ? "+" : ""}{fmtBRL(resultado)}
                                </p>
                                {resultadoPct != null && (
                                  <p className="text-xs" style={{ color: resultadoPct >= 0 ? "#22c55e" : "#ef4444" }}>
                                    {fmtPct(resultadoPct)}
                                  </p>
                                )}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setModalCompra(a.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ml-auto"
                              style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                              <Plus size={11} /> Compra
                            </button>
                          </td>
                        </tr>

                        {/* Sublinhas de compras */}
                        {ativoAberto && (
                          <tr style={{ background: "var(--surface2)" }}>
                            <td colSpan={9} className="px-0 py-0">
                              {!compras[a.id] ? (
                                <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>Carregando...</p>
                              ) : compras[a.id].length === 0 ? (
                                <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>Nenhuma compra registrada.</p>
                              ) : (
                                <table className="w-full">
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
                                      <th style={{ width: 40 }} />
                                      {["Data", "Qtd", "Preço Unit.", "Taxas", "Total", "Corretora", "Obs.", ""].map((h, i) => (
                                        <th key={i} style={{
                                          color: "var(--text-muted)", fontSize: 10, fontWeight: 600,
                                          textTransform: "uppercase", padding: "6px 12px",
                                          textAlign: i >= 1 && i <= 4 ? "right" : "left",
                                        }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compras[a.id].map(c => (
                                      <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                                        <td style={{ paddingLeft: 32 }}>
                                          <span style={{ color: cor, fontSize: 10 }}>↳</span>
                                        </td>
                                        <td className="px-3 py-2 text-xs" style={{ color: "var(--text)" }}>
                                          {fmtData(c.data_compra)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-right" style={{ color: "var(--text)" }}>
                                          {fmt(Number(c.quantidade), a.tipo === "crypto" ? 8 : 0)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-right" style={{ color: "var(--text)" }}>
                                          {fmtBRL(Number(c.preco_unitario))}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-right" style={{ color: "var(--text-muted)" }}>
                                          {Number(c.taxas) > 0 ? fmtBRL(Number(c.taxas)) : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-right font-semibold" style={{ color: "var(--text)" }}>
                                          {fmtBRL(Number(c.quantidade) * Number(c.preco_unitario) + Number(c.taxas))}
                                        </td>
                                        <td className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                          {c.corretora ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                          {c.observacao ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <button onClick={() => deletarCompra(c.id, a.id)}
                                            className="p-1 rounded" style={{ color: "#ef4444" }}>
                                            <Trash2 size={12} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {/* Modal novo ativo */}
      {modalAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Novo ativo</h2>
              <button onClick={() => setModalAtivo(false)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Tipo *</label>
                <select style={inputSty} value={formAtivo.tipo}
                  onChange={e => setFormAtivo(f => ({ ...f, tipo: e.target.value as Tipo }))}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                  Ticker * {formAtivo.tipo === "crypto" ? "(ex: BTC, ETH)" : "(ex: PETR4, MXRF11)"}
                </label>
                <input style={inputSty} value={formAtivo.ticker}
                  onChange={e => setFormAtivo(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                  placeholder={formAtivo.tipo === "crypto" ? "BTC" : "PETR4"} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Nome</label>
                <input style={inputSty} value={formAtivo.nome}
                  onChange={e => setFormAtivo(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome do ativo" />
              </div>
              {formAtivo.tipo === "crypto" && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                    CoinGecko ID (ex: bitcoin, ethereum, solana)
                  </label>
                  <input style={inputSty} value={formAtivo.coingecko_id}
                    onChange={e => setFormAtivo(f => ({ ...f, coingecko_id: e.target.value.toLowerCase() }))}
                    placeholder="bitcoin" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalAtivo(false)}
                className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarAtivo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nova compra */}
      {modalCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                Registrar compra — {ativos.find(a => a.id === modalCompra)?.ticker}
              </h2>
              <button onClick={() => setModalCompra(null)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Data da compra *</label>
                <input type="date" style={inputSty} value={formCompra.data_compra}
                  onChange={e => setFormCompra(f => ({ ...f, data_compra: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Quantidade *</label>
                <input style={inputSty} placeholder="0" value={formCompra.quantidade}
                  onChange={e => setFormCompra(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Preço unitário *</label>
                <input style={inputSty} placeholder="0,00" value={formCompra.preco_unitario}
                  onChange={e => setFormCompra(f => ({ ...f, preco_unitario: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Taxas</label>
                <input style={inputSty} placeholder="0,00" value={formCompra.taxas}
                  onChange={e => setFormCompra(f => ({ ...f, taxas: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Corretora</label>
                <input style={inputSty} placeholder="Ex: Rico, XP..." value={formCompra.corretora}
                  onChange={e => setFormCompra(f => ({ ...f, corretora: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Observação</label>
                <input style={inputSty} value={formCompra.observacao}
                  onChange={e => setFormCompra(f => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalCompra(null)}
                className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarCompra}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preço manual */}
      {modalPrecoManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                Preço atual — {modalPrecoManual.ticker}
              </h2>
              <button onClick={() => setModalPrecoManual(null)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor atual (R$)</label>
              <input style={inputSty} placeholder="0,00" value={precoManual}
                onChange={e => setPrecoManual(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalPrecoManual(null)}
                className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarPrecoManual}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <RendaFixaSection />
      </div>
      <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <DividendosSection ativos={ativos} />
      </div>
    </div>
  );
}