import { VIGENCIA_TONE_STYLE, VigenciaInfo } from '../../utils/vigencia';

/** Farol da linha: rótulo + barra com o percentual de tempo já decorrido. */
export function VigenciaCell({ info }: { info: VigenciaInfo }) {
  const style = VIGENCIA_TONE_STYLE[info.tone];

  return (
    <div>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
        <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
        {info.label}
      </span>

      {info.percentual !== null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${info.percentual}%` }} />
          </div>
          <span className="text-rotulo tabular-nums text-slate-500">{info.percentual}%</span>
        </div>
      )}
    </div>
  );
}
