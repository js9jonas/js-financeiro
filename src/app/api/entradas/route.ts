import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { NovaEntrada } from "@/types/financeiro";

export async function GET() {
  try {
    const rows = await query(`
      SELECT
        e.*,
        c.nome AS conta_nome,
        cat.nome AS categoria_nome
      FROM privado.entradas e
      LEFT JOIN privado.contas c ON c.id = e.conta_id
      LEFT JOIN privado.categorias cat ON cat.id = e.categoria_id
      ORDER BY e.data_recebimento DESC
      LIMIT 100
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar entradas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body: NovaEntrada = await req.json();
  const { descricao, valor, data_recebimento, conta_id, categoria_id, observacao, recorrente } = body;

  try {
    const rows = await query(
      `INSERT INTO privado.entradas
        (descricao, valor, data_recebimento, conta_id, categoria_id, observacao, recorrente)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [descricao, valor, data_recebimento, conta_id ?? null, categoria_id ?? null, observacao ?? null, recorrente ?? false]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar entrada" }, { status: 500 });
  }
}
