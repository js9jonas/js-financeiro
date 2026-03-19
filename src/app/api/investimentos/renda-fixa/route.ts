import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query(`
      SELECT
        r.*,
        COALESCE(SUM(CASE WHEN a.tipo = 'aporte'    THEN a.valor ELSE 0 END), 0) AS total_aportado,
        COALESCE(SUM(CASE WHEN a.tipo = 'resgate'   THEN a.valor ELSE 0 END), 0) AS total_resgatado,
        COALESCE(SUM(CASE WHEN a.tipo = 'rendimento' THEN a.valor ELSE 0 END), 0) AS total_rendimentos,
        COUNT(a.id) AS qtd_movimentacoes
      FROM privado.investimentos_renda_fixa r
      LEFT JOIN privado.investimentos_renda_fixa_aportes a ON a.renda_fixa_id = r.id
      WHERE r.ativo = TRUE
      GROUP BY r.id
      ORDER BY r.nome
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar renda fixa" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, instituicao, tipo, rentabilidade, data_vencimento } = body;
    if (!nome || !tipo) return NextResponse.json({ error: "nome e tipo são obrigatórios" }, { status: 400 });

    const [row] = await query<{ id: number }>(`
      INSERT INTO privado.investimentos_renda_fixa
        (nome, instituicao, tipo, rentabilidade, data_vencimento)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [nome, instituicao || null, tipo, rentabilidade || null, data_vencimento || null]);

    return NextResponse.json({ id: row.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao cadastrar renda fixa" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    // Atualizar valor atual
    if (body.valor_atual !== undefined) {
      await query(`
        UPDATE privado.investimentos_renda_fixa
        SET valor_atual = $1, atualizado_em = NOW()
        WHERE id = $2
      `, [body.valor_atual, id]);
      return NextResponse.json({ ok: true });
    }

    // Atualizar dados cadastrais
    const { nome, instituicao, tipo, rentabilidade, data_vencimento } = body;
    await query(`
      UPDATE privado.investimentos_renda_fixa
      SET nome = $1, instituicao = $2, tipo = $3, rentabilidade = $4, data_vencimento = $5
      WHERE id = $6
    `, [nome, instituicao || null, tipo, rentabilidade || null, data_vencimento || null, id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await query(`UPDATE privado.investimentos_renda_fixa SET ativo = FALSE WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
  }
}