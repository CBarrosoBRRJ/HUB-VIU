import { motion } from 'motion/react';

interface SwitchProps {
  ligado: boolean;
  onChange: () => void;
  /** Rótulo acessível — não é exibido; o texto visível fica ao lado, por conta de quem usa. */
  label: string;
  /** Âmbar sinaliza privilégio (dado sensível), indigo é a ação comum. */
  tom?: 'indigo' | 'ambar';
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const TRILHO = {
  sm: 'h-4 w-7',
  md: 'h-5 w-9',
};

const BOLA = {
  sm: 'size-3',
  md: 'size-4',
};

const LIGADO = {
  indigo: 'bg-indigo-600',
  ambar: 'bg-amber-500',
};

/**
 * Interruptor de duas posições.
 *
 * Substitui o chip que mudava de cor: com um chip, "ligado" e "desligado" são a mesma forma em
 * duas cores — quem não decora a convenção precisa comparar com os vizinhos para saber o estado.
 * O interruptor diz a posição pela **forma**, não só pela cor.
 */
export function Switch({
  ligado, onChange, label, tom = 'indigo', disabled = false, size = 'md',
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative shrink-0 rounded-full transition-colors ${TRILHO[size]} ${
        ligado ? LIGADO[tom] : 'bg-slate-200'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:brightness-105'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm ${BOLA[size]}`}
        style={{ left: ligado ? undefined : 2, right: ligado ? 2 : undefined }}
      />
    </button>
  );
}
