-- Migração: distinguir recorrentes que são "despesa" de recorrentes que são
-- "transferência" (dinheiro que só muda de conta/investimento, não é gasto real).
-- Contexto: "Fundo MP", "Carro" e "Carteiras de Investimento" eram lançados como
-- despesa (tipo_despesa='investimento'/'veiculo') só pra aparecer como
-- comprometimento em /pagamentos, mas na prática o dinheiro vai pra outra conta
-- (Mercado Pago / PagBank) ou vira compra de ativo já registrada em /investimentos.
-- Isso inflava "custo do mês" no dashboard/histórico. Ver conversa 15/09/2026.

-- 1. Estende privado.recorrentes com o mesmo conceito que privado.transacoes já tem
ALTER TABLE privado.recorrentes
  ADD COLUMN tipo character varying NOT NULL DEFAULT 'despesa'
    CHECK (tipo IN ('despesa', 'transferencia')),
  ADD COLUMN conta_destino_id integer REFERENCES privado.contas(id);

-- 2. Placeholder de conta pro PagBank, mesmo padrão do "Mercado Pago" (fluxo_caixa=false,
--    só existe pra registrar destino de transferência, não entra em saldo de fluxo de caixa)
INSERT INTO privado.contas (nome, tipo, fluxo_caixa, saldo_inicial)
VALUES ('PagBank', 'investimento', false, 0);
-- id gerado: conferir com SELECT id FROM privado.contas WHERE nome = 'PagBank'

-- 3. Reclassifica os 3 recorrentes identificados
UPDATE privado.recorrentes
  SET tipo = 'transferencia', conta_destino_id = 10, tipo_despesa = NULL
  WHERE id = 29; -- Fundo MP -> Mercado Pago (conta id 10)

UPDATE privado.recorrentes
  SET tipo = 'transferencia', conta_destino_id = (SELECT id FROM privado.contas WHERE nome = 'PagBank'), tipo_despesa = NULL
  WHERE id = 30; -- Carro -> PagBank (Fundo Veículo)

UPDATE privado.recorrentes
  SET tipo = 'transferencia', conta_destino_id = NULL, tipo_despesa = NULL
  WHERE id = 28; -- Carteiras de Investimento -> fragmenta em várias compras (ações/FIIs), sem conta única

-- 4. Corrige o histórico já lançado em privado.transacoes (via recorrente OU lançado manualmente
--    em /lancamento com a mesma descrição — confirmado que a maioria de "Carro"/"Fundo MP"
--    foi lançada manualmente, não pelo botão "Pagar")
UPDATE privado.transacoes
  SET tipo = 'transferencia', conta_destino_id = 10, tipo_despesa = NULL
  WHERE descricao = 'Fundo MP' AND tipo = 'despesa';

UPDATE privado.transacoes
  SET tipo = 'transferencia',
      conta_destino_id = (SELECT id FROM privado.contas WHERE nome = 'PagBank'),
      tipo_despesa = NULL
  WHERE descricao = 'Carro' AND tipo = 'despesa';

UPDATE privado.transacoes
  SET tipo = 'transferencia', tipo_despesa = NULL
  WHERE descricao = 'Carteiras de Investimento' AND tipo = 'despesa';
