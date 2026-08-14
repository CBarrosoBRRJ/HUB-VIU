import { useState } from 'react';
import { AtSign, Mail, Settings, ShieldCheck, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { AbaConfig, Tabs } from '../components/ui/Tabs';
import { AbaPessoas } from '../components/usuarios/AbaPessoas';
import { AbaAcessos } from '../components/usuarios/AbaAcessos';
import { AbaConvites } from '../components/usuarios/AbaConvites';
import { AbaConfiguracoes } from '../components/usuarios/AbaConfiguracoes';
import { useDados } from '../context/DadosProvider';
import { statusConvite } from '../utils/convites';
import { podeGerenciarAcessos, podeGerenciarDominios } from '../utils/permissoes';

type AbaId = 'pessoas' | 'acessos' | 'convites' | 'config';

export function Usuarios() {
  const { usuarios, solicitacoes, convites, sessao } = useDados();
  const [aba, setAba] = useState<AbaId>('pessoas');

  const pendentes = solicitacoes.filter((solicitacao) => solicitacao.status === 'pendente').length;
  const abertos = convites.filter((convite) => statusConvite(convite) === 'pendente').length;

  // A aba de Acessos é a mais sensível: depende de capacidade própria, não do perfil.
  const abas: AbaConfig<AbaId>[] = [
    { id: 'pessoas', label: 'Pessoas', icon: Users, contador: usuarios.length },
    ...(podeGerenciarAcessos(sessao)
      ? [{ id: 'acessos' as const, label: 'Acessos', icon: ShieldCheck }]
      : []),
    {
      id: 'convites',
      label: 'Convites e pedidos',
      icon: Mail,
      contador: pendentes + abertos,
      alerta: pendentes > 0,
    },
    ...(podeGerenciarDominios(sessao)
      ? [{ id: 'config' as const, label: 'Configurações', icon: Settings }]
      : []),
  ];

  const ativa = abas.some((item) => item.id === aba) ? aba : 'pessoas';

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Usuários"
        subtitle="Base de pessoas da plataforma, seus acessos e os convites em aberto."
        hints={[
          { icon: ShieldCheck, text: 'O perfil define o que a pessoa pode fazer' },
          { icon: Users, text: 'A equipe define onde ela pode fazer' },
          { icon: AtSign, text: 'O e-mail é a identidade: uma pessoa, uma conta' },
        ]}
      />

      <Tabs<AbaId> abas={abas} ativa={ativa} onChange={setAba} />

      <main className="flex-1 overflow-auto bg-[#f4f6fa] p-6 custom-scrollbar">
        {ativa === 'pessoas' && <AbaPessoas />}
        {ativa === 'acessos' && <AbaAcessos />}
        {ativa === 'convites' && <AbaConvites />}
        {ativa === 'config' && <AbaConfiguracoes />}
      </main>
    </div>
  );
}
