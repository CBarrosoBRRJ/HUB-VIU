import { Usuario } from '../../types';

/** Paleta fixa — a cor de cada pessoa é estável porque deriva do nome. */
const CORES = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
];

const TAMANHOS = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-14 text-base',
  xl: 'size-20 text-2xl',
};

export function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function getCorAvatar(nome: string): string {
  const soma = [...nome].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CORES[soma % CORES.length];
}

interface AvatarProps {
  usuario: Usuario;
  size?: keyof typeof TAMANHOS;
  /** Anel branco, para avatares sobrepostos na pilha. */
  ring?: boolean;
}

export function Avatar({ usuario, size = 'sm', ring = false }: AvatarProps) {
  const anel = ring ? 'ring-2 ring-white' : '';

  // Com foto, o avatar vira a imagem; sem foto, as iniciais coloridas.
  if (usuario.fotoUrl) {
    return (
      <img
        src={usuario.fotoUrl}
        alt={usuario.nome}
        className={`shrink-0 rounded-full object-cover ${TAMANHOS[size]} ${anel}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${TAMANHOS[size]} ${getCorAvatar(usuario.nome)} ${anel}`}
    >
      {getIniciais(usuario.nome)}
    </span>
  );
}
