# js-financeiro

Painel financeiro pessoal. Controla contas, despesas recorrentes, entradas, investimentos e projeção de saldo. Integra receitas do IPTV (via `public.pagamentos`) no dashboard.

## Stack

- Next.js 16 · React 18 · TypeScript · Tailwind CSS 3
- PostgreSQL via `pg` direto (`src/lib/db.ts`) — sem ORM
- date-fns · recharts · lucide-react
- Sem Anthropic/IA neste projeto

## Comandos

```bash
npm run dev      # porta 3001
npm run build
npm run lint
```

## Banco de dados

Schema `privado.*` — dados financeiros pessoais (sensível).  
Schema `public.*` — leitura de `public.pagamentos` (receitas IPTV no dashboard).

### Tabelas gerais

- `privado.v_saldo_contas` — view: saldo atual por conta
- `privado.contas` — contas bancárias/carteiras (tipo: corrente|poupanca|carteira|investimento|cripto|outro)
- `privado.transacoes` — despesas e transferências (tipo_despesa: ct|essencial|eventual|insumo|investimento|veiculo|saude|mensal)
- `privado.recorrentes` — despesas recorrentes fixas com `data_vencimento`
- `privado.entradas` — receitas manuais
- `privado.categorias` — categorias de transação

## Módulo de investimentos

### Tabelas

| Tabela | Conteúdo |
|---|---|
| `privado.investimentos_ativos` | Cadastro de ativos: `ticker, nome, tipo, moeda, coingecko_id, ativo` |
| `privado.investimentos_compras` | Histórico de compras: `ativo_id, data_compra, quantidade, preco_unitario, taxas, corretora, observacao` |
| `privado.investimentos_precos` | Preço atual (upsert por `ativo_id`): `preco_atual, variacao_dia, atualizado_em` |
| `privado.investimentos_dividendos` | Proventos recebidos: `ativo_id, data_pagamento, valor, quantidade_na_data, tipo, observacao` |
| `privado.investimentos_renda_fixa` | Cadastro de renda fixa: `nome, instituicao, tipo, rentabilidade, data_vencimento, valor_atual, ativo` |
| `privado.investimentos_renda_fixa_aportes` | Movimentações de renda fixa: `renda_fixa_id, data_aporte, valor, tipo` |

### Tipos de ativo (`tipo`)

`acao | fii | etf | crypto | renda_fixa`

### Cálculos importantes (feitos em query, não armazenados)

- **Preço médio** = `SUM(quantidade * preco_unitario + taxas) / SUM(quantidade)`
- **Custo total** = `SUM(quantidade * preco_unitario + taxas)`
- **Yield sobre custo** = `total_dividendos / custo_total * 100`
- **Resultado** = `(preco_atual * quantidade_total) - custo_total`

### Cotações externas

**B3 (ação, fii, etf):** `brapi.dev/api/quote/{ticker}?token={BRAPI_TOKEN}`  
→ 300ms de pausa entre requisições para não sobrecarregar  
→ `POST /api/investimentos/precos` atualiza todos os ativos ativos de uma vez

**Crypto:** `api.coingecko.com/api/v3/simple/price?ids={coingecko_id}&vs_currencies=brl&include_24hr_change=true`  
→ `coingecko_id` fica em `investimentos_ativos.coingecko_id`

**Renda fixa:** atualização manual via `PATCH /api/investimentos/renda-fixa?id=X` com `{valor_atual}`

### Movimentações de renda fixa (`tipo`)

`aporte | resgate | rendimento | transferencia_entrada | transferencia_saida`  
→ Saldo calculado: `total_aportado - total_resgatado + total_rendimentos`

### Dividendos (`tipo`)

`dividendo | jcp` (e outros livres)  
→ `dividendos_12m` calculado filtrando `data_pagamento >= CURRENT_DATE - INTERVAL '12 months'`

### Rotas da API de investimentos

```
GET/POST        /api/investimentos/ativos              lista/cadastra ativo
POST            /api/investimentos/precos              atualiza cotações B3+crypto via APIs externas
PATCH           /api/investimentos/precos              atualiza preço manual de um ativo
GET/POST/DELETE /api/investimentos/compras             histórico de compras por ativo
GET/POST/PATCH/DELETE /api/investimentos/dividendos    proventos
GET/POST/PATCH/DELETE /api/investimentos/renda-fixa    cadastro de renda fixa
GET/POST/DELETE /api/investimentos/renda-fixa-aportes  movimentações de renda fixa
```

## Tipos TypeScript do domínio

`src/types/financeiro.ts` — consultar antes de criar interfaces novas. Contém: `Conta`, `ContaComSaldo`, `Transacao`, `Entrada`, `Categoria`, `DashboardData`, `NovaTransacao`, `TIPO_DESPESA_LABEL`, `TIPO_DESPESA_COR`.

## Estrutura das páginas

- `/dashboard` — KPIs: saldo total, pendente mês, pago mês, receitas, projeção
- `/lancamento` — nova transação/entrada
- `/pagamentos` — recorrentes com status de pagamento do mês
- `/recorrentes` — gestão de despesas recorrentes
- `/contas` — saldos por conta
- `/historico` — histórico de transações
- `/investimentos` — carteira completa: renda variável, crypto, renda fixa, dividendos

## Variáveis de ambiente necessárias

```
# Banco
DATABASE_URL                # postgresql://user:pass@host:5432/db

# Autenticação — next-auth v5
AUTH_SECRET                 # openssl rand -hex 32
AUTH_TRUST_HOST=true        # obrigatório atrás de proxy reverso (Easypanel/Nginx)
NEXTAUTH_URL                # https://financeiro.jssistemas.online
GOOGLE_CLIENT_ID            # Google OAuth — console.cloud.google.com
GOOGLE_CLIENT_SECRET        # Google OAuth

# Investimentos
BRAPI_TOKEN                 # cotações B3 — brapi.dev
```

### Tabela de usuários

A autenticação valida e-mail contra `public.users` (schema `public`, banco `js`):

```sql
CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role  TEXT NOT NULL DEFAULT 'basico'  -- 'admin' | 'basico'
);
```

Apenas e-mails cadastrados nessa tabela conseguem fazer login.
