import { useId } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export interface AbaConfig<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  /** Contador opcional exibido à direita do rótulo. */
  contador?: number;
  /** Destaca o contador — usado quando há algo esperando ação. */
  alerta?: boolean;
}

interface TabsProps<T extends string> {
  abas: AbaConfig<T>[];
  ativa: T;
  onChange: (aba: T) => void;
}

/** Abas de página, com indicador deslizante. */
export function Tabs<T extends string>({ abas, ativa, onChange }: TabsProps<T>) {
  /*
    Um `layoutId` por instância.

    Com um id fixo, todas as abas do produto compartilhavam o mesmo indicador: sair de Equipes e
    entrar em Usuários fazia o traço **viajar** da posição antiga até a nova, atravessando a tela.
    O motion não sabia que eram telas diferentes — para ele, era o mesmo elemento mudando de lugar.

    `useId` dá um id estável dentro da instância e distinto entre instâncias: o traço desliza
    entre as abas da mesma tela e simplesmente nasce no lugar certo ao trocar de tela.
  */
  const indicador = useId();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-6">
      {abas.map((aba) => {
        const Icon = aba.icon;
        const isAtiva = aba.id === ativa;

        return (
          <button
            key={aba.id}
            type="button"
            onClick={() => onChange(aba.id)}
            className={`relative flex items-center gap-2 px-3 py-3 text-dado font-medium transition-colors ${
              isAtiva ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className={`size-4 ${isAtiva ? 'text-indigo-600' : 'text-slate-400'}`} />
            {aba.label}

            {aba.contador !== undefined && aba.contador > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-rotulo font-bold ${
                  aba.alerta ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {aba.contador}
              </span>
            )}

            {isAtiva && (
              <motion.span
                layoutId={indicador}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-500"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
