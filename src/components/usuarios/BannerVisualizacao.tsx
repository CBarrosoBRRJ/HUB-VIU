import { motion } from 'motion/react';
import { Eye, X } from 'lucide-react';
import { useDados } from '../../context/DadosProvider';
import { rotuloDeNivel } from '../../utils/permissoes';

/**
 * Faixa fixa durante o modo "Ver como".
 *
 * Precisa ser impossível de ignorar: sem ela, é fácil esquecer que a tela mostra a visão de
 * outra pessoa e concluir que o próprio acesso está quebrado.
 */
export function BannerVisualizacao() {
  const { visualizandoComo, usuarioReal, sairDaVisualizacao } = useDados();
  if (!visualizandoComo) return null;

  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-dado text-amber-950"
    >
      <span className="flex items-center gap-1.5 font-semibold">
        <Eye className="size-4" />
        Vendo como {visualizandoComo.nome}
      </span>

      <span className="text-amber-900">
        {rotuloDeNivel(visualizandoComo)} · somente leitura · você continua conectado como{' '}
        {usuarioReal?.nome}
      </span>

      <button
        type="button"
        onClick={sairDaVisualizacao}
        className="flex items-center gap-1 rounded-md bg-amber-950/10 px-2 py-1 text-xs font-semibold transition hover:bg-amber-950/20"
      >
        <X className="size-3.5" />
        Sair da visualização
      </button>
    </motion.div>
  );
}
