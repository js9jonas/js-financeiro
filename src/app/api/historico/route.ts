import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = parseInt(searchParams.get("mes") ?? String(new Date().getMonth() + 1));
  const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()));

  try {
    // 1. Resumo por tipo no mês selecionado
    const resumoTipo = await query<{ tipo_despesa: string; total: string; quantidade: string }>(`
      SELECT
        COALESCE(tipo_despesa::TEXT, 'sem_tipo') AS tipo_despesa,
        SUM(valor) AS total,
        COUNT(*) AS quantidade
      FROM privado.transacoes
      WHERE tipo = 'despesa'
        AND EXTRACT(MONTH FROM data_pagamento) = $1
        AND EXTRACT(YEAR  FROM data_pagamento) = $2
        AND data_pagamento IS NOT NULL
      GROUP BY tipo_despesa
      ORDER BY total DESC
    `, [mes, ano]);

    // 2. Comparativo últimos 12 meses (total por mês)
    const comparativo = await query<{ mes: string; total: string; tipo_despesa: string }>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', data_pagamento), 'YYYY-MM') AS mes,
        COALESCE(tipo_despesa::TEXT, 'sem_tipo') AS tipo_despesa,
        SUM(valor) AS total
      FROM privado.transacoes
      WHERE tipo = 'despesa'
        AND data_pagamento IS NOT NULL
        AND data_pagamento >= (DATE_TRUNC('month', MAKE_DATE($2, $1, 1)) - INTERVAL '11 months')
        AND data_pagamento <  (DATE_TRUNC('month', MAKE_DATE($2, $1, 1)) + INTERVAL '1 month')
      GROUP BY 1, 2
      ORDER BY 1, 2
    `, [mes, ano]);

    // 3. Total geral dos últimos 12 meses por mês (para o gráfico de linha)
    const totalMensal = await query<{ mes: string; total: string }>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', data_pagamento), 'YYYY-MM') AS mes,
        SUM(valor) AS total
      FROM privado.transacoes
      WHERE tipo = 'despesa'
        AND data_pagamento IS NOT NULL
        AND data_pagamento >= (DATE_TRUNC('month', MAKE_DATE($2, $1, 1)) - INTERVAL '11 months')
        AND data_pagamento <  (DATE_TRUNC('month', MAKE_DATE($2, $1, 1)) + INTERVAL '1 month')
      GROUP BY 1
      ORDER BY 1
    `, [mes, ano]);

    // 4. Lista de transações do mês com filtro
    const transacoes = await query(`
      SELECT
        t.id, t.descricao, t.valor, t.tipo_despesa,
        t.data_pagamento, t.observacao,
        c.nome AS conta_nome, c.cor AS conta_cor
      FROM privado.transacoes t
      LEFT JOIN privado.contas c ON c.id = t.conta_id
      WHERE t.tipo = 'despesa'
        AND t.data_pagamento IS NOT NULL
        AND EXTRACT(MONTH FROM t.data_pagamento) = $1
        AND EXTRACT(YEAR  FROM t.data_pagamento) = $2
      ORDER BY t.data_pagamento DESC, t.valor DESC
    `, [mes, ano]);

    // 5. Mês anterior para comparação
    const mesAnteriorDate = new Date(ano, mes - 2, 1);
    const mesAnt = mesAnteriorDate.getMonth() + 1;
    const anoAnt = mesAnteriorDate.getFullYear();

    const [totalMesAnterior] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM privado.transacoes
      WHERE tipo = 'despesa'
        AND data_pagamento IS NOT NULL
        AND EXTRACT(MONTH FROM data_pagamento) = $1
        AND EXTRACT(YEAR  FROM data_pagamento) = $2
    `, [mesAnt, anoAnt]);

    return NextResponse.json({
      resumoTipo,
      comparativo,
      totalMensal,
      transacoes,
      totalMesAnterior: Number(totalMesAnterior?.total ?? 0),
      mes,
      ano,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });
  }
}