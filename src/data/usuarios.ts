import { Usuario } from '../types';

/**
 * Semente da base de usuários.
 *
 * A partir daqui quem manda é o estado do `DadosProvider` — as páginas de Equipes e Usuários
 * criam e editam pessoas em cima desta lista inicial.
 */
export const USUARIOS_SEED: Usuario[] = [
  {
    id: 'u0',
    nome: 'Caio Cesar Moura Barroso',
    email: 'barroso.ccmb@gmail.com',
    cargo: 'Dono do Sistema',
    telefone: '(21) 99550-8701',
    local: 'Caxias do Sul, RS',
    nascimento: '1990-01-01',
    perfil: 'admin',
    situacao: 'ativo',
    // Único acesso fora dos domínios corporativos e o único com mais de um e-mail.
    ehDono: true,
    emailsAlternativos: [],
  },
  {
    id: 'u1',
    nome: 'Ana Martins',
    email: 'ana.martins@viu.com.br',
    cargo: 'Analista de Agenciamento',
    telefone: '(21) 98800-1010',
    local: 'Rio de Janeiro, RJ',
    nascimento: '1994-04-08',
    perfil: 'admin',
    situacao: 'ativo',
  },
  {
    id: 'u2',
    nome: 'Bruno Carvalho',
    email: 'bruno.carvalho@viu.com.br',
    cargo: 'Coordenador Jurídico',
    telefone: '(21) 98800-2020',
    local: 'Rio de Janeiro, RJ',
    nascimento: '1988-11-23',
    perfil: 'responsavel',
    situacao: 'ativo',
  },
  {
    id: 'u3',
    nome: 'Camila Souza',
    email: 'camila.souza@viu.com.br',
    cargo: 'Gerente de Talentos',
    telefone: '(11) 97700-3030',
    local: 'São Paulo, SP',
    nascimento: '1990-07-15',
    perfil: 'responsavel',
    situacao: 'ativo',
  },
  {
    id: 'u5',
    nome: 'Elisa Ramos',
    email: 'elisa.ramos@g.globo',
    cargo: 'Coordenadora de Produção',
    telefone: '(21) 98800-5050',
    local: 'Rio de Janeiro, RJ',
    nascimento: '1992-09-12',
    // Só na equipe de Produção: é o caso de "sou da área X" — vê o quadro de Talentos,
    // mas não as abas de dado pessoal e financeiro.
    perfil: 'membro',
    situacao: 'ativo',
  },
  {
    id: 'u4',
    nome: 'Diego Nogueira',
    email: 'diego.nogueira@viu.com.br',
    cargo: 'Analista de Contratos',
    telefone: '(11) 97700-4040',
    local: 'São Paulo, SP',
    nascimento: '1996-02-29',
    perfil: 'membro',
    situacao: 'ativo',
  },
];

/** Usuário logado — fixo até existir autenticação. */
export const USUARIO_ATUAL_ID = 'u0';
