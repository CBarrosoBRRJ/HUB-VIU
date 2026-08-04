import { EyeOff } from 'lucide-react';

interface CelulaOcultaProps {
  /** Só para o `title` — nunca o valor. */
  label?: string;
  align?: 'left' | 'center';
  /** Quantidade de blocos do borrão. Varia por coluna para não virar um padrão uniforme. */
  largura?: 'curta' | 'media' | 'longa';
}

const BLOCOS: Record<string, string> = {
  curta: '••••',
  media: '••••••••',
  longa: '••••••••••••',
};

/**
 * Célula cujo conteúdo a pessoa não pode ver.
 *
 * ## O valor real NUNCA chega aqui
 *
 * O desfoque é **cosmético**: um `blur` sobre o dado verdadeiro continua com o texto no DOM, a um
 * F12 de distância — e pior, dá a impressão de que está protegido. Por isso a célula recebe só um
 * marcador; quem monta a tabela não passa o valor.
 *
 * O borrão existe para preservar o **layout**: a coluna mantém largura e a linha não se desmonta,
 * como aconteceria se a célula sumisse. E deixa explícito que ali há um dado — esconder sem sinal
 * faria a pessoa achar que o campo está vazio e tentar preencher.
 */
export function CelulaOculta({ label, align = 'center', largura = 'media' }: CelulaOcultaProps) {
  return (
    <div
      title={label ? `${label} — sem acesso a este dado` : 'Sem acesso a este dado'}
      aria-label={label ? `${label}: sem acesso` : 'Sem acesso'}
      className={`flex select-none items-center gap-1.5 px-2 py-1 ${
        align === 'center' ? 'justify-center' : 'justify-start'
      }`}
    >
      <EyeOff className="size-3 shrink-0 text-slate-300" />
      <span className="truncate text-xs leading-none tracking-widest text-slate-300 blur-[2px]">
        {BLOCOS[largura]}
      </span>
    </div>
  );
}
