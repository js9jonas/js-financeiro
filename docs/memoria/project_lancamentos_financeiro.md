---
name: project-lancamentos-financeiro
description: "Padrões de lançamento no js-financeiro — categorias, descrições e campos usados historicamente"
type: project
---

## Vestuário / Calçados

Compras de roupas, calçados e acessórios sempre entram com:

```sql
INSERT INTO privado.transacoes (tipo, tipo_despesa, descricao, observacao, valor, data_pagamento, data_vencimento, conta_id)
VALUES ('despesa', 'eventual', 'Vestuário', '<detalhe específico>', <valor>, '<YYYY-MM-DD>', '<YYYY-MM-DD>', 2)
```

| Campo | Valor padrão |
|---|---|
| tipo | `despesa` |
| tipo_despesa | `eventual` |
| descricao | `Vestuário` |
| observacao | detalhe do que foi comprado (ex: "Calçados Nike") |
| conta_id | 2 (Nubank) — ou 3 (Sicredi) conforme pagamento |
| fatura_id | null (débito direto, não fatura de cartão) |
| categoria_id | null |

**Why:** Jonas usa "Vestuário" como descrição genérica para tudo relacionado a roupas/calçados. O campo `observacao` é onde ele detalha o item específico — ele preenche isso manualmente pela página de histórico do js-financeiro quando necessário.

**How to apply:** Ao lançar qualquer compra de roupa, calçado ou acessório, usar exatamente esse padrão. Perguntar o valor e a conta antes de inserir. Incluir `observacao` com o detalhe do item para evitar que o usuário precise ajustar manualmente depois.

---

## Manutenção Veículo

Lavagem, troca de óleo, peças, pneus e qualquer serviço no carro entram com:

```sql
INSERT INTO privado.transacoes (tipo, tipo_despesa, descricao, observacao, valor, data_pagamento, data_vencimento, conta_id)
VALUES ('despesa', 'veiculo', 'Manutenção veículo', '<detalhe do serviço>', <valor>, '<YYYY-MM-DD>', '<YYYY-MM-DD>', 2)
```

| Campo | Valor padrão |
|---|---|
| tipo | `despesa` |
| tipo_despesa | `veiculo` |
| descricao | `Manutenção veículo` |
| observacao | detalhe do serviço (ex: "Lavagem do carro", "Troca de óleo", "Troca pneus") |
| conta_id | 2 (Nubank) — padrão; ajustar se outra conta |

**How to apply:** Perguntar valor, conta e o que foi feito. Usar sempre `observacao` com o detalhe — evita que o usuário ajuste manualmente depois.

---

## Manutenção Casa

Consertos, reparos e compras relacionadas à casa ou itens domésticos (incluindo bicicletas dos filhos) entram com:

```sql
INSERT INTO privado.transacoes (tipo, tipo_despesa, descricao, observacao, valor, data_pagamento, data_vencimento, conta_id)
VALUES ('despesa', 'eventual', 'Manutenção casa', '<detalhe do serviço>', <valor>, '<YYYY-MM-DD>', '<YYYY-MM-DD>', 2)
```

| Campo | Valor padrão |
|---|---|
| tipo | `despesa` |
| tipo_despesa | `eventual` |
| descricao | `Manutenção casa` |
| observacao | detalhe do serviço (ex: "Conserto da bicicleta da Alice", "Conserto da bicicleta do Luis") |
| conta_id | 2 (Nubank) — padrão; ajustar se outra conta |

**How to apply:** Perguntar valor, conta e o que foi feito. Sempre incluir o detalhe em `observacao`.

---

## Taxonomia de `tipo_despesa` — confirmada com Jonas (15/09/2026)

Levantado durante um diagnóstico financeiro completo (relatório salvo na memória global, `pessoal/project_diagnostico_financeiro_pessoal.md`). `categoria_id` nunca é usado na prática (sempre NULL em `privado.transacoes`) — toda categorização real hoje é via `tipo_despesa` + `descricao` livre, sem convenção 100% consistente.

