import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const body = await req.json();
  const { descricao, valor, tipo_despesa, data_pagamento, data_vencimento, conta_id, observacao } = body;

  try {
    const rows = await query(`
      UPDATE privado.transacoes SET
        descricao        = COALESCE($1, descricao),
        valor            = COALESCE($2, valor),
        tipo_despesa     = COALESCE($3::privado.tipo_despesa_enum, tipo_despesa),
        data_pagamento   = $4,
        data_vencimento  = COALESCE($5, data_vencimento),
        conta_id         = COALESCE($6, conta_id),
        observacao       = $7
      WHERE id = $8
      RETURNING *
    `, [descricao, valor, tipo_despesa || null, data_pagamento || null, data_vencimento, conta_id || null, observacao || null, id]);

    if (!rows.length) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  try {
    await query("DELETE FROM privado.transacoes WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}