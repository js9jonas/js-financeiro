"use client";
import { useEffect, useState, useCallback, memo } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
export const dynamic = 'force-dynamic';
interface Conta {
  id: number;
  nome: string;
  tipo: string;
  cor: string;
  fluxo_caixa: boolean;
  saldo_inicial: number;
  movimentacao: number;
  saldo_atual: number;
}

interface ContaUI extends Conta {
  saldoDigitado: string;
  saldoConfirmado: string;
  ajustando: boolean;
  ajustado: boolean;
  erro: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBR(v: string) {
  return parseFloat(v.replace(/\./g, "").replace(",", "."));
}

// ← FORA do componente pai para não ser recriado a cada render
const CardConta = memo(function CardConta({
  conta,
  onDigitar,
  onConfirmar,
  onAjustar,
  onAtualizar,
  onToggleFluxo,
}: {
  conta: ContaUI;
  onDigitar: (id: number, valor: string) => void;
  onConfirmar: (id: number) => void;
  onAjustar: (conta: ContaUI) => void;
  onAtualizar: (conta: ContaUI) => void;
  onToggleFluxo: (conta: ContaUI) => void;
}) {
  const saldoCalculado = Number(conta.saldo_atual);
  const saldoConfirmado = parseBR(conta.saldoConfirmado);
  const diferenca = isNaN(saldoConfirmado) ? 0 : saldoConfirmado - saldoCalculado;
  const temDivergencia = Math.abs(diferenca) >= 0.01;
  const confirmadoValido = !isNaN(saldoConfirmado);

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{
        background: "var(--surface)",
        borderColor: temDivergencia && confirmadoValido ? "#fbbf24" : "var(--border)"
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: conta.cor ?? "#64748b" }} />
          <span className="font-medium text-sm" style={{ color: "var(--text)" }}>{conta.nome}</span>
        </div>
        {conta.ajustado && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
            <CheckCircle2 size={12} /> Ajustado
          </span>
        )}
      </div>

