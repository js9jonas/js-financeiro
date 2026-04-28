"use client";
import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import GraficoProjecaoDiaria from "./GraficoProjecaoDiaria";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

interface ProjecaoData {
  saldoAtual: number;
  receitaReal: number;
  receitaHoje: number;
  mediaDiaHoje: number;
  receitaProjetadaMes: number;
  totalProjetadoRestante: number;
  diasMes: number;
  diasPassados: number;
  diasRestantes: number;
  pendenteMes: number;
  pagoMes: number;
  despesasMes: number;
  projecao: number;
  variacaoDia: number;
  variacaoDiaPct: number;
  base: number;

}

const OPCOES = [
  { valor: 1, label: "1m" },
  { valor: 2, label: "2m" },
  { valor: 3, label: "3m" },
  { valor: 6, label: "6m" },
  { valor: 12, label: "1a" },
];

export default function ProjecaoSaldo() {
  const [base, setBase] = useState(12);
  const [data, setData] = useState<ProjecaoData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projecao?base=${base}`, { cache: 'no-store' });
    setData(await res.json());
    setLoading(false);
  }, [base]);

  useEffect(() => {
    carregar();
    const onVisible = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [carregar]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border p-5 flex flex-col gap-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Projeção do Mês
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Média histórica por dia do mês
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Base histórica</p>
            <div className="flex items-center gap-1 rounded-lg p-1"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {OPCOES.map(o => (
                <button key={o.valor} onClick={() => setBase(o.valor)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={base === o.valor
                    ? { background: "#0ea5e9", color: "#fff" }
                    : { color: "var(--text-muted)" }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading || !data ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Calculando...</p>
          </div>
        ) : (
          <>
            {/* Valor principal */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Saldo estimado ao fim do mês</p>
                <p className="text-3xl font-bold" style={{ color: data.projecao >= 0 ? "#0369a1" : "#ef4444" }}>
                  R$ {fmt(data.projecao)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Receita projetada</p>
                <p className="text-lg font-bold" style={{ color: "#22c55e" }}>R$ {fmt(data.receitaProjetadaMes)}</p>
              </div>
            </div>

            {/* Comparativo do dia */}
            <div className="rounded-lg p-3 flex items-center justify-between"
              style={{
                background: data.variacaoDia >= 0 ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${data.variacaoDia >= 0 ? "#bbf7d0" : "#fecaca"}`,
              }}>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Hoje (dia {new Date().getDate()}) vs média histórica do mesmo dia
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Hoje</p>
                    <p className="font-bold" style={{ color: "var(--text)" }}>R$ {fmt(data.receitaHoje)}</p>
                  </div>
                  <span style={{ color: "var(--text-muted)" }}>vs</span>
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Média dia ({data.base}m)</p>
                    <p className="font-bold" style={{ color: "var(--text)" }}>R$ {fmt(data.mediaDiaHoje)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5"
                style={{ color: data.variacaoDia > 0 ? "#15803d" : data.variacaoDia < 0 ? "#b91c1c" : "var(--text-muted)" }}>
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  {data.variacaoDia > 0 ? <TrendingUp size={16} />
                    : data.variacaoDia < 0 ? <TrendingDown size={16} />
                      : <Minus size={16} />}
                  {data.variacaoDia > 0 ? "+" : ""}{data.variacaoDiaPct.toFixed(1)}%
                </div>
                <span className="text-xs font-semibold">
                  {data.variacaoDia > 0 ? "+" : data.variacaoDia < 0 ? "−" : ""}R$ {fmt(Math.abs(data.variacaoDia))}
                </span>
              </div>
            </div>

            {/* Receita do mês */}
            <div className="rounded-lg p-3 flex flex-col gap-2"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Receita do mês ({data.diasPassados}/{data.diasMes} dias)
              </p>
              <div className="flex gap-3 text-xs">
                <div className="flex-1">
                  <p style={{ color: "var(--text-muted)" }}>Real até hoje</p>
                  <p className="font-semibold" style={{ color: "var(--text)" }}>R$ {fmt(data.receitaReal)}</p>
                </div>
                <div className="flex justify-between">
                  <span>+ Estimado restante do mês</span>
                  <span style={{ color: "#22c55e" }}>+ R$ {fmt(data.totalProjetadoRestante)}</span>
                </div>
                <div className="flex-1">
                  <p style={{ color: "var(--text-muted)" }}>= Total projetado</p>
                  <p className="font-semibold" style={{ color: "#22c55e" }}>R$ {fmt(data.receitaProjetadaMes)}</p>
                </div>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="text-xs flex flex-col gap-1.5 pt-1 border-t"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <div className="flex justify-between">
                <span>Saldo atual</span>
                <span style={{ color: "var(--text)" }}>R$ {fmt(data.saldoAtual)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Receita projetada do mês</span>
                <span style={{ color: "#22c55e" }}>+ R$ {fmt(data.receitaProjetadaMes)}</span>
              </div>
              <div className="flex justify-between">
                <span>− Projeção despesas mês atual</span>
                <span style={{ color: "#ef4444" }}>− R$ {fmt(data.despesasMes)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                <span>= Projeção fim do mês</span>
                <span style={{ color: data.projecao >= 0 ? "#0369a1" : "#ef4444" }}>R$ {fmt(data.projecao)}</span>
              </div>
            </div>
          </>
        )}
      </div>
      <GraficoProjecaoDiaria base={base} />
    </div>
  );
}