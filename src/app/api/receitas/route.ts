import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Últimos 12 meses de recebimentos IPTV
    const receitas = await query<{ mes: string; total: string; quantidade: string }>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', data_pgto), 'YYYY-MM') AS mes,
        SUM(valor) AS total,
        COUNT(*) AS quantidade
      FROM public.pagamentos
      WHERE data_pgto IS NOT NULL
        AND valor > 0
        AND data_pgto >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND data_pgto <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY 1
      ORDER BY 1
    `);

    // Média dos últimos 3 meses para projeção do mês atual
    const [media] = await query<{ media: string }>(`
      SELECT AVG(total) AS media FROM (
        SELECT SUM(valor) AS total
        FROM public.pagamentos
        WHERE data_pgto IS NOT NULL
          AND valor > 0
          AND data_pgto >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
          AND data_pgto <  DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY DATE_TRUNC('month', data_pgto)
      ) sub
    `);

    return NextResponse.json({ receitas, projecao: Number(media?.media ?? 0) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar receitas" }, { status: 500 });
  }
}