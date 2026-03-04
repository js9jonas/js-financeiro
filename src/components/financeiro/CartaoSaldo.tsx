import clsx from "clsx";

interface Props {
  titulo: string;
  valor: number;
  descricao?: string;
  cor?: "verde" | "vermelho" | "amarelo" | "azul" | "neutro";
  prefixo?: string;
}

const cores = {
  verde:    { text: "#22c55e", bg: "#052e16" },
  vermelho: { text: "#f87171", bg: "#2d0a0a" },
  amarelo:  { text: "#fbbf24", bg: "#2d1b00" },
  azul:     { text: "#38bdf8", bg: "#0c2340" },
  neutro:   { text: "#e2e8f0", bg: "var(--surface2)" },
};

export function CartaoSaldo({ titulo, valor, descricao, cor = "neutro", prefixo = "R$" }: Props) {
  const { text, bg } = cores[cor];
  const negativo = valor < 0;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1 border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {titulo}
      </span>
      <span
        className="text-2xl font-bold"
        style={{ color: negativo ? "#f87171" : text }}
      >
        {prefixo} {Math.abs(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        {negativo && <span className="text-sm ml-1 opacity-70">(déficit)</span>}
      </span>
      {descricao && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{descricao}</span>
      )}
    </div>
  );
}