      {conta.fluxo_caixa && (
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Saldo calculado</p>
          <p className="text-lg font-bold" style={{ color: saldoCalculado >= 0 ? "#0369a1" : "#ef4444" }}>
            R$ {fmt(saldoCalculado)}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
          {conta.fluxo_caixa ? "Saldo real (confirme com Enter)" : "Saldo atual"}
        </p>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          value={conta.saldoDigitado}
          onChange={e => onDigitar(conta.id, e.target.value)}
          onBlur={() => onConfirmar(conta.id)}
          onKeyDown={e => e.key === "Enter" && onConfirmar(conta.id)}
          onFocus={e => e.target.select()}
        />
        {conta.erro && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{conta.erro}</p>}
      </div>

      {conta.fluxo_caixa && temDivergencia && confirmadoValido && (
        <div
          className="rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
          style={{
            background: diferenca > 0 ? "#f0fdf4" : "#fef2f2",
            color: diferenca > 0 ? "#15803d" : "#b91c1c"
          }}
        >
          {diferenca > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          Divergência de R$ {fmt(Math.abs(diferenca))}
          {diferenca > 0 ? " (a mais)" : " (a menos)"}
        </div>
      )}

      {conta.fluxo_caixa && !temDivergencia && confirmadoValido && (
        <div className="flex items-center gap-1 text-xs justify-center" style={{ color: "#22c55e" }}>
          <CheckCircle2 size={12} /> Saldo conferido
        </div>
      )}

      {conta.fluxo_caixa && temDivergencia && confirmadoValido && (
        <button
          onClick={() => onAjustar(conta)}
          disabled={conta.ajustando}
          className="w-full py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "#0ea5e9", color: "#fff" }}
        >
          {conta.ajustando
            ? <><RefreshCw size={13} className="animate-spin" /> Ajustando...</>
            : <><AlertTriangle size={13} /> Lançar ajuste</>
          }
        </button>
      )}

      {!conta.fluxo_caixa && (
        <button
          onClick={() => onAtualizar(conta)}
          disabled={conta.ajustando}
          className="w-full py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
        >
          {conta.ajustando ? "Salvando..." : "Atualizar saldo"}
        </button>
      )}

      <button
        onClick={() => onToggleFluxo(conta)}
        className="w-full py-1.5 rounded-lg text-xs font-medium transition-opacity"
        style={{
          background: conta.fluxo_caixa ? "#fef2f2" : "#f0fdf4",
          color: conta.fluxo_caixa ? "#b91c1c" : "#15803d",
          border: `1px solid ${conta.fluxo_caixa ? "#fecaca" : "#bbf7d0"}`,
        }}
      >
        {conta.fluxo_caixa ? "− Remover do fluxo de caixa" : "+ Incluir no fluxo de caixa"}
      </button>
    </div>
  );
});

export default function ContasPage() {
  const [contas, setContas] = useState<ContaUI[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/contas/saldos");
    const data: Conta[] = await res.json();
    setContas(data.map(c => ({
      ...c,
      saldoDigitado: fmt(Number(c.saldo_atual)),
      saldoConfirmado: fmt(Number(c.saldo_atual)),
      ajustando: false,
      ajustado: false,
      erro: "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const aoDigitar = useCallback((id: number, valor: string) => {
    setContas(prev => prev.map(c => c.id === id
      ? { ...c, saldoDigitado: valor, ajustado: false, erro: "" }
      : c
    ));
  }, []);

  const aoConfirmar = useCallback((id: number) => {
    setContas(prev => prev.map(c => c.id === id
      ? { ...c, saldoConfirmado: c.saldoDigitado }
      : c
    ));
  }, []);

  const ajustarFluxo = useCallback(async (conta: ContaUI) => {
    const saldoReal = parseBR(conta.saldoConfirmado);
    if (isNaN(saldoReal)) {
      setContas(prev => prev.map(c => c.id === conta.id ? { ...c, erro: "Valor inválido" } : c));
      return;
    }
    setContas(prev => prev.map(c => c.id === conta.id ? { ...c, ajustando: true } : c));
    const res = await fetch("/api/contas/ajustar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conta_id: conta.id,
        saldo_real: saldoReal,
        saldo_calculado: Number(conta.saldo_atual),
        nome_conta: conta.nome,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setContas(prev => prev.map(c => c.id === conta.id ? { ...c, ajustando: false, ajustado: true } : c));
      setTimeout(() => carregar(), 1000);
    } else {
      setContas(prev => prev.map(c => c.id === conta.id ? { ...c, ajustando: false, erro: data.error ?? "Erro ao ajustar" } : c));
    }
  }, [carregar]);

  const atualizarPatrimonio = useCallback(async (conta: ContaUI) => {
    const novoSaldo = parseBR(conta.saldoConfirmado);
    if (isNaN(novoSaldo)) {
      setContas(prev => prev.map(c => c.id === conta.id ? { ...c, erro: "Valor inválido" } : c));
      return;
    }
    setContas(prev => prev.map(c => c.id === conta.id ? { ...c, ajustando: true } : c));
    const res = await fetch(`/api/contas/${conta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saldo_inicial: novoSaldo }),
    });
    if (res.ok) {
      setContas(prev => prev.map(c => c.id === conta.id
        ? { ...c, ajustando: false, ajustado: true, saldo_inicial: novoSaldo, saldo_atual: novoSaldo }
        : c
      ));
    } else {
      setContas(prev => prev.map(c => c.id === conta.id ? { ...c, ajustando: false, erro: "Erro ao salvar" } : c));
    }
  }, []);

  const toggleFluxo = useCallback(async (conta: ContaUI) => {
    await fetch(`/api/contas/${conta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fluxo_caixa: !conta.fluxo_caixa }),
    });
    carregar();
  }, [carregar]);

  const contasFluxo = contas.filter(c => c.fluxo_caixa);
  const contasOutras = contas.filter(c => !c.fluxo_caixa);
  const totalFluxo = contasFluxo.reduce((acc, c) => acc + Number(c.saldo_atual), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Contas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Reconciliação e atualização de saldos
          </p>
        </div>
        <button
          onClick={carregar}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div
        className="rounded-xl p-4 border flex items-center justify-between"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide font-medium" style={{ color: "var(--text-muted)" }}>
            Total Fluxo de Caixa
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: totalFluxo >= 0 ? "#0369a1" : "#ef4444" }}>
            R$ {fmt(totalFluxo)}
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{contasFluxo.length} contas ativas</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
          Fluxo de Caixa
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contasFluxo.map(c => (
            <CardConta
              key={c.id}
              conta={c}
              onDigitar={aoDigitar}
              onConfirmar={aoConfirmar}
              onAjustar={ajustarFluxo}
              onAtualizar={atualizarPatrimonio}
              onToggleFluxo={toggleFluxo}
            />
          ))}
        </div>
      </div>

      {contasOutras.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
            Outras Contas / Patrimônio
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contasOutras.map(c => (
              <CardConta
                key={c.id}
                conta={c}
                onDigitar={aoDigitar}
                onConfirmar={aoConfirmar}
                onAjustar={ajustarFluxo}
                onAtualizar={atualizarPatrimonio}
              onToggleFluxo={toggleFluxo}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}