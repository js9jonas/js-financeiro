import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query(`
      SELECT
        a.*,
        COALESCE(SUM(c.quantidade), 0) AS quantidade_total,
        COALESCE(
          SUM(c.quantidade * c.preco_unitario + COALESCE(c.taxas, 0)) /
          NULLIF(SUM(c.quantidade), 0), 0
        ) AS preco_medio,
        COALESCE(SUM(c.quantidade * c.preco_unitario + COALESCE(c.taxas, 0)), 0) AS custo_total,
        p.preco_atual,
        p.variacao_dia,
        p.atualizado_em
      FROM privado.investimentos_ativos a
      LEFT JOIN privado.investimentos_compras c ON c.ativo_id = a.id
      LEFT JOIN privado.investimentos_precos p ON p.ativo_id = a.id
      WHERE a.ativo = TRUE
      GROUP BY a.id, p.preco_atual, p.variacao_dia, p.atualizado_em
      ORDER BY a.tipo, a.ticker
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar ativos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, nome, tipo, moeda, coingecko_id } = body;
    if (!ticker || !tipo) return NextResponse.json({ error: "ticker e tipo são obrigatórios" }, { status: 400 });

    const [row] = await query<{ id: number }>(`
      INSERT INTO privado.investimentos_ativos (ticker, nome, tipo, moeda, coingecko_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (ticker) DO UPDATE SET nome = EXCLUDED.nome, ativo = TRUE
      RETURNING id
    `, [ticker.toUpperCase(), nome || ticker.toUpperCase(), tipo, moeda || "BRL", coingecko_id || null]);

    return NextResponse.json({ id: row.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao cadastrar ativo" }, { status: 500 });
  }
}