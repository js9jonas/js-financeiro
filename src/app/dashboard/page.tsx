import GraficoReceitas from "@/components/financeiro/GraficoReceitas";
import ProjecaoSaldo from "@/components/financeiro/ProjecaoSaldo";
import { query } from "@/lib/db";
import { CartaoSaldo } from "@/components/financeiro/CartaoSaldo";
import type { ContaComSaldo } from "@/types/financeiro";

interface ContaComSaldoEFluxo extends ContaComSaldo {
  fluxo_caixa: boolean;
}

async function getDashboardData() {
  const contas = await query<ContaComSaldoEFluxo>(`
    SELECT * FROM privado.v_saldo_contas ORDER BY fluxo_caixa DESC, nome
  `);

  const contasFluxo = contas.filter(c => c.fluxo_caixa);
  const saldoTotal = contasFluxo.reduce((acc, c) => acc + Number(c.saldo_atual), 0);

  const [pendente30] = await query<{ total: string }>(`
    SELECT COALESCE(SUM(valor), 0) AS total
    FROM privado.transacoes
    WHERE tipo = 'despesa'
      AND data_pagamento IS NULL
      AND DATE_TRUNC('month', data_vencimento) = DATE_TRUNC('month', CURRENT_DATE)
  `);

  const [pagoMes] = await query<{ total: string }>(`
    SELECT COALESCE(SUM(valor), 0) AS total
    FROM privado.transacoes
    WHERE tipo = 'despesa'
      AND data_pagamento IS NOT NULL
      AND DATE_TRUNC('month', data_pagamento) = DATE_TRUNC('month', CURRENT_DATE)
  `);

  const [receitasIptv] = await query<{ total: string }>(`
    SELECT COALESCE(SUM(valor), 0) AS total
    FROM public.pagamentos
    WHERE DATE_TRUNC('month', data_pgto) = DATE_TRUNC('month', CURRENT_DATE)
      AND data_pgto IS NOT NULL
      AND valor > 0
  `);

  const totalPendente = Number(pendente30.total);
  const totalPago = Number(pagoMes.total);
  const receitasMes = Number(receitasIptv.total);

  return { contas, contasFluxo, saldoTotal, totalPendente, totalPago, receitasMes };
}

export default async function DashboardPage() {
  let data;
  let erro = "";

  try {
    data = await getDashboardData();
  } catch (e) {
    console.error(e);
    erro = "Não foi possível conectar ao banco de dados. Verifique o DATABASE_URL no .env.local";
  }

  if (erro || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-center max-w-sm" style={{ color: "#f87171" }}>{erro}</p>
      </div>
    );
  }

  const { contas, contasFluxo, saldoTotal, totalPendente, totalPago, receitasMes } = data;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Visão geral das suas finanças
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CartaoSaldo titulo="Saldo Fluxo"     valor={saldoTotal}    descricao="Contas de fluxo de caixa"    cor="azul"     />
        <CartaoSaldo titulo="Receitas do Mês" valor={receitasMes}   descricao="Recebimentos IPTV"     cor="verde"    />
        <CartaoSaldo titulo="Pago no Mês"     valor={totalPago}     descricao="Despesas efetivadas"         cor="vermelho" />
        <CartaoSaldo titulo="Pendente (mês)"  valor={totalPendente} descricao="Pendente no mês atual"  cor="amarelo"  />
      </div>

      <ProjecaoSaldo />

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
          Fluxo de Caixa
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {contasFluxo.map((conta) => (
            <div
              key={conta.id}
              className="rounded-xl p-4 border flex flex-col gap-2"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: conta.cor ?? "#64748b" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{conta.nome}</span>
              </div>
              <span className="text-xl font-bold" style={{ color: Number(conta.saldo_atual) >= 0 ? "#0369a1" : "#ef4444" }}>
                R$ {Number(conta.saldo_atual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              {Number(conta.movimentacao) !== 0 && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {Number(conta.movimentacao) > 0 ? "+" : ""}
                  R$ {Number(conta.movimentacao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} hoje
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <GraficoReceitas />

      {contas.filter(c => !c.fluxo_caixa).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
            Outras Contas
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {contas.filter(c => !c.fluxo_caixa).map((conta) => (
              <div
                key={conta.id}
                className="rounded-xl p-3 border flex flex-col gap-1"
                style={{ background: "var(--surface2)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: conta.cor ?? "#64748b" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{conta.nome}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  R$ {Number(conta.saldo_inicial).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}