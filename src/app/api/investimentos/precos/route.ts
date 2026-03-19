import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

async function buscarPrecoB3(tickers: string[]): Promise<Record<string, { preco: number; variacao: number }>> {
  if (!tickers.length) return {};
  const resultado: Record<string, { preco: number; variacao: number }> = {};
  
  for (const ticker of tickers) {
    try {
      const res = await fetch(
        `https://brapi.dev/api/quote/${ticker}?token=${process.env.BRAPI_TOKEN}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.results?.[0]) {
        const item = data.results[0];
        resultado[item.symbol] = {
          preco: item.regularMarketPrice,
          variacao: item.regularMarketChangePercent,
        };
      }
      // Pequena pausa para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`Erro brapi ${ticker}:`, e);
    }
  }
  
  return resultado;
}
async function buscarPrecoCrypto(ids: { ticker: string; coingecko_id: string }[]): Promise<Record<string, { preco: number; variacao: number }>> {
  if (!ids.length) return {};
  try {
    const idList = ids.map(i => i.coingecko_id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idList}&vs_currencies=brl&include_24hr_change=true`,
      { cache: "no-store" }
    );
    const data = await res.json();
    const resultado: Record<string, { preco: number; variacao: number }> = {};
    for (const item of ids) {
      const d = data[item.coingecko_id];
      if (d) {
        resultado[item.ticker] = {
          preco: d.brl,
          variacao: d.brl_24h_change,
        };
      }
    }
    return resultado;
  } catch (e) {
    console.error("Erro coingecko:", e);
    return {};
  }
}

export async function POST() {
  try {
    const ativos = await query<{
      id: number; ticker: string; tipo: string; coingecko_id: string | null;
    }>(`SELECT id, ticker, tipo, coingecko_id FROM privado.investimentos_ativos WHERE ativo = TRUE`);

    const b3Tickers = ativos
      .filter(a => ["acao", "fii", "etf"].includes(a.tipo))
      .map(a => a.ticker);

    const cryptoAtivos = ativos
      .filter(a => a.tipo === "crypto" && a.coingecko_id)
      .map(a => ({ ticker: a.ticker, coingecko_id: a.coingecko_id! }));

    console.log("Tickers B3:", b3Tickers);
    console.log("Token:", process.env.BRAPI_TOKEN?.slice(0, 5));

    const [precosB3, precosCrypto] = await Promise.all([
      buscarPrecoB3(b3Tickers),
      buscarPrecoCrypto(cryptoAtivos),
    ]);

    const todosPrecos = { ...precosB3, ...precosCrypto };
    console.log("Preços encontrados:", Object.keys(todosPrecos));
    let atualizados = 0;

    for (const ativo of ativos) {
      const preco = todosPrecos[ativo.ticker];
      if (!preco) continue;

      await query(`
        INSERT INTO privado.investimentos_precos (ativo_id, preco_atual, variacao_dia, atualizado_em)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (ativo_id) DO UPDATE
          SET preco_atual = EXCLUDED.preco_atual,
              variacao_dia = EXCLUDED.variacao_dia,
              atualizado_em = NOW()
      `, [ativo.id, preco.preco, preco.variacao]);
      atualizados++;
    }

    return NextResponse.json({ atualizados, total: ativos.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar preços" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { ativo_id, preco_atual } = await req.json();
    await query(`
      INSERT INTO privado.investimentos_precos (ativo_id, preco_atual, variacao_dia, atualizado_em)
      VALUES ($1, $2, 0, NOW())
      ON CONFLICT (ativo_id) DO UPDATE
        SET preco_atual = EXCLUDED.preco_atual, atualizado_em = NOW()
    `, [ativo_id, preco_atual]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar preço manual" }, { status: 500 });
  }
}