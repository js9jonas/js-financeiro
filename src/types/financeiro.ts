export type TipoConta = "corrente" | "poupanca" | "carteira" | "investimento" | "cripto" | "outro";
export type TipoDespesa = "ct" | "essencial" | "eventual" | "insumo" | "investimento" | "veiculo" | "saude" | "mensal";
export type TipoTransacao = "despesa" | "transferencia";
export type StatusTransacao = "pendente" | "pago";

export interface Conta {
  id: number;
  nome: string;
  tipo: TipoConta;
  banco?: string;
  saldo_inicial: number;
  cor?: string;
  ativo: boolean;
  criado_em: string;
}

export interface ContaComSaldo extends Conta {
  movimentacao: number;
  saldo_atual: number;
}

export interface Categoria {
  id: number;
  nome: string;
  tipo: "receita" | "despesa" | "transferencia";
  icone?: string;
  cor?: string;
  pai_id?: number;
}

export interface Transacao {
  id: number;
  tipo: TipoTransacao;
  tipo_despesa?: TipoDespesa;
  categoria_id?: number;
  descricao: string;
  observacao?: string;
  valor: number;
  data_vencimento?: string;
  data_pagamento?: string;
  conta_id?: number;
  conta_destino_id?: number;
  recorrente: boolean;
  criado_em: string;
  atualizado_em: string;
  // joins
  conta_nome?: string;
  conta_cor?: string;
  categoria_nome?: string;
}

export interface TransacaoProjecao extends Transacao {
  status: StatusTransacao;
  dias_para_vencimento: number;
}

export interface Entrada {
  id: number;
  descricao: string;
  valor: number;
  data_recebimento: string;
  conta_id?: number;
  categoria_id?: number;
  observacao?: string;
  recorrente: boolean;
  criado_em: string;
  // joins
  conta_nome?: string;
  categoria_nome?: string;
}

export interface DashboardData {
  saldo_total: number;
  contas: ContaComSaldo[];
  total_pendente_30dias: number;
  total_pago_mes: number;
  receitas_mes: number;
  projecao_saldo: number;
}

export interface NovaTransacao {
  tipo: TipoTransacao;
  tipo_despesa?: TipoDespesa;
  categoria_id?: number;
  descricao: string;
  observacao?: string;
  valor: number;
  data_vencimento?: string;
  data_pagamento?: string;
  conta_id?: number;
  conta_destino_id?: number;
  recorrente?: boolean;
}

export interface NovaEntrada {
  descricao: string;
  valor: number;
  data_recebimento: string;
  conta_id?: number;
  categoria_id?: number;
  observacao?: string;
  recorrente?: boolean;
}

export const TIPO_DESPESA_LABEL: Record<TipoDespesa, string> = {
  ct:           "CT",
  essencial:    "Essencial",
  eventual:     "Eventual",
  insumo:       "Insumo",
  investimento: "Investimento",
  veiculo:      "Veículo",
  saude:        "Saúde",
  mensal:       "Mensal",
};

export const TIPO_DESPESA_COR: Record<TipoDespesa, string> = {
  ct:           "#6366F1",
  essencial:    "#EF4444",
  eventual:     "#F97316",
  insumo:       "#3B82F6",
  investimento: "#10B981",
  veiculo:      "#8B5CF6",
  saude:        "#EC4899",
  mensal:       "#F59E0B",
};
