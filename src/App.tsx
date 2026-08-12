import { ComponentType, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AceitarConvite } from './pages/AceitarConvite';
import { BannerVisualizacao } from './components/usuarios/BannerVisualizacao';
import { DadosProvider } from './context/DadosProvider';
import { Sidebar } from './components/Sidebar';
import { BacklogAgenciados } from './pages/BacklogAgenciados';
import { ContratosTalentos } from './pages/ContratosTalentos';
import { Talentos } from './pages/Talentos';
import { CadastroClientes } from './pages/CadastroClientes';
import { Equipes } from './pages/Equipes';
import { Usuarios } from './pages/Usuarios';
import { MeuPerfil } from './pages/MeuPerfil';
import { ConfirmarEmail } from './pages/ConfirmarEmail';
import { EntrarPorLink } from './pages/EntrarPorLink';
import { useDados } from './context/DadosProvider';
import { AppPage } from './types';
import { Dica } from './components/ui/Dica';
import { DialogoProvider } from './components/ui/Dialogo';
import { AvisoHistorico } from './components/ui/AvisoHistorico';
import { carregar, salvar } from './utils/persistencia';
import {
  caminhoDaPagina, paginaPorCaminho, PAGINA_PADRAO, PAGINAS_APP, validarPagina,
} from './utils/navegacao';

const PAGINAS: Record<AppPage, ComponentType> = {
  backlog: BacklogAgenciados,
  contratos: ContratosTalentos,
  talentos: Talentos,
  clientes: CadastroClientes,
  equipes: Equipes,
  usuarios: Usuarios,
  perfil: MeuPerfil,
};

/**
 * A página aberta sobrevive ao F5.
 *
 * Sem isto, recarregar devolvia todo mundo para Contratos — quem estava no Backlog conferindo uma
 * linha perdia o lugar a cada atualização. Como o resto do estado já é preservado
 * (`utils/persistencia.ts`), a tela era a única coisa que o F5 ainda descartava.
 *
 * `validarPagina` protege contra o que estiver gravado: nome de página que saiu do produto, valor
 * de uma versão anterior, edição manual do `localStorage`. Sem ela, `PAGINAS[valor]` seria
 * `undefined` e a tela abriria em branco.
 */
function paginaSalva(): AppPage {
  return validarPagina(carregar<string>('pagina', PAGINA_PADRAO));
}

/**
 * A página da carga inicial: **a URL manda; o salvo desempata.**
 *
 * Um link compartilhado precisa abrir o que ele nomeia — se o `localStorage` vencesse, mandar
 * "/backlog" para alguém abriria a última página que essa pessoa visitou. Sem caminho na URL
 * (abrir "/"), vale a página salva, que é o comportamento do F5 de sempre.
 */
function paginaInicial(): AppPage {
  return paginaPorCaminho(window.location.pathname) ?? paginaSalva();
}

/**
 * Rotas públicas por hash — sem servidor de rotas, é o que resolve.
 *
 * `#/convite/<token>` · `#/entrar/<token>` · `#/confirmar-email/<token>`
 */
type RotaPublica = { tipo: 'convite' | 'entrar' | 'confirmar-email'; token: string } | null;

