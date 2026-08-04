/**
 * Jornada: "sou da área X, não devo ter acesso a dados pessoais".
 *
 * Percorre o seed real da aplicação — as mesmas equipes e usuários que sobem na tela — e verifica
 * o que cada perfil enxerga, quadro a quadro e aba a aba.
 */
import { USUARIOS_SEED } from './data/usuarios.js';
import { EQUIPES_SEED } from './data/equipes.js';
import { TALENTOS_SEED } from './data/talentos.js';
import { nivelDeAcesso, registrosVisiveis, podeEditarTalento, podeCriarRegistro } from './utils/permissoes.js';
import { AREAS, nomeadosDoTalento, equipeDaArea, candidatosDaArea } from './utils/talentos.js';
import { podeVerVisao, visoesDoQuadro } from './utils/visoes.js';
import { colunasDaVisao } from './utils/colunas.js';
import { filtrarTalentos } from './utils/busca.js';

let falhas = 0;
let etapaAtual = '';
function etapa(titulo) {
  etapaAtual = titulo;
  console.log(`\n${titulo}`);
}
function ok(nome, condicao) {
  if (condicao) console.log(`   ✓ ${nome}`);
  else {
    falhas++;
    console.log(`   ✗ FALHOU: ${nome}  [${etapaAtual}]`);
  }
}

const equipes = EQUIPES_SEED;
const por = (id) => USUARIOS_SEED.find((u) => u.id === id);
const ctx = (u) => ({ usuario: u, equipes });

const dono = por('u0');          // Caio — dono
const ana = por('u1');           // admin, responsável de Produção
const camila = por('u3');        // responsavel, Gestão de Contratos
const diego = por('u4');         // membro, Gestão de Contratos + GP + Conteúdo
const elisa = por('u5');         // membro, SÓ Gestão de Produção

const visoes = visoesDoQuadro('talentos');
const visiveis = (u) =>
  visoes.filter((v) => podeVerVisao(ctx(u), v.id, u.ehDono === true)).map((v) => v.id.split(':')[1]);

etapa('1. O seed está coerente');
ok('onze equipes', equipes.length === 11);
/*
  **Toda** área precisa de equipe, não só as seis do talento. Os candidatos de uma coluna de
  pessoas saem da equipe que atende a área — sem ela, o painel abre vazio e a coluna parece
  defeito. Foi o que aconteceu ao criar Pagamento e Jurídico.
*/
ok('toda área tem equipe', AREAS.every((a) => equipeDaArea(equipes, a.id) !== undefined));
ok('nenhuma área é atendida por duas equipes',
  new Set(equipes.filter((e) => e.areaTalento).map((e) => e.areaTalento)).size ===
  equipes.filter((e) => e.areaTalento).length);
ok('três talentos, dois exclusivos',
  TALENTOS_SEED.length === 3 && TALENTOS_SEED.filter((t) => t.tipo === 'exclusivo').length === 2);

etapa('2. Elisa é da Produção — o caso do pedido');
ok('vê o quadro de Talentos', nivelDeAcesso(ctx(elisa), 'talentos') !== 'nenhum');
ok('mas só as fichas dela (é membro)', nivelDeAcesso(ctx(elisa), 'talentos') === 'nomeado');
ok('NÃO vê a aba Contato', !visiveis(elisa).includes('contato'));
ok('NÃO vê a aba Financeiro', !visiveis(elisa).includes('financeiro'));
ok('vê Redes', visiveis(elisa).includes('redes'));
ok('vê Contratos', visiveis(elisa).includes('contratos'));
ok('vê Responsáveis', visiveis(elisa).includes('responsaveis'));
ok('vê Identificação', visiveis(elisa).includes('identificacao'));
ok('exatamente 4 das 6 abas', visiveis(elisa).length === 4);

