"use client";
import { useEffect, useState } from "react";
import type { Conta, Categoria, TipoDespesa } from "@/types/financeiro";
import { TIPO_DESPESA_LABEL } from "@/types/financeiro";

type Aba = "despesa" | "entrada" | "transferencia";

export default function LancamentoPage() {
  const [aba, setAba] = useState<Aba>("despesa");
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const hoje = new Date().toISOString().split("T")[0];

  // Form despesa
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipoDespesa, setTipoDespesa] = useState<TipoDespesa | "">("");
  const [categoriaId, setCategoriaId] = useState("");
  const [contaId, setContaId] = useState("");
  const [dataVencimento, setDataVencimento] = useState(hoje);
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [recorrente, setRecorrente] = useState(false);

  // Form entrada
  const [eDescricao, setEDescricao] = useState("");
  const [eValor, setEValor] = useState("");
  const [eContaId, setEContaId] = useState("");
  const [eCategoriaId, setECategoriaId] = useState("");
  const [eData, setEData] = useState(hoje);
  const [eObs, setEObs] = useState("");

  // Form transferência
  const [tValor, setTValor] = useState("");
  const [tOrigem, setTOrigem] = useState("");
  const [tDestino, setTDestino] = useState("");
  const [tData, setTData] = useState(hoje);
  const [tObs, setTObs] = useState("");

  useEffect(() => {
    fetch("/api/contas").then(r => r.json()).then(setContas);
    fetch("/api/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
  }, []);

  const ok = () => { setSucesso(true); setTimeout(() => setSucesso(false), 3000); };

  const resetDespesa = () => {
    setDescricao(""); setValor(""); setTipoDespesa(""); setCategoriaId("");
    setContaId(""); setDataVencimento(hoje); setDataPagamento(""); setObservacao(""); setRecorrente(false);
  };
  const resetEntrada = () => {
    setEDescricao(""); setEValor(""); setEContaId(""); setECategoriaId(""); setEData(hoje); setEObs("");
  };
  const resetTransferencia = () => {
    setTValor(""); setTOrigem(""); setTDestino(""); setTData(hoje); setTObs("");
  };

  const salvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/transacoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "despesa", tipo_despesa: tipoDespesa || undefined,
          categoria_id: categoriaId ? Number(categoriaId) : undefined,
          descricao, valor: parseFloat(valor.replace(",", ".")),
          data_vencimento: dataVencimento || undefined,
          data_pagamento: dataPagamento || undefined,
          conta_id: contaId ? Number(contaId) : undefined,
          observacao: observacao || undefined, recorrente,
        }),
      });
      if (res.ok) { ok(); resetDespesa(); }
    } finally { setLoading(false); }
  };

  const salvarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/entradas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: eDescricao, valor: parseFloat(eValor.replace(",", ".")),
          data_recebimento: eData,
          conta_id: eContaId ? Number(eContaId) : undefined,
          categoria_id: eCategoriaId ? Number(eCategoriaId) : undefined,
          observacao: eObs || undefined,
        }),
      });
      if (res.ok) { ok(); resetEntrada(); }
    } finally { setLoading(false); }
  };

  const salvarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tOrigem === tDestino) { alert("Conta de origem e destino não podem ser iguais."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/transacoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "transferencia",
          descricao: `Transferência${tObs ? ": " + tObs : ""}`,
          valor: parseFloat(tValor.replace(",", ".")),
          data_pagamento: tData,
          conta_id: Number(tOrigem),
          conta_destino_id: Number(tDestino),
          observacao: tObs || undefined,
        }),
      });
      if (res.ok) { ok(); resetTransferencia(); }
      else { const err = await res.json(); alert("Erro: " + err.error); }
    } finally { setLoading(false); }
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 transition";
  const inputStyle = { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" };
  const labelCls = "text-xs font-medium uppercase tracking-wide";
  const labelStyle = { color: "var(--text-muted)" };

  const ABAS: { id: Aba; label: string; cor: string }[] = [
    { id: "despesa",       label: "💸 Despesa",       cor: "#0ea5e9" },
    { id: "entrada",       label: "💰 Entrada",       cor: "#22c55e" },
    { id: "transferencia", label: "🔁 Transferência", cor: "#a855f7" },
  ];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Novo Lançamento</h1>

      {/* Abas */}
      <div className="flex rounded-xl p-1 mb-6 gap-1" style={{ background: "var(--surface2)" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={aba === a.id ? { background: a.cor, color: "#fff" } : { color: "var(--text-muted)" }}>
            {a.label}
          </button>
        ))}
      </div>

      {sucesso && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: "#052e16", color: "#22c55e" }}>
          ✓ Lançamento salvo com sucesso!
        </div>
      )}

      {/* Form Despesa */}
      {aba === "despesa" && (
        <form onSubmit={salvarDespesa} className="flex flex-col gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Descrição *</label>
            <input className={inputCls} style={inputStyle} value={descricao}
              onChange={e => setDescricao(e.target.value)} required placeholder="Ex: Fatura Nubank" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={labelStyle}>Valor (R$) *</label>
              <input className={inputCls} style={inputStyle} value={valor}
                onChange={e => setValor(e.target.value)} required placeholder="0,00" />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Tipo</label>
              <select className={inputCls} style={inputStyle} value={tipoDespesa}
                onChange={e => setTipoDespesa(e.target.value as TipoDespesa)}>
                <option value="">Selecione...</option>
                {Object.entries(TIPO_DESPESA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={labelStyle}>Vencimento</label>
              <input type="date" className={inputCls} style={inputStyle} value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Pago em</label>
              <input type="date" className={inputCls} style={inputStyle} value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Conta</label>
            <select className={inputCls} style={inputStyle} value={contaId}
              onChange={e => setContaId(e.target.value)}>
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Observação</label>
            <input className={inputCls} style={inputStyle} value={observacao}
              onChange={e => setObservacao(e.target.value)} placeholder="Opcional" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <input type="checkbox" checked={recorrente} onChange={e => setRecorrente(e.target.checked)} />
            Lançamento recorrente (mensal)
          </label>
          <button type="submit" disabled={loading}
            className="mt-2 py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#0ea5e9" }}>
            {loading ? "Salvando..." : "Salvar Despesa"}
          </button>
        </form>
      )}

      {/* Form Entrada */}
      {aba === "entrada" && (
        <form onSubmit={salvarEntrada} className="flex flex-col gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Descrição *</label>
            <input className={inputCls} style={inputStyle} value={eDescricao}
              onChange={e => setEDescricao(e.target.value)} required placeholder="Ex: Pró-labore março" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={labelStyle}>Valor (R$) *</label>
              <input className={inputCls} style={inputStyle} value={eValor}
                onChange={e => setEValor(e.target.value)} required placeholder="0,00" />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Data recebimento *</label>
              <input type="date" className={inputCls} style={inputStyle} value={eData}
                onChange={e => setEData(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Conta</label>
            <select className={inputCls} style={inputStyle} value={eContaId}
              onChange={e => setEContaId(e.target.value)}>
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Observação</label>
            <input className={inputCls} style={inputStyle} value={eObs}
              onChange={e => setEObs(e.target.value)} placeholder="Opcional" />
          </div>
          <button type="submit" disabled={loading}
            className="mt-2 py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#22c55e" }}>
            {loading ? "Salvando..." : "Salvar Entrada"}
          </button>
        </form>
      )}

      {/* Form Transferência */}
      {aba === "transferencia" && (
        <form onSubmit={salvarTransferencia} className="flex flex-col gap-4">
          <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#1e1b4b", color: "#a5b4fc" }}>
            🔁 Transferências não são contabilizadas como receita ou despesa — apenas movem saldo entre contas.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={labelStyle}>Valor (R$) *</label>
              <input className={inputCls} style={inputStyle} value={tValor}
                onChange={e => setTValor(e.target.value)} required placeholder="0,00" />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Data *</label>
              <input type="date" className={inputCls} style={inputStyle} value={tData}
                onChange={e => setTData(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Conta de origem *</label>
            <select className={inputCls} style={inputStyle} value={tOrigem}
              onChange={e => setTOrigem(e.target.value)} required>
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-center text-xl" style={{ color: "var(--text-muted)" }}>↓</div>
          <div>
            <label className={labelCls} style={labelStyle}>Conta de destino *</label>
            <select className={inputCls} style={inputStyle} value={tDestino}
              onChange={e => setTDestino(e.target.value)} required>
              <option value="">Selecione...</option>
              {contas.filter(c => String(c.id) !== tOrigem).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Observação</label>
            <input className={inputCls} style={inputStyle} value={tObs}
              onChange={e => setTObs(e.target.value)} placeholder="Opcional" />
          </div>
          <button type="submit" disabled={loading}
            className="mt-2 py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#a855f7" }}>
            {loading ? "Salvando..." : "Salvar Transferência"}
          </button>
        </form>
      )}
    </div>
  );
}