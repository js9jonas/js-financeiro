import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const body = await req.json();
  const { descricao, tipo_despesa, valor_padrao, dia_vencimento, conta_id, observacao, ativo } = body;

  try {
    const [row] = await query(`
      UPDATE privado.recorrentes SET
        descricao      = COALESCE($1, descricao),
        tipo_despesa   = COALESCE($2::privado.tipo_despesa_enum, tipo_despesa),
        valor_padrao   = COALESCE($3, valor_padrao),
        dia_vencimento = COALESCE($4, dia_vencimento),
        conta_id       = COALESCE($5, conta_id),
        observacao     = COALESCE($6, observacao),
        ativo          = COALESCE($7, ativo)
      WHERE id = $8
      RETURNING *
    `, [descricao, tipo_despesa || null, valor_padrao, dia_vencimento, conta_id || null, observacao, ativo, id]);
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar recorrente" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  try {
    await query(`DELETE FROM privado.recorrentes WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao deletar recorrente" }, { status: 500 });
  }
}