"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, X, Check, ChevronDown, ChevronUp, Trash2, Pencil, RefreshCw, ArrowLeftRight } from "lucide-react";

interface RendaFixa {
  id: number;
  nome: string;
  instituicao: string | null;
  tipo: string;
  rentabilidade: string | null;
  data_vencimento: string | null;
  valor_atual: number;
  atualizado_em: string | null;
  total_aportado: number;
  total_resgatado: number;
  total_rendimentos: number;
  qtd_movimentacoes: number;
}

interface Aporte {
  id: number;
  renda_fixa_id: number;
  data_aporte: string;
  valor: number;
  tipo: string;
  observacao: string | null;
}

const TIPO_LABEL: Record<string, string> = {
  cdb: "CDB", lci: "LCI", lca: "LCA", tesouro: "Tesouro Direto",
  cri: "CRI", cra: "CRA", debenture: "Debênture", outro: "Outro",
};

const TIPO_COR: Record<string, string> = {
  cdb: "#0ea5e9", lci: "#22c55e", lca: "#16a34a", tesouro: "#f59e0b",
  cri: "#8b5cf6", cra: "#6d28d9", debenture: "#ec4899", outro: "#64748b",
};

const APORTE_LABEL: Record<string, string> = {
  aporte: "Aporte", resgate: "Resgate", rendimento: "Rendimento",
  transferencia_entrada: "Transferência entrada", transferencia_saida: "Transferência saída",
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

const FORM_RF_VAZIO = {
  nome: "", instituicao: "", tipo: "cdb", rentabilidade: "", data_vencimento: "",
};
const FORM_APORTE_VAZIO = {
  data_aporte: "", valor: "", tipo: "aporte", observacao: "",
};

export default function RendaFixaSection() {
  const [itens, setItens] = useState<RendaFixa[]>([]);
  const [aportes, setAportes] = useState<Record<number, Aporte[]>>({});
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  const [modalRF, setModalRF] = useState(false);
  const [editandoRF, setEditandoRF] = useState<RendaFixa | null>(null);
  const [formRF, setFormRF] = useState(FORM_RF_VAZIO);

  const [modalAporte, setModalAporte] = useState<number | null>(null);
  const [formAporte, setFormAporte] = useState(FORM_APORTE_VAZIO);

  const [modalValor, setModalValor] = useState<RendaFixa | null>(null);
  const [novoValor, setNovoValor] = useState("");

  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [formTransferencia, setFormTransferencia] = useState({
    origem_id: "", destino_id: "", valor: "", data: "", observacao: "",
  });

  const patrimonioTotal = itens.reduce((acc, r) => acc + Number(r.valor_atual), 0);
  const totalAportado = itens.reduce((acc, r) => acc + Number(r.total_aportado), 0);
  const totalRendimentos = itens.reduce((acc, r) => {
  const lucro = Number(r.valor_atual) - Number(r.total_aportado) + Number(r.total_resgatado);
  return acc + (lucro > 0 ? lucro : 0);
}, 0);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/investimentos/renda-fixa", { cache: "no-store" });
    setItens(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarAportes(id: number) {
    if (aportes[id]) return;
    const res = await fetch(`/api/investimentos/renda-fixa-aportes?renda_fixa_id=${id}`, { cache: "no-store" });
    const data = await res.json();
    setAportes(a => ({ ...a, [id]: data }));
  }

  function toggleAberto(id: number) {
    if (!abertos[id]) carregarAportes(id);
    setAbertos(a => ({ ...a, [id]: !a[id] }));
  }

  async function salvarRF() {
    if (!formRF.nome || !formRF.tipo) return;
    if (editandoRF) {
      await fetch(`/api/investimentos/renda-fixa?id=${editandoRF.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formRF),
      });
    } else {
      await fetch("/api/investimentos/renda-fixa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formRF),
      });
    }
    setModalRF(false);
    setEditandoRF(null);
    setFormRF(FORM_RF_VAZIO);
    await carregar();
  }

  async function salvarAporte() {
    if (!modalAporte || !formAporte.data_aporte || !formAporte.valor) return;
    await fetch("/api/investimentos/renda-fixa-aportes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        renda_fixa_id: modalAporte,
        data_aporte: formAporte.data_aporte,
        valor: parseBR(formAporte.valor),
        tipo: formAporte.tipo,
        observacao: formAporte.observacao || null,
      }),
    });
    setModalAporte(null);
    setFormAporte(FORM_APORTE_VAZIO);
    setAportes(a => { const n = { ...a }; delete n[modalAporte]; return n; });
    await carregar();
  }

  async function salvarValorAtual() {
    if (!modalValor || !novoValor) return;
    await fetch(`/api/investimentos/renda-fixa?id=${modalValor.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor_atual: parseBR(novoValor) }),
    });
    setModalValor(null);
    setNovoValor("");
    await carregar();
  }

  async function deletarAporte(id: number, rf_id: number) {
    if (!confirm("Remover este lançamento?")) return;
    await fetch(`/api/investimentos/renda-fixa-aportes?id=${id}`, { method: "DELETE" });
    setAportes(a => ({ ...a, [rf_id]: a[rf_id]?.filter(x => x.id !== id) }));
    await carregar();
  }

  async function deletarRF(id: number) {
    if (!confirm("Remover esta aplicação?")) return;
    await fetch(`/api/investimentos/renda-fixa?id=${id}`, { method: "DELETE" });
    await carregar();
  }

  async function salvarTransferencia() {
    const { origem_id, destino_id, valor, data, observacao } = formTransferencia;
    if (!origem_id || !destino_id || !valor || !data || origem_id === destino_id) return;
    const valorNum = parseBR(valor);
    const obs = observacao || null;
    const origem = itens.find(r => r.id === Number(origem_id))!;
    const destino = itens.find(r => r.id === Number(destino_id))!;
    await Promise.all([
      fetch("/api/investimentos/renda-fixa-aportes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renda_fixa_id: Number(origem_id), data_aporte: data, valor: valorNum, tipo: "transferencia_saida", observacao: obs }),
      }),
      fetch("/api/investimentos/renda-fixa-aportes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renda_fixa_id: Number(destino_id), data_aporte: data, valor: valorNum, tipo: "transferencia_entrada", observacao: obs }),
      }),
      fetch(`/api/investimentos/renda-fixa?id=${origem_id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor_atual: Number(origem.valor_atual) - valorNum }),
      }),
      fetch(`/api/investimentos/renda-fixa?id=${destino_id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor_atual: Number(destino.valor_atual) + valorNum }),
      }),
    ]);
    setModalTransferencia(false);
    setFormTransferencia({ origem_id: "", destino_id: "", valor: "", data: "", observacao: "" });
    setAportes({});
    await carregar();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Renda Fixa</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            CDB, LCI, LCA, Tesouro e outros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalTransferencia(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
            <ArrowLeftRight size={15} /> Transferir
          </button>
          <button onClick={() => { setEditandoRF(null); setFormRF(FORM_RF_VAZIO); setModalRF(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#0ea5e9", color: "#fff" }}>
            <Plus size={15} /> Nova aplicação
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Patrimônio atual</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#0369a1" }}>{fmtBRL(patrimonioTotal)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Total aportado</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{fmtBRL(totalAportado)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Rendimentos registrados</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#22c55e" }}>{fmtBRL(totalRendimentos)}</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Carregando...</p>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border p-8 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p style={{ color: "var(--text-muted)" }}>Nenhuma aplicação cadastrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {itens.map(r => {
            const cor = TIPO_COR[r.tipo] ?? "#64748b";
            const lucro = Number(r.valor_atual) - Number(r.total_aportado) + Number(r.total_resgatado);
            const rentPct = Number(r.total_aportado) > 0 ? (lucro / Number(r.total_aportado)) * 100 : 0;

            return (
              <div key={r.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ background: "var(--surface)" }}>
                  <button className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => toggleAberto(r.id)}>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold"
                      style={{ background: cor + "22", color: cor }}>
                      {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{r.nome}</p>
                      {r.instituicao && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.instituicao}</p>}
                    </div>
                    {r.rentabilidade && (
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                        {r.rentabilidade}
                      </span>
                    )}
                    {r.data_vencimento && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        vence {fmtData(r.data_vencimento)}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Valor atual</p>
                      <button onClick={() => { setModalValor(r); setNovoValor(String(r.valor_atual)); }}
                        className="flex items-center gap-1 font-bold text-sm hover:underline"
                        style={{ color: "#0369a1" }}>
                        {Number(r.valor_atual) > 0 ? fmtBRL(Number(r.valor_atual)) : "Informar"}
                        <RefreshCw size={11} />
                      </button>
                      {r.atualizado_em && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {fmtData(r.atualizado_em)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resultado</p>
                      <p className="text-sm font-bold" style={{ color: lucro >= 0 ? "#22c55e" : "#ef4444" }}>
                        {lucro >= 0 ? "+" : ""}{fmtBRL(lucro)}
                      </p>
                      <p className="text-xs" style={{ color: rentPct >= 0 ? "#22c55e" : "#ef4444" }}>
                        {rentPct >= 0 ? "+" : ""}{fmt(rentPct)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModalAporte(r.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                        <Plus size={11} /> Movimentação
                      </button>
                      <button onClick={() => {
                        setEditandoRF(r);
                        setFormRF({
                          nome: r.nome, instituicao: r.instituicao ?? "",
                          tipo: r.tipo, rentabilidade: r.rentabilidade ?? "",
                          data_vencimento: r.data_vencimento ? String(r.data_vencimento).split("T")[0] : "",
                        });
                        setModalRF(true);
                      }} className="p-1.5 rounded" style={{ color: "#0ea5e9" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deletarRF(r.id)}
                        className="p-1.5 rounded" style={{ color: "#ef4444" }}>
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => toggleAberto(r.id)} className="p-1.5">
                        {abertos[r.id]
                          ? <ChevronUp size={16} color="var(--text-muted)" />
                          : <ChevronDown size={16} color="var(--text-muted)" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Histórico de aportes */}
                {abertos[r.id] && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    {!aportes[r.id] ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Carregando...</p>
                    ) : aportes[r.id].length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Nenhuma movimentação registrada.</p>
                    ) : (
                      <table className="w-full" style={{ background: "var(--surface2)" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["Data", "Tipo", "Valor", "Observação", ""].map((h, i) => (
                              <th key={i} style={{
                                color: "var(--text-muted)", fontSize: 11, fontWeight: 600,
                                textTransform: "uppercase", letterSpacing: "0.05em",
                                padding: "8px 14px", textAlign: i === 2 ? "right" : "left",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {aportes[r.id].map(a => (
                            <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                              <td className="px-4 py-2 text-sm" style={{ color: "var(--text)" }}>
                                {fmtData(a.data_aporte)}
                              </td>
                              <td className="px-4 py-2">
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                  background: a.tipo === "resgate" ? "#fee2e2" : a.tipo === "rendimento" ? "#dcfce7" : a.tipo?.startsWith("transferencia") ? "#f3e8ff" : "#dbeafe",
                                  color: a.tipo === "resgate" ? "#991b1b" : a.tipo === "rendimento" ? "#166534" : a.tipo?.startsWith("transferencia") ? "#7e22ce" : "#1d4ed8",
                                }}>
                                  {APORTE_LABEL[a.tipo] ?? a.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-semibold" style={{
                                color: a.tipo === "resgate" || a.tipo === "transferencia_saida" ? "#ef4444" : a.tipo === "rendimento" || a.tipo === "transferencia_entrada" ? "#22c55e" : "var(--text)",
                              }}>
                                {a.tipo === "resgate" || a.tipo === "transferencia_saida" ? "−" : "+"}{fmtBRL(Number(a.valor))}
                              </td>
                              <td className="px-4 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                                {a.observacao ?? "—"}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button onClick={() => deletarAporte(a.id, r.id)}
                                  className="p-1 rounded" style={{ color: "#ef4444" }}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nova/editar aplicação */}
      {modalRF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                {editandoRF ? "Editar aplicação" : "Nova aplicação"}
              </h2>
              <button onClick={() => setModalRF(false)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Nome *</label>
                <input style={inputSty} placeholder="Ex: CDB Banco Inter 110% CDI"
                  value={formRF.nome} onChange={e => setFormRF(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Tipo *</label>
                <select style={inputSty} value={formRF.tipo}
                  onChange={e => setFormRF(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Instituição</label>
                <input style={inputSty} placeholder="Ex: Banco Inter"
                  value={formRF.instituicao} onChange={e => setFormRF(f => ({ ...f, instituicao: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Rentabilidade</label>
                <input style={inputSty} placeholder="Ex: 110% CDI, IPCA+5%"
                  value={formRF.rentabilidade} onChange={e => setFormRF(f => ({ ...f, rentabilidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Vencimento</label>
                <input type="date" style={inputSty} value={formRF.data_vencimento}
                  onChange={e => setFormRF(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalRF(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarRF}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> {editandoRF ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nova movimentação */}
      {modalAporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                Registrar movimentação — {itens.find(r => r.id === modalAporte)?.nome}
              </h2>
              <button onClick={() => setModalAporte(null)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Data *</label>
                <input type="date" style={inputSty} value={formAporte.data_aporte}
                  onChange={e => setFormAporte(f => ({ ...f, data_aporte: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Tipo</label>
                <select style={inputSty} value={formAporte.tipo}
                  onChange={e => setFormAporte(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(APORTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor *</label>
                <input style={inputSty} placeholder="0,00" value={formAporte.valor}
                  onChange={e => setFormAporte(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Observação</label>
                <input style={inputSty} value={formAporte.observacao}
                  onChange={e => setFormAporte(f => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalAporte(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarAporte}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal transferência */}
      {modalTransferencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Transferência entre rendas fixas</h2>
              <button onClick={() => setModalTransferencia(false)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Origem *</label>
                <select style={inputSty} value={formTransferencia.origem_id}
                  onChange={e => setFormTransferencia(f => ({ ...f, origem_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {itens.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Destino *</label>
                <select style={inputSty} value={formTransferencia.destino_id}
                  onChange={e => setFormTransferencia(f => ({ ...f, destino_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {itens.filter(r => String(r.id) !== formTransferencia.origem_id).map(r => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor *</label>
                <input style={inputSty} placeholder="0,00" value={formTransferencia.valor}
                  onChange={e => setFormTransferencia(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Data *</label>
                <input type="date" style={inputSty} value={formTransferencia.data}
                  onChange={e => setFormTransferencia(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Observação</label>
                <input style={inputSty} value={formTransferencia.observacao}
                  onChange={e => setFormTransferencia(f => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalTransferencia(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarTransferencia}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> Transferir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal atualizar valor atual */}
      {modalValor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                Atualizar valor — {modalValor.nome}
              </h2>
              <button onClick={() => setModalValor(null)}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Valor atual (R$)</label>
              <input style={inputSty} placeholder="0,00" value={novoValor}
                onChange={e => setNovoValor(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalValor(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={salvarValorAtual}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0ea5e9", color: "#fff" }}>
                <Check size={14} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}