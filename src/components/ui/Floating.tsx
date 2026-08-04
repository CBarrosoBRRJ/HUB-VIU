import { ReactNode, RefObject, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingProps {
  anchorRef: RefObject<HTMLElement | null>;
  /** Largura fixa do painel, usada para centralizar e evitar estouro lateral. */
  width: number;
  /** Altura estimada — decide se o painel abre para baixo ou para cima. */
  height: number;
  align?: 'center' | 'start';
  children: ReactNode;
}

const MARGEM = 8;

/**
 * Painel flutuante renderizado em portal.
 *
 * A tabela vive dentro de um `overflow-x-auto`, e o CSS transforma o eixo Y em
 * `auto` junto — qualquer popover absoluto seria cortado. Por isso o conteúdo
 * sai para o `body` com posição fixa recalculada em scroll e resize.
 */
export function Floating({ anchorRef, width, height, align = 'center', children }: FloatingProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function atualizar() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const bruto = align === 'center' ? rect.left + rect.width / 2 - width / 2 : rect.left;
      const left = Math.min(Math.max(MARGEM, bruto), window.innerWidth - width - MARGEM);

      const cabeAbaixo = rect.bottom + height + MARGEM <= window.innerHeight;
      const top = cabeAbaixo ? rect.bottom + 6 : Math.max(MARGEM, rect.top - height - 6);

      setPos({ top, left });
    }

    atualizar();
    // `true` para capturar também o scroll dos contêineres internos.
    window.addEventListener('scroll', atualizar, true);
    window.addEventListener('resize', atualizar);
    return () => {
      window.removeEventListener('scroll', atualizar, true);
      window.removeEventListener('resize', atualizar);
    };
  }, [anchorRef, width, height, align]);

  if (!pos) return null;

  return createPortal(
    <div className="fixed z-50" style={{ top: pos.top, left: pos.left, width }}>
      {children}
    </div>,
    document.body,
  );
}