function lerRota(): RotaPublica {
  const match = window.location.hash.match(/^#\/(convite|entrar|confirmar-email)\/([\w-]+)$/);
  if (!match) return null;
  return { tipo: match[1] as 'convite' | 'entrar' | 'confirmar-email', token: match[2] };
}

function useRotaPublica() {
  const [rota, setRota] = useState<RotaPublica>(() => lerRota());

  useEffect(() => {
    function aoMudar() {
      setRota(lerRota());
    }
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  return [
    rota,
    () => {
      window.location.hash = '';
      setRota(null);
    },
  ] as const;
}

function Workspace() {
  const { nivelDoQuadro } = useDados();
  const [activePage, setActivePage] = useState<AppPage>(paginaInicial);
  const [rota, limparRota] = useRotaPublica();

  /*
    Guarda a página **escolhida**, não a que acabou sendo exibida.

    Quem está sem acesso a uma página cai na primeira permitida (abaixo). Salvar essa substituta
    apagaria a intenção: ao recuperar o acesso, a pessoa voltaria para a página de fallback em vez
    da que ela tinha aberto.
  */
  useEffect(() => salvar('pagina', activePage), [activePage]);

  /*
    A barra de endereço acompanha a página.

    `replaceState` quando a URL atual não nomeia página nenhuma (a carga em "/", que só se
    normaliza); `pushState` nas trocas — é o que faz voltar/avançar do navegador funcionarem.
    O hash é preservado: as rotas públicas (`#/convite/…`) vivem nele e chegam por e-mail.
  */
  useEffect(() => {
    const caminho = caminhoDaPagina(activePage);
    if (window.location.pathname === caminho) return;
    const url = `${caminho}${window.location.search}${window.location.hash}`;
    if (paginaPorCaminho(window.location.pathname) === null) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
  }, [activePage]);

  // Voltar/avançar do navegador troca a página — sem isto, o botão voltaria só a URL, não a tela.
  useEffect(() => {
    function aoNavegar() {
      setActivePage(paginaPorCaminho(window.location.pathname) ?? paginaSalva());
    }
    window.addEventListener('popstate', aoNavegar);
    return () => window.removeEventListener('popstate', aoNavegar);
  }, []);

  if (rota?.tipo === 'convite') {
    return <AceitarConvite token={rota.token} onConcluir={limparRota} />;
  }

  if (rota?.tipo === 'entrar') {
    return <EntrarPorLink token={rota.token} onConcluir={limparRota} />;
  }

  if (rota?.tipo === 'confirmar-email') {
    return <ConfirmarEmail token={rota.token} onConcluir={limparRota} />;
  }

  // Trocar de sessão pode tirar o acesso à página aberta — cai na primeira permitida.
  const paginaPermitida = nivelDoQuadro(activePage) !== 'nenhum';
  const primeiraPermitida = PAGINAS_APP.find((pagina) => nivelDoQuadro(pagina) !== 'nenhum');
  const paginaAtiva = paginaPermitida ? activePage : primeiraPermitida;
  const Pagina = paginaAtiva ? PAGINAS[paginaAtiva] : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Um balão para a aplicação inteira — ver `Dica`. */}
      <Dica />
      {/* E um aviso só, para o desfazer — ver `AvisoHistorico`. */}
      <AvisoHistorico />
      <BannerVisualizacao />

      {/*
        ============================================================================================
        ## Dois planos: o fundo escuro, e a folha de trabalho apoiada nele — 12/08/2026
        ============================================================================================

        A sidebar não tem mais cor própria: ela é **o plano**, e por isso não precisa de borda para
        se separar do conteúdo — a diferença de tom já faz isso, e faz melhor do que um traço de 1px
        fazia.

        A folha é o `main`: fundo claro, canto arredondado e um vão de 8px que deixa o plano
        aparecer em volta. O vão é o detalhe que a referência tem e um layout comum não tem — sem
        ele, a folha encosta na borda da janela e volta a parecer uma coluna ao lado da sidebar em
        vez de um objeto em cima dela. O anel branco a 6% é o brilho da quina; a sombra, o peso.

        `overflow-hidden` aqui é estrutural, não estético: é ele que faz o conteúdo respeitar o
        canto arredondado — sem isso, a grade do Backlog passa reta por baixo da curva.
      */}
      <div className="flex flex-1 overflow-hidden bg-plano p-2 pl-0">
        <Sidebar activePage={paginaAtiva ?? activePage} onNavigate={setActivePage} />
        <main className="flex flex-1 flex-col overflow-hidden rounded-xl bg-[#f4f6fa] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/6">
          {Pagina ? (
            <Pagina />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <p className="max-w-sm text-sm text-slate-500">
                Esta pessoa ainda não faz parte de nenhuma equipe com acesso a quadros.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * `DialogoProvider` por fora de tudo — inclusive das rotas públicas.
 *
 * Ele não depende de dado nenhum, e quem entra por convite ou por link também merece uma pergunta
 * decente em vez da caixa do navegador. Por fora, é um provider só para o app inteiro.
 *
 * ## `MotionConfig reducedMotion="user"`
 *
 * A outra metade da preferência de movimento do sistema operacional. O `index.css` desliga
 * transições e animações **de CSS**; as do `motion` são calculadas em JavaScript e escapariam
 * dessa regra — quem as desliga é este `MotionConfig`.
 *
 * `"user"` e não `"always"`: quem não pediu para reduzir continua vendo o produto como ele foi
 * desenhado. A preferência é de quem usa, não nossa.
 */
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DialogoProvider>
        <DadosProvider>
          <Workspace />
        </DadosProvider>
      </DialogoProvider>
    </MotionConfig>
  );
}
