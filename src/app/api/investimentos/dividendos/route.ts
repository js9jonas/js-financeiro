import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ativo_id = searchParams.get("ativo_id");

  try {
    // Resumo por ativo com total recebido e yield
    if (!ativo_id) {
      const rows = await query(`
SELECT
  a.id,
  a.ticker,
  a.nome,
  a.tipo,
  COALESCE(SUM(d.valor), 0) AS total_dividendos,
  COUNT(d.id) AS qtd_pagamentos,
  MAX(d.data_pagamento) AS ultimo_pagamento,
  CASE
    WHEN (
      SELECT COALESCE(SUM(c2.quantidade * c2.preco_unitario + COALESCE(c2.taxas,0)), 0)
      FROM privado.investimentos_compras c2
      WHERE c2.ativo_id = a.id
    ) > 0
    THEN COALESCE(SUM(d.valor), 0) / (
      SELECT SUM(c2.quantidade * c2.preco_unitario + COALESCE(c2.taxas,0))
      FROM privado.investimentos_compras c2
      WHERE c2.ativo_id = a.id
    ) * 100
    ELSE 0
  END AS yield_sobre_custo,
  COALESCE(SUM(CASE
    WHEN d.data_pagamento >= CURRENT_DATE - INTERVAL '12 months'
    THEN d.valor ELSE 0
  END), 0) AS dividendos_12m
FROM privado.investimentos_ativos a
LEFT JOIN privado.investimentos_dividendos d ON d.ativo_id = a.id
WHERE a.ativo = TRUE
GROUP BY a.id, a.ticker, a.nome, a.tipo
HAVING COALESCE(SUM(d.valor), 0) > 0
ORDER BY total_dividendos DESC      `);
      return NextResponse.json(rows);
    }

    // Histórico de dividendos de um ativo específico
    const rows = await query(`
      SELECT d.*, a.ticker
      FROM privado.investimentos_dividendos d
      JOIN privado.investimentos_ativos a ON a.id = d.ativo_id
      WHERE d.ativo_id = $1
      ORDER BY d.data_pagamento DESC
    `, [ativo_id]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar dividendos" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { data_pagamento, valor, quantidade_na_data, tipo, observacao } = await req.json();
    await query(`
      UPDATE privado.investimentos_dividendos
      SET data_pagamento = $1, valor = $2, quantidade_na_data = $3, tipo = $4, observacao = $5
      WHERE id = $6
    `, [data_pagamento, valor, quantidade_na_data || null, tipo, observacao || null, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao editar dividendo" }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ativo_id, data_pagamento, valor, quantidade_na_data, tipo, observacao } = body;

    if (!ativo_id || !data_pagamento || !valor) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const [row] = await query<{ id: number }>(`
      INSERT INTO privado.investimentos_dividendos
        (ativo_id, data_pagamento, valor, quantidade_na_data, tipo, observacao)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [ativo_id, data_pagamento, valor, quantidade_na_data || null, tipo || "dividendo", observacao || null]);

    return NextResponse.json({ id: row.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao registrar dividendo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await query(`DELETE FROM privado.investimentos_dividendos WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao deletar dividendo" }, { status: 500 });
  }
}