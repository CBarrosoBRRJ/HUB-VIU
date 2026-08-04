import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  /** Uma frase. Textos longos centralizados quebram feio — as orientações vão em `hints`. */
  subtitle: string;
  /** Orientações de uso, exibidas em linha única abaixo do subtítulo. */
  hints?: { icon: LucideIcon; text: string }[];
  /**
   * Versão compacta, para quadros onde a altura é disputada.
   *
   * O cabeçalho cheio custa **170px** — numa tela de 950px, com o mapa do processo acima da grade,
   * sobravam 5 linhas de 12 para a lista. O denso entrega os mesmos elementos em ~120px: o traço
   * some, o subtítulo encosta no título e as orientações sobem.
   *
   * É **opt-in por página**, e não o novo padrão: o cabeçalho cheio continua certo onde a tela não
   * é uma grade longa — o Meu Perfil e o Cadastro de Clientes respiram melhor com ele.
   */
  denso?: boolean;
  children?: ReactNode;
}

/** Cabeçalho centralizado do quadro ativo, fixo acima da área de dados. */
export function Header({ title, subtitle, hints, denso = false, children }: HeaderProps) {
  return (
    <header
      className={`shrink-0 border-b border-slate-200 bg-white px-8 ${denso ? 'py-3.5' : 'py-7'}`}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.22em] text-slate-900">
          {title}
        </h1>

        {/* O traço é respiro, e respiro é o primeiro a sair quando falta altura. */}
        {!denso && <span className="mx-auto mt-2.5 block h-0.5 w-10 rounded-full bg-indigo-500/70" />}

        {/* text-balance distribui as linhas de forma pareja em vez de deixar uma órfã. */}
        <p
          className={`mx-auto max-w-2xl text-balance leading-relaxed text-slate-500 ${
            denso ? 'mt-1 text-xs' : 'mt-3 text-sm'
          }`}
        >
          {subtitle}
        </p>

        {hints && hints.length > 0 && (
          <div
            className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 ${
              denso ? 'mt-1.5' : 'mt-4'
            }`}
          >
            {hints.map((hint, indice) => (
              <span key={hint.text} className="flex items-center gap-2.5">
                {indice > 0 && <span className="hidden size-1 rounded-full bg-slate-200 md:block" />}
                <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                  <hint.icon className="size-3.5 shrink-0 text-indigo-400" />
                  {hint.text}
                </span>
              </span>
            ))}
          </div>
        )}

        {children && (
          <div className={`flex justify-center ${denso ? 'mt-2' : 'mt-4'}`}>{children}</div>
        )}
      </div>
    </header>
  );
}
