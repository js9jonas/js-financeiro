---
name: schema-privado-financeiro
description: "Schema privado do js-financeiro — tabelas, lógica de saldo e quirks importantes"
type: reference
---

Schema `privado` no banco `js` — usado exclusivamente pelo js-financeiro.

**How to apply:** Ao escrever queries ou modificar dados do js-financeiro, verificar estes padrões antes.

## Tabelas principais

- `privado.contas` — sem campo `saldo` direto; tem `saldo_inicial` e `fluxo_caixa` (boolean)
- `privado.transacoes` — tipo: `despesa`, `transferencia`; campos: `conta_id`, `conta_destino_id`, `data_pagamento`, `data_vencimento`, `valor`
- `privado.entradas` — receitas; campo `data_recebimento`
- `privado.categorias`, `privado.cartoes`, `privado.faturas`, `privado.recorrentes`

## Lógica de saldo — `v_saldo_contas`

Saldo é **calculado dinamicamente** pela view, não armazenado:

```
saldo_atual = saldo_inicial + movimentacao
```

- `movimentacao` soma: entradas + pagamentos IPTV (schema public) + transações (despesas e transferências) a partir de `2026-02-28`
- Transferência **debita** da `conta_id` e **credita** na `conta_destino_id`

**Consequência:** deletar uma transação reverte o saldo automaticamente — não é necessário nenhum ajuste manual adicional.

## Quirk: `fluxo_caixa = false`

Contas com `fluxo_caixa = false` (ex: Mercado Pago, id=10) sempre exibem `saldo_atual = saldo_inicial`, independente de movimentações. Transferências para essas contas não aparecem no saldo exibido.

## Lógica de pendentes — recorrentes

- `privado.recorrentes` tem `data_vencimento` nullable
- **Regra de negócio:** recorrentes sem `data_vencimento` **não entram** no total pendente do mês
- O dashboard é a referência correta: query SQL com `DATE_TRUNC('month', r.data_vencimento) = DATE_TRUNC('month', CURRENT_DATE)` — exclui NULLs naturalmente
- A página `/pagamentos` foi corrigida para seguir esta regra (antes incluía itens sem vencimento no mês atual)

## Transferências

- `tipo = 'transferencia'`
- `conta_id` = origem, `conta_destino_id` = destino
- `data_vencimento` geralmente nula; somente `data_pagamento` preenchida
- Padrão dominante: INTER → Nubank, Nu PJ → Nubank

## `privado.recorrentes` também tem `tipo`/`conta_destino_id` (migração 15/09/2026)

Mesma lógica de `transacoes`: `tipo` (`despesa`|`transferencia`, default `despesa`, CHECK) e `conta_destino_id` (nullable, FK `contas`). Motivo: "Fundo MP", "Carro" e "Carteiras de Investimento" eram lançados como despesa só pra aparecer em `/pagamentos` como lembrete/comprometimento, mas na prática é dinheiro migrando pra outra conta/investimento — isso inflava "custo do mês" no dashboard e no histórico (que filtram `tipo='despesa'`). Ver `sql/001_recorrentes_tipo_transferencia.sql` pra migração completa e `project_lancamentos_financeiro.md` pro detalhe de cada caso.

**Conta placeholder criada:** `PagBank` (id novo, `fluxo_caixa=false`, mesmo padrão do `Mercado Pago`) — só existe pra ser destino de transferência, não representa saldo de fluxo de caixa real.

**Pontos que ainda dependem de ação manual do Jonas** (não dá pra automatizar sem mais contexto): quando marcar "Fundo MP"/"Carro" como pago em `/pagamentos`, ainda é ele quem lança o aporte correspondente em `/investimentos` (renda fixa) — os dois registros (transferência em `transacoes` + aporte em `investimentos_renda_fixa_aportes`) não estão linkados um ao outro. Mesma coisa pra "Carteiras de Investimento" → compras em `investimentos_compras`. Se um dia quiser reduzir o lançamento duplo, dá pra adicionar um campo de link (`transacao_id`) nas tabelas de aporte/compra.

## Quirk: lançamento manual em `/lancamento` nunca preenche `recorrente_id` (15/09/2026)

Jonas lança boa parte das despesas recorrentes manualmente em `/lancamento` em vez de clicar "Pagar" em `/pagamentos` (ex: IPTU, Terreno, Prestação Habitacional têm anos de histórico assim). O endpoint `POST /api/transacoes` (usado por `/lancamento`) nunca seta `recorrente_id` — só quem seta é o fluxo `pagar`/`gerar` de `/pagamentos`.

**Consequência que já causou confusão:** qualquer código que verifica "esse recorrente já foi pago esse mês?" ou "quando foi a última vez que paguei isso?" só olhando `t.recorrente_id = r.id` **erra silenciosamente** pra tudo que foi lançado manualmente — mostra sempre "Pendente" mesmo já pago, ou não mostra histórico nenhum, mesmo com anos de dado real no banco (caso do IPTU).

**Fallback padrão adotado:** em todo lugar que faz esse tipo de verificação, usar `(t.recorrente_id = r.id OR (t.recorrente_id IS NULL AND t.descricao = r.descricao))` em vez de só `t.recorrente_id = r.id`. Aplicado em:
- `GET /api/pagamentos` (status do mês + "Ult. há X dias" na coluna Vencimento)
- `POST /api/pagamentos/[id]/pagar` (checagem de duplicata no mês)
- `GET /api/dashboard` (`total_pago_mes` — removida a restrição `recorrente_id IS NOT NULL`; `total_pendente_30dias` — fallback por descrição)
- `GET /api/projecao` (`pendenteMesRow` — fallback por descrição; `pagoMesRow` já estava correto, sem restrição)

**How to apply:** se criar uma nova query que precise cruzar `recorrentes` com `transacoes` pra saber status de pagamento, sempre usar esse fallback — não assumir que `recorrente_id` está preenchido.

## "Total do mês" em `/pagamentos` inclui transferências, por design

O card soma `totalPago + totalPendente` sobre **todos os recorrentes ativos**, sem filtrar por `tipo` — então Fundo MP/Carro/Carteiras de Investimento (tipo `transferencia`) entram normalmente. Já `/historico` e `/api/dashboard` (`total_pago_mes`) filtram `tipo = 'despesa'`, então não contam. **Não é bug** — são duas perguntas diferentes: "Total do mês" em `/pagamentos` = quanto vai passar pelas contas esse mês (pago + a pagar, incluindo comprometimentos de transferência); `/historico` = quanto foi gasto de verdade. Se o card algum dia parecer "alto demais" comparado ao histórico, a diferença tende a ser exatamente a soma das transferências do mês.
