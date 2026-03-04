import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { conta_id, saldo_real, saldo_calculado, nome_conta } = await req.json();

  const diferenca = parseFloat(saldo_real) - parseFloat(saldo_calculado);

  if (Math.abs(diferenca) < 0.01) {
    return NextResponse.json({ ok: true, mensagem: "Saldo já está correto" });
  }

  try {
    if (diferenca > 0) {
      // Entrada genérica (rendimento, depósito não registrado, etc.)
      await query(
        `INSERT INTO privado.entradas
          (descricao, valor, data_recebimento, conta_id, observacao)
         VALUES ($1, $2, CURRENT_DATE, $3, $4)`,
        [
          `Ajuste de saldo — ${nome_conta}`,
          Math.abs(diferenca),
          conta_id,
          `Ajuste automático: saldo informado R$ ${parseFloat(saldo_real).toFixed(2)}, calculado R$ ${parseFloat(saldo_calculado).toFixed(2)}`,
        ]
      );
    } else {
      // Saída genérica (despesa não registrada, tarifa, etc.)
      await query(
        `INSERT INTO privado.transacoes
          (tipo, descricao, valor, data_pagamento, data_vencimento, conta_id, observacao)
         VALUES ('despesa', $1, $2, CURRENT_DATE, CURRENT_DATE, $3, $4)`,
        [
          `Ajuste de saldo — ${nome_conta}`,
          Math.abs(diferenca),
          conta_id,
          `Ajuste automático: saldo informado R$ ${parseFloat(saldo_real).toFixed(2)}, calculado R$ ${parseFloat(saldo_calculado).toFixed(2)}`,
        ]
      );
    }

    return NextResponse.json({ ok: true, diferenca, tipo: diferenca > 0 ? "entrada" : "saida" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao ajustar saldo" }, { status: 500 });
  }
}