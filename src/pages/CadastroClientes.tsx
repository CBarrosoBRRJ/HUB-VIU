import { Building2, Handshake, ListChecks } from 'lucide-react';
import { Header } from '../components/Header';
import { useDados } from '../context/DadosProvider';

/**
 * Cadastro de Clientes.
 *
 * A página que faltava: marcas entram no sistema pelo Backlog, como **solicitação pendente**, e até
 * agora não havia onde completar o cadastro. Elas se acumulavam sem dono.
 *
 * ## Ainda sem colunas, de propósito
 *
 * O mesmo caminho das abas do Backlog: a estrutura vem da conversa com quem usa, não do que seria
 * plausível. O que já está decidido é **onde os dados moram** — segmento, categoria e contatos são
 * da marca, e a aba Cliente do Backlog os lê daqui ([PRD 08 §6](../../prd/08_backlog_e_integracoes.md)).
 *
 * A pergunta aberta é como representar **agência**: quem procura a casa nem sempre é a marca. Ver
 * a proposta no PRD antes de desenhar as colunas.
 */
export function CadastroClientes() {
  const { marcas } = useDados();
  const pendentes = marcas.filter((marca) => marca.cadastroPendente).length;

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Cadastro de Clientes"
        subtitle="Marcas, anunciantes e agências — a lista de onde as colunas dos quadros puxam cliente, segmento e contato."
        hints={[
          { icon: Building2, text: `${marcas.length} marcas cadastradas` },
          { icon: ListChecks, text: `${pendentes} aguardando curadoria` },
          { icon: Handshake, text: 'Agências ainda por definir' },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col bg-[#f4f6fa] p-6">
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <div className="max-w-md px-8 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100">
              <Building2 className="size-6 text-slate-400" />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Esta página ainda não tem colunas
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              As {marcas.length} marcas já existem como dado e alimentam as colunas Marca, Segmento,
              Categoria e Contato do Backlog. O que falta é decidir a estrutura desta tela — em
              especial como representar <strong>agências</strong>, já que uma demanda pode chegar
              direto da marca ou por quem a representa.
            </p>
            {pendentes > 0 && (
              <p className="mt-3 text-xs text-amber-600">
                {pendentes} {pendentes === 1 ? 'marca entrou' : 'marcas entraram'} por um quadro e
                {pendentes === 1 ? ' espera' : ' esperam'} curadoria.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