etapa('3. O telefone não vaza pela busca');
const doQuadroDela = registrosVisiveis(ctx(elisa), 'talentos', TALENTOS_SEED, nomeadosDoTalento);
const colunasDeElisa = visoes
  .filter((v) => podeVerVisao(ctx(elisa), v.id))
  .flatMap((v) => colunasDaVisao(v.id))
  .map((c) => c.id);
const buscarComoElisa = (termo) =>
  filtrarTalentos(doQuadroDela, termo, USUARIOS_SEED, colunasDeElisa);

ok('acha a ficha dela pelo nome', buscarComoElisa('Marina').length === 1);
ok('NÃO acha pelo telefone', buscarComoElisa('98800-1122').length === 0);
ok('NÃO acha pelo CNPJ', buscarComoElisa('12.345.678').length === 0);
ok('acha pela rede social', buscarComoElisa('marinaduarte').length === 1);

etapa('4. Elisa só enxerga a ficha em que foi nomeada');
ok('vê 1 das 3 fichas', doQuadroDela.length === 1);
ok('e é justamente aquela em que responde por Produção',
  doQuadroDela.length === 1 && (doQuadroDela[0].responsaveis.producao ?? []).includes(elisa.id));
ok('edita essa ficha', doQuadroDela.length === 1 && podeEditarTalento(ctx(elisa), doQuadroDela[0]));
ok('NÃO edita a ficha alheia',
  !podeEditarTalento(ctx(elisa), TALENTOS_SEED.find((t) => t.id === 'tal-exemplo-3')));
ok('pode cadastrar (entra pela equipe)', podeCriarRegistro(ctx(elisa), 'talentos'));

etapa('5. Quem toca contrato tem as abas sensíveis');
ok('Camila vê Contato', visiveis(camila).includes('contato'));
ok('Camila vê Financeiro', visiveis(camila).includes('financeiro'));
ok('Camila vê as 6 abas', visiveis(camila).length === 6);
ok('e o quadro todo (é responsável)', nivelDeAcesso(ctx(camila), 'talentos') === 'total');
ok('Diego também herda de Gestão de Contratos', visiveis(diego).includes('contato'));
ok('mas como membro vê só as fichas dele',
  nivelDeAcesso(ctx(diego), 'talentos') === 'nomeado');

etapa('6. Dono e admin passam por cima');
ok('dono vê as 6 abas', visiveis(dono).length === 6);
ok('admin vê as 6 abas', visiveis(ana).length === 6);
ok('dono vê as 3 fichas',
  registrosVisiveis(ctx(dono), 'talentos', TALENTOS_SEED, nomeadosDoTalento).length === 3);
ok('admin vê as 3 fichas',
  registrosVisiveis(ctx(ana), 'talentos', TALENTOS_SEED, nomeadosDoTalento).length === 3);

etapa('7. Candidatos de cada área saem da equipe certa');
ok('Produção puxa da Gestão de Produção',
  candidatosDaArea(equipes, USUARIOS_SEED, 'producao').map((u) => u.id).sort().join() === 'u1,u5');
ok('Talent puxa da Gestão de Talent Manager',
  candidatosDaArea(equipes, USUARIOS_SEED, 'talent').map((u) => u.id).join() === 'u3');
ok('ninguém de fora entra na lista',
  !candidatosDaArea(equipes, USUARIOS_SEED, 'talent').some((u) => u.id === 'u5'));

etapa('8. Interveniência não tem responsáveis de área');
const helena = TALENTOS_SEED.find((t) => t.tipo === 'interveniencia');
ok('existe no mesmo cadastro', helena !== undefined);
ok('sem responsáveis por área', nomeadosDoTalento(helena).length === 0);
ok('e por isso nenhum membro a edita', !podeEditarTalento(ctx(elisa), helena));
ok('mas o responsável do quadro sim', podeEditarTalento(ctx(camila), helena));

console.log(
  falhas === 0
    ? '\n✅ Jornada completa: 8 etapas, nenhuma falha.'
    : `\n❌ ${falhas} verificação(ões) falharam.`,
);
