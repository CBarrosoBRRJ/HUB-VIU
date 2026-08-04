import { PrioridadeOportunidade } from '../../types';
import { PRIORIDADES } from '../../utils/oportunidades';
import { EtiquetaSelect } from './EtiquetaSelect';

interface PrioridadeSelectProps {
  /** Ausente é "por definir" — diferente de média. */
  valor?: PrioridadeOportunidade;
  onChange?: (prioridade: PrioridadeOportunidade) => void;
}

/**
 * Etiqueta de prioridade — alta, média, baixa.
 *
 * Virou um envelope fino sobre [`EtiquetaSelect`](EtiquetaSelect.tsx) quando Impacto apareceu com
 * o mesmo comportamento e outra escala de cor. Continua existindo como componente próprio porque
 * é assim que a coluna se chama em toda a base — e porque um nome que diz o que a coisa é vale
 * mais que uma linha economizada.
 */
export function PrioridadeSelect({ valor, onChange }: PrioridadeSelectProps) {
  return (
    <EtiquetaSelect
      titulo="Prioridade"
      opcoes={PRIORIDADES}
      valor={valor}
      onChange={onChange}
    />
  );
}
