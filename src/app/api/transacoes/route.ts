import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { NovaTransacao } from "@/types/financeiro";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dias = Number(searchParams.get("dias") ?? 90);
  const status = searchParams.get("status"); // "pendente" | "pago" | null (todos)

  let sql = `
    SELECT
      t.id, t.descricao, t.tipo_despesa, t.valor,
      t.data_vencimento, t.data_pagamento, t.observacao,
      t.recorrente, t.conta_id,
      c.nome AS conta_nome, c.cor AS conta_cor,
      cat.nome AS categoria_nome,
      CASE WHEN t.data_pagamento IS NULL THEN 'pendente' ELSE 'pago' END AS status,
      (t.data_vencimento - CURRENT_DATE) AS dias_para_vencimento
    FROM privado.transacoes t
    LEFT JOIN privado.contas c ON c.id = t.conta_id
    LEFT JOIN privado.categorias cat ON cat.id = t.categoria_id
    WHERE t.tipo = 'despesa'
  `;

  const params: unknown[] = [dias];

  if (status === "pendente") {
    // Pendentes: qualquer vencimento até +N dias (inclui vencidos)
    sql += ` AND t.data_pagamento IS NULL
      AND t.data_vencimento <= (CURRENT_DATE + ($1 || ' days')::INTERVAL)`;
  } else if (status === "pago") {
    // Pagos: data de pagamento nos últimos N dias
    sql += ` AND t.data_pagamento IS NOT NULL
      AND t.data_pagamento >= (CURRENT_DATE - ($1 || ' days')::INTERVAL)`;
  } else {
    // Todos: pendentes até +N dias OU pagos nos últimos N dias
    sql += ` AND (
      (t.data_pagamento IS NULL AND t.data_vencimento <= (CURRENT_DATE + ($1 || ' days')::INTERVAL))
      OR
      (t.data_pagamento IS NOT NULL AND t.data_pagamento >= (CURRENT_DATE - ($1 || ' days')::INTERVAL))
    )`;
  }

  sql += " ORDER BY t.data_vencimento ASC";

  try {
    const rows = await query(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar transações" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body: NovaTransacao = await req.json();

  const {
    tipo, tipo_despesa, categoria_id, descricao, observacao,
    valor, data_vencimento, data_pagamento, conta_id,
    conta_destino_id, recorrente,
  } = body;

  try {
    const rows = await query(
      `INSERT INTO privado.transacoes
        (tipo, tipo_despesa, categoria_id, descricao, observacao, valor,
         data_vencimento, data_pagamento, conta_id, conta_destino_id, recorrente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        tipo, tipo_despesa ?? null, categoria_id ?? null,
        descricao, observacao ?? null, valor,
        data_vencimento ?? null, data_pagamento ?? null,
        conta_id ?? null, conta_destino_id ?? null,
        recorrente ?? false,
      ]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar transação" }, { status: 500 });
  }
}