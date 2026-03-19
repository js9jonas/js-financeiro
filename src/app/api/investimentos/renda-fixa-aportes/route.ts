import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const renda_fixa_id = searchParams.get("renda_fixa_id");
  if (!renda_fixa_id) return NextResponse.json({ error: "renda_fixa_id obrigatório" }, { status: 400 });

  try {
    const rows = await query(`
      SELECT * FROM privado.investimentos_renda_fixa_aportes
      WHERE renda_fixa_id = $1
      ORDER BY data_aporte DESC
    `, [renda_fixa_id]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar aportes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { renda_fixa_id, data_aporte, valor, tipo, observacao } = body;
    if (!renda_fixa_id || !data_aporte || !valor) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }
    const [row] = await query<{ id: number }>(`
      INSERT INTO privado.investimentos_renda_fixa_aportes
        (renda_fixa_id, data_aporte, valor, tipo, observacao)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [renda_fixa_id, data_aporte, valor, tipo || "aporte", observacao || null]);
    return NextResponse.json({ id: row.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao registrar aporte" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await query(`DELETE FROM privado.investimentos_renda_fixa_aportes WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao deletar aporte" }, { status: 500 });
  }
}