/**
 * Envio de e-mail da plataforma.
 *
 * ## Por que existe esta camada
 *
 * Hoje o envio é feito pelo cliente de e-mail de quem convida (`mailto:`). Amanhã será feito por
 * uma API — a conta de serviço da Globo, o Microsoft Graph ou um provedor transacional. As telas
 * chamam sempre `enviarEmail()`, então a troca acontece **aqui**, num arquivo só.
 *
 * ## ⚠️ A credencial nunca vem para o front
 *
 * Chave de API, segredo de conta de serviço ou token OAuth **não podem** existir em código que
 * roda no navegador: qualquer pessoa abre o DevTools, copia a credencial e passa a enviar e-mail
 * em nome da empresa. Não há como "esconder" — variável de ambiente do Vite (`VITE_*`) também é
 * embutida no bundle e fica visível.
 *
 * O desenho correto:
 *
 * ```
 * navegador → POST /api/email (sessão do usuário) → backend guarda a credencial → provedor
 * ```
 *
 * O backend valida quem está pedindo, monta a mensagem a partir de um modelo e só então chama o
 * provedor. `transporteApi` abaixo já fala com esse endpoint — falta apenas o endpoint existir.
 */

export interface MensagemEmail {
  /** Destinatário. Vazio abre o cliente sem preencher — usado no link coletivo. */
  para?: string;
  assunto: string;
  corpo: string;
}

export interface ResultadoEnvio {
  enviado: boolean;
  /** Como foi enviado, para a interface dar o retorno certo. */
  via: 'cliente' | 'api';
  erro?: string;
}

export interface TransporteEmail {
  nome: string;
  /** Descrição curta, exibida na interface. */
  descricao: string;
  enviar: (mensagem: MensagemEmail) => Promise<ResultadoEnvio>;
}

/**
 * Abre o cliente de e-mail de quem está usando, já preenchido.
 *
 * Custo zero e sem backend. Efeito colateral bom: a mensagem sai do endereço corporativo de quem
 * convida, o que entrega melhor do que um remetente genérico da plataforma.
 */
export const transporteCliente: TransporteEmail = {
  nome: 'Cliente de e-mail',
  descricao: 'Abre seu Outlook ou Gmail com a mensagem pronta',
  async enviar({ para, assunto, corpo }) {
    const destino = para ? encodeURIComponent(para) : '';
    const parametros = `subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = `mailto:${destino}?${parametros}`;
    return { enviado: true, via: 'cliente' };
  },
};

/**
 * Envio pelo backend. **Não funciona sem o endpoint** — está aqui para que a troca seja de uma
 * linha quando ele existir.
 */
export const transporteApi: TransporteEmail = {
  nome: 'Envio automático',
  descricao: 'A plataforma envia pela conta de serviço',
  async enviar(mensagem) {
    try {
      const resposta = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A sessão vai junto: é o backend quem decide se esta pessoa pode disparar e-mail.
        credentials: 'include',
        body: JSON.stringify(mensagem),
      });

      if (!resposta.ok) {
        return { enviado: false, via: 'api', erro: `Falha no envio (${resposta.status})` };
      }
      return { enviado: true, via: 'api' };
    } catch {
      return { enviado: false, via: 'api', erro: 'Serviço de e-mail indisponível' };
    }
  },
};

/**
 * Transporte em uso.
 *
 * Trocar para `transporteApi` quando o endpoint existir — nenhuma tela precisa mudar.
 */
export const transporteAtual: TransporteEmail = transporteCliente;

export function enviarEmail(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
  return transporteAtual.enviar(mensagem);
}

/** A interface avisa quando o envio depende de uma ação manual de quem convida. */
export const envioEhManual = transporteAtual === transporteCliente;
