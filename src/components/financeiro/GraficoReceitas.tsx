"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function fmtK(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

interface ReceitaMes {
  mes: string;
  total: string;
  quantidade: string;
}

export default function GraficoReceitas() {
  const [dados, setDados] = useState<{ mes: string; total: number; projecao?: number }[]>([]);
  const [projecao, setProjecao] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    fetch("/api/receitas")
      .then(r => r.json())
      .then(data => {
        const agora = new Date();
        const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

        const processado = (data.receitas as ReceitaMes[]).map(r => ({
          mes: MESES[parseInt(r.mes.split("-")[1]) - 1] + "/" + r.mes.split("-")[0].slice(2),
          total: Number(r.total),
          projecao: r.mes === mesAtual ? data.projecao : undefined,
        }));

        setDados(processado);
        setProjecao(data.projecao);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    carregar();
    const onVisible = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [carregar]);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando gráfico...</p>
    </div>
  );

  const maxVal = Math.max(...dados.map(d => Math.max(d.total, d.projecao ?? 0)));

  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Receitas IPTV — Últimos 12 Meses
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Projeção mês atual</p>
          <p className="text-sm font-bold" style={{ color: "#10b981" }}>R$ {fmt(projecao)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--text-muted)" }} domain={[0, maxVal * 1.15]} />
          <Tooltip
            formatter={(v: unknown, name?: string) => [
              `R$ ${fmt(Number(v))}`,
              name === "total" ? "Recebido" : "Projeção (média 3m)",
            ]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <ReferenceLine y={projecao} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
          <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line
            dataKey="projecao"
            stroke="#10b981"
            strokeWidth={0}
            dot={{ fill: "#10b981", r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: "#0ea5e9" }} /> Recebido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: "#10b981" }} /> Projeção (média 3 meses)
        </span>
      </div>
    </div>
  );
}