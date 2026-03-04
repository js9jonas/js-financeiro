"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DiaGrafico {
  dia: number;
  real: number | null;
  projetado: number;
}

interface ProjecaoData {
  graficoDias: DiaGrafico[];
  diasPassados: number;
  base: number;
}

function fmt(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-lg"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
      <p className="font-semibold mb-2">Dia {label}</p>
      {payload.map((p: any) => (
        p.value != null && (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {fmt(p.value)}
          </p>
        )
      ))}
    </div>
  );
};

interface Props {
  base: number;
}

export default function GraficoProjecaoDiaria({ base }: Props) {
  const [data, setData] = useState<ProjecaoData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projecao?base=${base}`, { cache: 'no-store' });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [base]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando gráfico...</p>
      </div>
    );
  }

  const hoje = new Date().getDate();

  return (
    <div className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Receita Diária — Real vs Projetado
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Barras = valor real · Linha = média histórica ({base}m)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data.graficoDias} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
            iconType="circle"
            iconSize={8}
          />
          <ReferenceLine
            x={hoje}
            stroke="#f59e0b"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: "hoje", position: "top", fontSize: 9, fill: "#f59e0b" }}
          />
          <Bar
            dataKey="real"
            name="Real"
            fill="#0ea5e9"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Line
            dataKey="projetado"
            name="Projetado"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}