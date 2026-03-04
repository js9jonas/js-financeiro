import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Saldos por conta
    const contas = await query(`
      SELECT * FROM privado.v_saldo_contas
      ORDER BY nome
    `);

    // Total pago no mês — transações vinculadas a recorrentes pagas no mês atual
    const [pagoMes] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(t.valor), 0) AS total
      FROM privado.transacoes t
      WHERE t.tipo = 'despesa'
        AND t.recorrente_id IS NOT NULL
        AND t.data_pagamento IS NOT NULL
        AND DATE_TRUNC('month', t.data_pagamento) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Total pendente no mês — recorrentes ativos sem pagamento neste mês com vencimento no mês atual
    const [pendenteMes] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(r.valor_padrao), 0) AS total
      FROM privado.recorrentes r
      WHERE r.ativo = TRUE
        AND DATE_TRUNC('month', r.data_vencimento) = DATE_TRUNC('month', CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM privado.transacoes t
          WHERE t.recorrente_id = r.id
            AND t.data_pagamento IS NOT NULL
            AND DATE_TRUNC('month', t.data_pagamento) = DATE_TRUNC('month', CURRENT_DATE)
        )
    `);

    // Receitas do mês (entradas manuais)
    const [receitasMes] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM privado.entradas
      WHERE DATE_TRUNC('month', data_recebimento) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Receitas IPTV do mês
    const [receitasIptv] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM public.pagamentos
      WHERE DATE_TRUNC('month', data_pgto) = DATE_TRUNC('month', CURRENT_DATE)
        AND data_pgto IS NOT NULL
    `);

    const saldoTotal = (contas as { saldo_atual: number }[]).reduce(
      (acc, c) => acc + Number(c.saldo_atual),
      0
    );

    return NextResponse.json({
      saldo_total: saldoTotal,
      contas,
      total_pendente_30dias: Number(pendenteMes.total),
      total_pago_mes: Number(pagoMes.total),
      receitas_mes: Number(receitasMes.total) + Number(receitasIptv.total),
      projecao_saldo: saldoTotal - Number(pendenteMes.total),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 });
  }
}