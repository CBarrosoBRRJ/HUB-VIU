/**
 * Foto de perfil sem servidor de arquivos.
 *
 * A imagem é redimensionada e recomprimida no próprio navegador antes de virar data URL. Sem
 * isso, uma foto de celular (4 MB) entraria inteira no estado e, depois, no banco — inviável.
 * Quando existir storage, `processarFoto` passa a devolver o arquivo para upload e o modelo
 * guarda apenas a URL.
 */

/** Lado máximo da imagem final, em pixels. */
export const LADO_MAXIMO = 256;

/** Limite do arquivo de origem — 5 MB. */
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

export type ErroFoto = 'tipo' | 'tamanho' | 'leitura';

export function mensagemErroFoto(erro: ErroFoto): string {
  switch (erro) {
    case 'tipo':
      return 'Use uma imagem JPG, PNG ou WebP.';
    case 'tamanho':
      return 'A imagem precisa ter até 5 MB.';
    case 'leitura':
      return 'Não foi possível ler a imagem.';
  }
}

/**
 * Valida, recorta no centro (quadrado) e reduz para `LADO_MAXIMO`.
 *
 * Devolve uma data URL JPEG — o recorte quadrado evita que o avatar circular corte a imagem
 * de forma imprevisível.
 */
export async function processarFoto(arquivo: File): Promise<{ dataUrl: string } | { erro: ErroFoto }> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return { erro: 'tipo' };
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) return { erro: 'tamanho' };

  try {
    const bitmap = await createImageBitmap(arquivo);
    const lado = Math.min(bitmap.width, bitmap.height);
    const origemX = (bitmap.width - lado) / 2;
    const origemY = (bitmap.height - lado) / 2;
    const destino = Math.min(lado, LADO_MAXIMO);

    const canvas = document.createElement('canvas');
    canvas.width = destino;
    canvas.height = destino;

    const contexto = canvas.getContext('2d');
    if (!contexto) return { erro: 'leitura' };

    contexto.drawImage(bitmap, origemX, origemY, lado, lado, 0, 0, destino, destino);
    bitmap.close();

    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85) };
  } catch {
    return { erro: 'leitura' };
  }
}
