import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const { valor, conta_id, mes, ano } = await req.json();
  const hoje = new Date().toISOString().split("T")[0];

  try {
    const [rec] = await query<{
      descricao: string; tipo_despesa: string; valor_padrao: string;
      conta_id: number; observacao: string; data_vencimento: string | null;
    }>(`SELECT *, to_char(data_vencimento, 'YYYY-MM-DD') AS data_vencimento FROM privado.recorrentes WHERE id = $1`, [id]);

    if (!rec) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Evita duplicata no mesmo mês
    const [existente] = await query<{ id: number }>(`
      SELECT id FROM privado.transacoes
      WHERE recorrente_id = $1
        AND data_pagamento IS NOT NULL
        AND EXTRACT(MONTH FROM data_pagamento) = $2
        AND EXTRACT(YEAR  FROM data_pagamento) = $3
    `, [id, mes, ano]);

    if (existente) {
      return NextResponse.json({ error: "Já registrado neste mês" }, { status: 409 });
    }

    await query(`
      INSERT INTO privado.transacoes
        (tipo, descricao, tipo_despesa, valor, data_pagamento, conta_id, observacao, recorrente_id)
      VALUES ('despesa', $1, $2::privado.tipo_despesa_enum, $3, $4, $5, $6, $7)
    `, [
      rec.descricao,
      rec.tipo_despesa || null,
      valor ?? rec.valor_padrao,
      hoje,
      conta_id ?? rec.conta_id,
      rec.observacao || null,
      id,
    ]);

    // Avança data_vencimento do recorrente em +1 mês
    if (rec.data_vencimento) {
      const atual = new Date(rec.data_vencimento + "T12:00:00");
      atual.setMonth(atual.getMonth() + 1);
      const proxima = atual.toISOString().split("T")[0];
      await query(`UPDATE privado.recorrentes SET data_vencimento = $1 WHERE id = $2`, [proxima, id]);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}