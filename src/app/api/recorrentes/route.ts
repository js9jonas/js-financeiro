import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(`
      SELECT r.*, c.nome AS conta_nome, c.cor AS conta_cor
      FROM privado.recorrentes r
      LEFT JOIN privado.contas c ON c.id = r.conta_id
      ORDER BY r.ativo DESC, r.descricao
    `);
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar recorrentes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { descricao, tipo_despesa, valor_padrao, dia_vencimento, conta_id, observacao } = body;

  try {
    const [row] = await query(`
      INSERT INTO privado.recorrentes
        (descricao, tipo_despesa, valor_padrao, dia_vencimento, conta_id, observacao)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [descricao, tipo_despesa || null, valor_padrao, dia_vencimento, conta_id || null, observacao || null]);
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar recorrente" }, { status: 500 });
  }
}