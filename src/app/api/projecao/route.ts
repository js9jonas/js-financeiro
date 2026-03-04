import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const base = parseInt(searchParams.get("base") ?? "3"); // meses históricos

  try {
    // Saldo atual das contas de fluxo de caixa
    const [saldoRow] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(saldo_atual), 0) AS total
      FROM privado.v_saldo_contas
      WHERE fluxo_caixa = TRUE
    `);

    // Receita real acumulada no mês atual até hoje
    const [receitaRealRow] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM public.pagamentos
      WHERE data_pgto IS NOT NULL
        AND valor > 0
        AND DATE_TRUNC('month', data_pgto) = DATE_TRUNC('month', CURRENT_DATE)
        AND data_pgto <= CURRENT_DATE
    `);

    // Receita real de hoje
    const [receitaHojeRow] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM public.pagamentos
      WHERE data_pgto = CURRENT_DATE AND valor > 0
    `);

    // Para cada dia restante do mês (> hoje), calcular a média histórica daquele dia
    // Busca todos os dias restantes com sua média nos últimos N meses
    const diasRestantesRows = await query<{ dia: string; media_dia: string }>(`
      WITH dias_restantes AS (
        SELECT generate_series(
          CURRENT_DATE + 1,
          DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
          INTERVAL '1 day'
        )::DATE AS dia
      ),
      historico AS (
        SELECT
          EXTRACT(DAY FROM data_pgto)::INT AS dia_num,
          DATE_TRUNC('month', data_pgto) AS mes,
          SUM(valor) AS total_dia
        FROM public.pagamentos
        WHERE data_pgto IS NOT NULL
          AND valor > 0
          AND data_pgto >= DATE_TRUNC('month', CURRENT_DATE) - ($1 || ' months')::INTERVAL
          AND data_pgto <  DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY 1, 2
      ),
      media_por_dia AS (
        SELECT dia_num, AVG(total_dia) AS media_dia
        FROM historico
        GROUP BY dia_num
      )
      SELECT
        d.dia,
        COALESCE(m.media_dia, 0) AS media_dia
      FROM dias_restantes d
      LEFT JOIN media_por_dia m ON m.dia_num = EXTRACT(DAY FROM d.dia)::INT
      ORDER BY d.dia
    `, [base]);

    // Média do dia de hoje no histórico (para comparativo)
    const [mediaDiaHojeRow] = await query<{ media: string }>(`
      SELECT COALESCE(AVG(total_dia), 0) AS media FROM (
        SELECT SUM(valor) AS total_dia
        FROM public.pagamentos
        WHERE data_pgto IS NOT NULL
          AND valor > 0
          AND EXTRACT(DAY FROM data_pgto) = EXTRACT(DAY FROM CURRENT_DATE)
          AND data_pgto >= DATE_TRUNC('month', CURRENT_DATE) - ($1 || ' months')::INTERVAL
          AND data_pgto <  DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY DATE_TRUNC('month', data_pgto)
      ) sub
    `, [base]);

    // Pendências do mês atual
    const [pendenteMesRow] = await query<{ total: string }>(`
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM privado.transacoes
      WHERE tipo = 'despesa'
        AND data_pagamento IS NULL
        AND DATE_TRUNC('month', data_vencimento) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Dias do mês
    const [diasRow] = await query<{ dias_mes: string; dias_passados: string; dias_restantes: string }>(`
      SELECT
        EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')) AS dias_mes,
        EXTRACT(DAY FROM CURRENT_DATE) AS dias_passados,
        EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))
          - EXTRACT(DAY FROM CURRENT_DATE) AS dias_restantes
    `);

    const saldoAtual      = Number(saldoRow?.total ?? 0);
    const receitaReal     = Number(receitaRealRow?.total ?? 0);
    const receitaHoje     = Number(receitaHojeRow?.total ?? 0);
    const mediaDiaHoje    = Number(mediaDiaHojeRow?.media ?? 0);
    const pendenteMes     = Number(pendenteMesRow?.total ?? 0);
    const diasMes         = Number(diasRow?.dias_mes ?? 30);
    const diasPassados    = Number(diasRow?.dias_passados ?? 1);
    const diasRestantes   = Number(diasRow?.dias_restantes ?? 0);

    // Soma das médias históricas por dia restante
    const projecaoDiaria = diasRestantesRows.map(r => ({
      dia: r.dia,
      media: Number(r.media_dia),
    }));
    const totalProjetadoRestante = projecaoDiaria.reduce((acc, d) => acc + d.media, 0);

    // Receita total projetada do mês = real até hoje + soma das médias dos dias restantes
    const receitaProjetadaMes = receitaReal + totalProjetadoRestante;

    // Projeção de saldo = saldo atual + receita projetada - pendente mês
    const projecao = saldoAtual + receitaProjetadaMes - pendenteMes;

    // Comparativo do dia: hoje vs média histórica do mesmo dia
    const variacaoDia    = receitaHoje - mediaDiaHoje;
    const variacaoDiaPct = mediaDiaHoje > 0 ? (variacaoDia / mediaDiaHoje) * 100 : 0;

    return NextResponse.json({
      saldoAtual,
      receitaReal,
      receitaHoje,
      mediaDiaHoje,
      receitaProjetadaMes,
      totalProjetadoRestante,
      projecaoDiaria,
      diasMes: Math.round(diasMes),
      diasPassados: Math.round(diasPassados),
      diasRestantes: Math.round(diasRestantes),
      pendenteMes,
      projecao,
      variacaoDia,
      variacaoDiaPct,
      base,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao calcular projeção" }, { status: 500 });
  }
}