import { ComponentType, useEffect, useState } from 'react';
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
      <BannerVisualizacao />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={paginaAtiva ?? activePage} onNavigate={setActivePage} />
        {Pagina ? (
          <Pagina />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#f4f6fa] p-6 text-center">
            <p className="max-w-sm text-sm text-slate-500">
              Esta pessoa ainda não faz parte de nenhuma equipe com acesso a quadros.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DadosProvider>
      <Workspace />
    </DadosProvider>
  );
}
