import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const { descricao, valor, tipo_despesa, data_vencimento, conta_id, observacao, recorrente } = await req.json();

  try {
    const [row] = await query(`
      UPDATE privado.recorrentes SET
        descricao       = $1,
        valor_padrao    = $2,
        tipo_despesa    = COALESCE($3::privado.tipo_despesa_enum, tipo_despesa),
        data_vencimento = $4,
        conta_id        = $5,
        observacao      = $6,
        recorrente      = $7
      WHERE id = $8
      RETURNING *
    `, [
      descricao, valor, tipo_despesa || null,
      data_vencimento || null, conta_id || null,
      observacao || null, recorrente ?? true, id,
    ]);
    return NextResponse.json(row ?? {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  try {
    await query(`UPDATE privado.recorrentes SET ativo = FALSE WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}