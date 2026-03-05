import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const rows = await query(`
      SELECT * FROM privado.v_saldo_contas
      ORDER BY fluxo_caixa DESC, nome
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar contas" }, { status: 500 });
  }
}