import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ativo_id = searchParams.get("ativo_id");

  try {
    const rows = await query(`
      SELECT c.*, a.ticker, a.tipo
      FROM privado.investimentos_compras c
      JOIN privado.investimentos_ativos a ON a.id = c.ativo_id
      ${ativo_id ? "WHERE c.ativo_id = $1" : ""}
      ORDER BY c.data_compra DESC
    `, ativo_id ? [ativo_id] : []);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar compras" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ativo_id, data_compra, quantidade, preco_unitario, taxas, corretora, observacao } = body;

    if (!ativo_id || !data_compra || !quantidade || !preco_unitario) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const [row] = await query<{ id: number }>(`
      INSERT INTO privado.investimentos_compras
        (ativo_id, data_compra, quantidade, preco_unitario, taxas, corretora, observacao)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [ativo_id, data_compra, quantidade, preco_unitario, taxas || 0, corretora || null, observacao || null]);

    return NextResponse.json({ id: row.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao registrar compra" }, { status: 500 });
  }
}