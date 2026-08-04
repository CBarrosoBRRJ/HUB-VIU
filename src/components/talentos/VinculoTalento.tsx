import { CircleAlert, Star } from 'lucide-react';
import { TalentContract } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { getTipo } from '../../utils/talentos';

/**
 * Estado do vínculo entre a linha do contrato e a ficha do talento.
 *
 * Os dois quadros conversam pelo nome digitado. Sem um sinal na linha, esse elo é invisível: um
 * erro de digitação quebraria o vínculo e ninguém perceberia até faltar o contrato na ficha.
 * Aqui o elo — e a ausência dele — ficam explícitos.
 */
export function VinculoTalento({ contrato }: { contrato: TalentContract }) {
  const { talentos } = useDados();

  if (!contrato.talento.trim()) return null;

  const talento = contrato.talentoId
    ? talentos.find((item) => item.id === contrato.talentoId)
    : undefined;

  /*
    Nome sem ficha só acontece com dado antigo: hoje escrever um nome novo abre o cadastro na
    hora. O aviso permanece para o que entrou antes — e para o caso de a ficha ser excluída
    depois, que desfaz o vínculo mas preserva o contrato.
  */
  if (!talento) {
    return (
      <span
        title="Este nome não corresponde a nenhum talento cadastrado. Reescreva o nome para abrir a ficha."
        className="ml-2 flex items-center gap-1 text-[10px] text-slate-400"
      >
        <CircleAlert className="size-2.5" />
        sem cadastro
      </span>
    );
  }

  // Ficha aberta pelo próprio contrato e ainda sem dados: o que falta é visível de onde nasceu.
  if (talento.cadastroPendente) {
    return (
      <span
        title={`Ficha de ${talento.nome} criada a partir deste contrato — falta completar em Talentos`}
        className="ml-2 flex items-center gap-1 text-[10px] font-medium text-amber-600"
      >
        <CircleAlert className="size-2.5" />
        cadastro pendente
      </span>
    );
  }

  const tipo = getTipo(talento.tipo);

  return (
    <span
      title={`Vinculado à ficha de ${talento.nome} — ${tipo.label.toLowerCase()}`}
      className="ml-2 flex items-center gap-1 text-[10px] text-slate-400"
    >
      {talento.tipo === 'exclusivo' ? (
        <Star className="size-2.5 text-indigo-500" />
      ) : (
        <span className={`size-1.5 rounded-full ${tipo.dot}`} />
      )}
      {tipo.label.toLowerCase()}
    </span>
  );
}
