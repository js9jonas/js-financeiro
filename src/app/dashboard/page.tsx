import GraficoReceitas from "@/components/financeiro/GraficoReceitas";
import ProjecaoSaldo from "@/components/financeiro/ProjecaoSaldo";
import { query } from "@/lib/db";
import { CartaoSaldo } from "@/components/financeiro/CartaoSaldo";
import type { ContaComSaldo } from "@/types/financeiro";
import AutoRefresh from "@/components/AutoRefresh";
export const dynamic = 'force-dynamic';
interface ContaComSaldoEFluxo extends ContaComSaldo {
  fluxo_caixa: boolean;
}

async function getDashboardData() {
  const contasFluxo = await query<ContaComSaldoEFluxo>(`
    SELECT * FROM privado.v_saldo_contas WHERE fluxo_caixa = true ORDER BY nome
  `);
  const saldoTotal = contasFluxo.reduce((acc, c) => acc + Number(c.saldo_atual), 0);

  const [pendente30] = await query<{ total: string }>(`
  SELECT COALESCE(SUM(r.valor_padrao), 0) AS total
  FROM privado.recorrentes r
  LEFT JOIN privado.transacoes t 
    ON t.recorrente_id = r.id 
    AND DATE_TRUNC('month', t.data_pagamento) = DATE_TRUNC('month', CURRENT_DATE)
  WHERE r.ativo = TRUE
    AND DATE_TRUNC('month', r.data_vencimento) = DATE_TRUNC('month', CURRENT_DATE)
    AND t.id IS NULL
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

  return { contasFluxo, saldoTotal, totalPendente, totalPago, receitasMes };
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

  const { contasFluxo, saldoTotal, totalPendente, totalPago, receitasMes } = data;

  return (
    
    <div className="flex flex-col gap-6 max-w-5xl">
      <AutoRefresh intervalMs={5000} />
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Visão geral das suas finanças
        </p>
      </div>

      {contasFluxo.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {contasFluxo.map(conta => (
            <div key={conta.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: conta.cor ?? "#64748b" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{conta.nome}</span>
              <span className="text-sm font-semibold ml-1"
                style={{ color: Number(conta.saldo_atual) >= 0 ? "#0ea5e9" : "#ef4444" }}>
                R$ {Number(conta.saldo_atual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CartaoSaldo titulo="Saldo Fluxo" valor={saldoTotal} descricao="Contas de fluxo de caixa" cor="azul" />
        <CartaoSaldo titulo="Receitas do Mês" valor={receitasMes} descricao="Recebimentos IPTV" cor="verde" />
        <CartaoSaldo titulo="Pago no Mês" valor={totalPago} descricao="Despesas efetivadas" cor="vermelho" />
        <CartaoSaldo titulo="Pendente (mês)" valor={totalPendente} descricao="Pendente no mês atual" cor="amarelo" />
      </div>

      <ProjecaoSaldo />

      <GraficoReceitas refreshKey={Date.now()} />

    </div>
  );
}