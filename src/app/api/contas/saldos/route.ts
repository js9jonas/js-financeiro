import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const rows = await query(`
      SELECT * FROM privado.v_saldo_contas
      ORDER BY fluxo_caixa DESC, CASE id WHEN 1 THEN 1 WHEN 5 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 11 THEN 6 ELSE 99 END
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar contas" }, { status: 500 });
  }
}