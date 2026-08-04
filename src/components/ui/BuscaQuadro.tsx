import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';

interface BuscaQuadroProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  /** Quantos registros sobraram — só aparece com busca ativa. */
  encontrados?: number;
  total?: number;
}

/** Campo de busca da barra de ações dos quadros. */
export function BuscaQuadro({ valor, onChange, placeholder, encontrados, total }: BuscaQuadroProps) {
  const ativa = valor.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
          onKeyDown={(evento) => evento.key === 'Escape' && onChange('')}
          placeholder={placeholder}
          className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:w-72 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        {ativa && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpar busca"
            title="Limpar (Esc)"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {ativa && encontrados !== undefined && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className={`whitespace-nowrap text-xs ${encontrados === 0 ? 'text-amber-600' : 'text-slate-500'}`}
        >
          {encontrados} de {total}
        </motion.span>
      )}
    </div>
  );
}
