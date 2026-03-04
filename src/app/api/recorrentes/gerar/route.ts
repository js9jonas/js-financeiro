import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { mes, ano } = await req.json();

  try {
    // Verifica se já foi gerado
    const jaGerado = await query(
      `SELECT id FROM privado.recorrentes_gerados WHERE mes = $1 AND ano = $2`,
      [mes, ano]
    );

    if (jaGerado.length > 0) {
      return NextResponse.json({ ok: true, jaGerado: true, quantidade: 0 });
    }

    // Busca recorrentes ativos
    const recorrentes = await query(`
      SELECT * FROM privado.recorrentes WHERE ativo = TRUE
    `);

    if (recorrentes.length === 0) {
      return NextResponse.json({ ok: true, jaGerado: false, quantidade: 0 });
    }

    // Gera transações — ajusta dia se mês não tiver aquele dia (ex: dia 31 em fevereiro)
    let gerados = 0;
    for (const r of recorrentes as any[]) {
      const ultimoDia = new Date(ano, mes, 0).getDate(); // último dia do mês
      const dia = Math.min(r.dia_vencimento, ultimoDia);
      const dataVenc = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

      await query(`
        INSERT INTO privado.transacoes
          (tipo, descricao, tipo_despesa, valor, data_vencimento, conta_id, observacao, recorrente_id)
        VALUES ('despesa', $1, $2, $3, $4, $5, $6, $7)
      `, [
        r.descricao,
        r.tipo_despesa,
        r.valor_padrao,
        dataVenc,
        r.conta_id,
        r.observacao,
        r.id,
      ]);
      gerados++;
    }

    // Registra geração
    await query(
      `INSERT INTO privado.recorrentes_gerados (mes, ano, quantidade) VALUES ($1, $2, $3)`,
      [mes, ano, gerados]
    );

    return NextResponse.json({ ok: true, jaGerado: false, quantidade: gerados });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao gerar recorrentes" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");

  const rows = await query(
    `SELECT * FROM privado.recorrentes_gerados WHERE mes = $1 AND ano = $2`,
    [mes, ano]
  );
  return NextResponse.json({ gerado: rows.length > 0, dados: rows[0] ?? null });
}