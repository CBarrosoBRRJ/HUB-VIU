/**
 * O que o jsdom não implementa e os componentes consultam ao montar.
 *
 * Sem isto, o teste falha por um motivo que não tem nada a ver com o que ele verifica — e a
 * mensagem aponta para o lugar errado.
 */

// O `motion` consulta a preferência de movimento reduzido.
window.matchMedia = window.matchMedia || (((consulta: string) => ({
  matches: false,
  media: consulta,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia);

// Chamado por componentes que levam o foco a uma célula fora da vista.
window.HTMLElement.prototype.scrollIntoView = () => {};

// Mock de URL.createObjectURL e revokeObjectURL para exportação de arquivos em JSDOM
if (typeof window.URL.createObjectURL !== 'function') {
  window.URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof window.URL.revokeObjectURL !== 'function') {
  window.URL.revokeObjectURL = () => {};
}
