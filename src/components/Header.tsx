import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { useJanelaCurta } from './ui/useJanelaCurta';

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
   * É **opt-in por página**: o cabeçalho cheio continua certo onde a tela não é uma grade longa —
   * o Meu Perfil e o Cadastro de Clientes respiram melhor com ele.
   *
   * > **Mas é um piso, não a palavra final** — 14/08/2026. Em janela curta o cabeçalho compacta
   * > sozinho, em qualquer página. O argumento do "respira melhor" vale em tela alta e se inverte
   * > em tela baixa: **nada respira quando nada cabe**. A página diz o que prefere; a janela pode
   * > puxar para o compacto, nunca para o alto.
   */
  denso?: boolean;
  children?: ReactNode;
}

/** Cabeçalho centralizado do quadro ativo, fixo acima da área de dados. */
export function Header({ title, subtitle, hints, denso = false, children }: HeaderProps) {
  /*
    A página pede, a janela decide o resto: `denso` é piso e a janela curta é o gatilho automático.
    Um quadro que já se declarou denso não volta a ser alto por causa do tamanho da tela.

    O hook é chamado **incondicionalmente**, e a combinação vem depois. Escrever
    `denso || useJanelaCurta()` parece equivalente e não é: o `||` curto-circuita, a chamada some
    quando `denso` é verdadeiro, e a ordem dos hooks muda entre renderizações — que é exatamente o
    que o React proíbe.
  */
  const janelaCurta = useJanelaCurta();
  const compacto = denso || janelaCurta;

  return (
    <header
      className={`shrink-0 border-b border-slate-200 bg-white px-8 ${compacto ? 'py-3.5' : 'py-7'}`}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.22em] text-slate-900">
          {title}
        </h1>

        {/* O traço é respiro, e respiro é o primeiro a sair quando falta altura. */}
        {!compacto && <span className="mx-auto mt-2.5 block h-0.5 w-10 rounded-full bg-indigo-500/70" />}

        {/* text-balance distribui as linhas de forma pareja em vez de deixar uma órfã. */}
        <p
          className={`mx-auto max-w-2xl text-balance leading-relaxed text-slate-500 ${
            compacto ? 'mt-1 text-xs' : 'mt-3 text-sm'
          }`}
        >
          {subtitle}
        </p>

        {hints && hints.length > 0 && (
          <div
            className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 ${
              compacto ? 'mt-1.5' : 'mt-4'
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
          <div className={`flex justify-center ${compacto ? 'mt-2' : 'mt-4'}`}>{children}</div>
        )}
      </div>
    </header>
  );
}
