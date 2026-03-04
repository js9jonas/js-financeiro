import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { saldo_inicial, fluxo_caixa } = await req.json();
  const id = Number(params.id);

  try {
    const rows = await query(
      `UPDATE privado.contas SET
        saldo_inicial = COALESCE($1, saldo_inicial),
        fluxo_caixa   = COALESCE($2, fluxo_caixa)
       WHERE id = $3 RETURNING *`,
      [saldo_inicial ?? null, fluxo_caixa ?? null, id]
    );
    if (!rows.length) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar conta" }, { status: 500 });
  }
}