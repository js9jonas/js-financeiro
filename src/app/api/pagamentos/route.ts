import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = parseInt(searchParams.get("mes") ?? String(new Date().getMonth() + 1));
  const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()));

  try {
    const rows = await query(`
      SELECT
        r.id,
        r.descricao,
        r.tipo_despesa,
        r.valor_padrao      AS valor,
        r.data_vencimento,
        r.recorrente,
        r.conta_id,
        r.observacao,
        c.nome              AS conta_nome,
        c.cor               AS conta_cor,
        t.id                AS transacao_id,
        t.data_pagamento,
        t.valor             AS valor_pago,
        cp.nome             AS conta_paga_nome
      FROM privado.recorrentes r
      LEFT JOIN privado.contas c  ON c.id = r.conta_id
      LEFT JOIN privado.transacoes t
             ON t.recorrente_id = r.id
            AND t.data_pagamento IS NOT NULL
            AND EXTRACT(MONTH FROM t.data_pagamento) = $1
            AND EXTRACT(YEAR  FROM t.data_pagamento) = $2
      LEFT JOIN privado.contas cp ON cp.id = t.conta_id
      WHERE r.ativo = TRUE
      ORDER BY r.data_vencimento ASC NULLS LAST, r.descricao
    `, [mes, ano]);

    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { descricao, valor, tipo_despesa, data_vencimento, conta_id, observacao, recorrente } = body;

  try {
    const [row] = await query(`
      INSERT INTO privado.recorrentes
        (descricao, tipo_despesa, valor_padrao, data_vencimento, conta_id, observacao, recorrente)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      descricao,
      tipo_despesa || null,
      valor,
      data_vencimento || null,
      conta_id || null,
      observacao || null,
      recorrente ?? true,
    ]);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}