| `tipo_despesa` | Significado | Natureza |
|---|---|---|
| `ct` | **Custos de trabalho** — confirmado por Jonas. Despesas do negócio (Das JS, INSS pró-labore, Hostinger, Escritório, salário Alana, Certificado digital, Bitwarden, Cent3r) | negócio |
| `insumo` | Fornecedores/painéis IPTV (Uniplay, Central, Club, Fun Play, Unitv, FAST, NOW, Natv, licenças) — custo de mercadoria/serviço vendido | negócio |
| `essencial` | Custo de vida fixo pessoal (moradia, contas domésticas, inclui a "Prestação Habitacional") | pessoal, fixo |
| `mensal` | Custo de vida fixo pessoal, recorrência menor (taxas/seguros pontuais) | pessoal, fixo |
| `eventual` | Custo de vida variável/discricionário (nome já indica "ocasional") | pessoal, variável |
| `veiculo` | Manutenção/seguro/fundo do carro — maioria variável, seguro é a parte fixa | pessoal, variável (maioria) |
| `saude` | Consultas, dentista — recorrente mas valor irregular | pessoal, variável |
| `investimento` | **Mistura** o pagamento do terreno (financiamento) com aportes pessoais (ações/FIIs/cripto/fundo MP) — não dá pra separar sem filtrar por `descricao` manualmente (ex: `descricao = 'Terreno'`) | negócio (terreno) + pessoal (aportes) |

**Pendência que Jonas sinalizou:** os lançamentos foram feitos "de improviso, sem nexo definido" — quer reorganizar a categorização com mais calma. Candidatos a decisão futura: (1) separar terreno dos aportes pessoais dentro de `investimento` com uma sub-categoria ou `categoria_id`; (2) decidir se vale começar a popular `categoria_id` (existe a tabela `privado.categorias` com Moradia/Alimentação/Saúde/Transporte/Assinaturas/Investimentos/Impostos-Taxas/Pessoal/IPTV JS/Pró-labore/Outros, mas nunca foi usada); (3) a "Fatura RecargaPay" é lançada como valor único de fatura de cartão, misturando essencial+discricionário sem detalhamento — avaliar se vale abrir por item.

**How to apply:** ao criar um relatório ou análise que dependa de "custo de vida" vs "custo de negócio", usar esta tabela como referência de mapeamento — não confiar em `categoria_id`.

---

## Fundo MP / Carro / Carteiras de Investimento — corrigido pra `tipo='transferencia'` (15/09/2026)

Esses 3 recorrentes eram lançados como `despesa` só pra aparecer em `/pagamentos` como lembrete/comprometimento mensal, mas o dinheiro não é gasto — vai pra outra conta/investimento do próprio Jonas:

| Recorrente | Origem | Destino real | `conta_destino_id` |
|---|---|---|---|
| Fundo MP (id 29) | INTER | Mercado Pago (Cofrinho MP / Saldo MP, renda fixa) | 10 (Mercado Pago) |
| Carro (id 30) | INTER | PagBank (Fundo Veículo, renda fixa) | conta nova "PagBank" (fluxo_caixa=false) |
| Carteiras de Investimento (id 28) | Nubank | Fragmenta em várias compras de ações/FIIs em `investimentos_compras` | nenhum (não mapeia pra uma conta única) |

Migrado em `sql/001_recorrentes_tipo_transferencia.sql`: `privado.recorrentes` ganhou `tipo`/`conta_destino_id` (mesmo padrão de `transacoes`), os 3 recorrentes e todo o histórico correspondente em `transacoes` foram reclassificados pra `tipo='transferencia'`, `tipo_despesa=NULL`. Telas `/recorrentes` e `/pagamentos` ganharam campo "Natureza" (Despesa/Transferência) + "Conta destino" condicional.

**Efeito colateral esperado (bom):** dashboard (`total_pago_mes`) e `/historico` filtram `tipo='despesa'` — esses 3 itens não vão mais aparecer ali nem inflar "custo do mês", mas continuam aparecendo normalmente em `/pagamentos` (que não filtra por tipo) como lembrete.

**Ainda manual, não linkado:** quando marcar como pago, o aporte/compra correspondente em `/investimentos` continua sendo lançado à parte por Jonas — os dois registros não têm uma FK entre si hoje.

## Pendência maior — Fatura RecargaPay (detalhamento via Playwright)

Jonas quer, no futuro, importar o extrato detalhado da fatura RecargaPay (Playwright fazendo login + baixando as faturas dos últimos 12 meses) pra ter um raio-X de categorias de gasto. **Não fazer isso lançando item por item em `/lancamento`** — duplicaria o valor, já que a fatura em si já é uma linha única em `transacoes`. Recomendação já discutida com Jonas (15/09/2026): criar uma tabela nova só de análise (ex. `privado.fatura_itens`), desacoplada do fluxo de caixa, apontando pra `transacoes.id` da fatura lançada — nunca entra em `v_saldo_contas` nem nos cálculos de custo/lucro. As tabelas `privado.cartoes`/`privado.faturas` já existem no schema mas estão com 0 linhas e não servem pra isso (são só cabeçalho, sem valor nem itens) — não reaproveitar sem repensar. Ainda não implementado — avaliar quando Jonas retomar o assunto.
