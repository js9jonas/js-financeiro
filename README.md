# JS Financeiro

Módulo de controle financeiro pessoal, rodando separado do js-painel mas compartilhando o mesmo banco PostgreSQL (`js_painel`).

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variável de ambiente
cp .env.example .env.local
# Edite .env.local com a mesma DATABASE_URL do js-painel

# 3. Rodar em dev (porta 3001)
npm run dev
```

## Deploy no Easypanel

1. Criar novo serviço Node.js no Easypanel
2. Apontar para este repositório
3. Adicionar variável de ambiente: `DATABASE_URL` (mesma do js-painel)
4. Build command: `npm run build`
5. Start command: `npm start`
6. Porta: `3001`

## Estrutura

```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/     GET  → resumo geral
│   │   ├── contas/        GET  → lista contas com saldo
│   │   ├── categorias/    GET  → lista categorias
│   │   ├── transacoes/    GET (projeção) | POST (nova despesa)
│   │   │   └── [id]/      PATCH (marcar pago) | DELETE
│   │   └── entradas/      GET | POST (nova entrada manual)
│   ├── dashboard/         Visão geral + saldos
│   ├── pagamentos/        Projeção 90 dias
│   └── lancamento/        Formulário despesa / entrada
├── components/
│   └── financeiro/
│       ├── Sidebar.tsx
│       └── CartaoSaldo.tsx
├── lib/
│   └── db.ts              Pool PostgreSQL
└── types/
    └── financeiro.ts      Tipos TypeScript
```
