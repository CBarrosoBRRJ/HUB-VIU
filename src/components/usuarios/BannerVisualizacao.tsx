import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, Lock, X } from 'lucide-react';
import { EVENTO_ESCRITA_EM_VISUALIZACAO, useDados } from '../../context/DadosProvider';
import { rotuloDeNivel } from '../../utils/permissoes';

/**
 * Faixa fixa durante o modo "Ver como".
 *
 * Precisa ser impossível de ignorar: sem ela, é fácil esquecer que a tela mostra a visão de
 * outra pessoa e concluir que o próprio acesso está quebrado.
 *
 * ## E é ela quem responde ao gesto de escrita — 12/08/2026
 *
 * A tela mostra tudo o que a pessoa simulada tem, inclusive os botões de criar e editar — a
 * simulação é auditoria, e esconder botão dela é mentir sobre o acesso. O gesto, porém, morre na
 * guarda do `DadosProvider`, que dispara `EVENTO_ESCRITA_EM_VISUALIZACAO`; aqui a faixa **treme e
 * explica**. O aviso mora no elemento que já explica o modo, em vez de um alerta novo que a
 * pessoa precisa aprender.
 */
export function BannerVisualizacao() {
  const { visualizandoComo, usuarioReal, sairDaVisualizacao } = useDados();
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    function aoTentarEscrever() {
      setTentativas((n) => n + 1);
    }
    window.addEventListener(EVENTO_ESCRITA_EM_VISUALIZACAO, aoTentarEscrever);
    return () => window.removeEventListener(EVENTO_ESCRITA_EM_VISUALIZACAO, aoTentarEscrever);
  }, []);

  // A explicação reforçada fica na tela por alguns segundos após a tentativa, e depois recua.
  useEffect(() => {
    if (tentativas === 0) return;
    const volta = setTimeout(() => setTentativas(0), 4000);
    return () => clearTimeout(volta);
  }, [tentativas]);

  if (!visualizandoComo) return null;

  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-dado text-amber-950"
    >
      {/* `key` remonta só o miolo a cada tentativa — é o que reinicia o tremor sem reanimar a faixa. */}
      <motion.span
        key={tentativas}
        animate={tentativas > 0 ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <Eye className="size-4" />
          Vendo como {visualizandoComo.nome}
        </span>

        {tentativas > 0 ? (
          <span className="flex items-center gap-1.5 font-bold" data-testid="aviso-escrita">
            <Lock className="size-3.5" />
            Nada foi alterado — em visualização a escrita fica bloqueada. Saia para editar.
          </span>
        ) : (
          <span className="text-amber-900">
            {rotuloDeNivel(visualizandoComo)} · somente leitura · você continua conectado como{' '}
            {usuarioReal?.nome}
          </span>
        )}
      </motion.span>

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
