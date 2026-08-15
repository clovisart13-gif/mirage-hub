import { useState } from "react";

export default function ExclusaoDeDados() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Abre e-mail pré-preenchido como mecanismo simples e confiável
    const assunto = encodeURIComponent(`Solicitação de Exclusão de Dados — ${nome}`);
    const corpo = encodeURIComponent(
      `Olá,\n\nSolicito a exclusão de todos os meus dados pessoais da plataforma Mirage Hub.\n\nNome: ${nome}\nE-mail cadastrado: ${email}\n\nAtenciosamente,\n${nome}`
    );
    window.location.href = `mailto:privacidade@r2pb.com.br?subject=${assunto}&body=${corpo}`;
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <img src="/logo.svg" alt="Mirage Hub" className="h-8 mb-6" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exclusão de Dados</h1>
          <p className="text-sm text-gray-500">Direito garantido pela LGPD (Lei nº 13.709/2018)</p>
        </div>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            Você pode solicitar a exclusão completa dos seus dados pessoais armazenados pelo
            <strong> Mirage Hub</strong>. Ao confirmar a solicitação, processaremos o pedido em até
            <strong> 15 dias úteis</strong>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-semibold text-amber-800 mb-2">O que será excluído</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
              <li>Conta de usuário e dados de perfil</li>
              <li>Histórico de ações na plataforma</li>
              <li>Tokens de acesso a redes sociais (Meta/Instagram)</li>
              <li>Conteúdos enviados à comunidade Moda Conecta</li>
              <li>Dados de assinatura (após regularização financeira)</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h2 className="font-semibold text-blue-800 mb-2">O que pode ser retido</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
              <li>Registros fiscais e financeiros (exigência legal por 5 anos)</li>
              <li>Logs de segurança anonimizados</li>
            </ul>
          </div>

          {!enviado ? (
            <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Solicitar exclusão</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome Sobrenome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cadastrado na plataforma</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                Solicitar exclusão dos meus dados
              </button>
              <p className="text-xs text-gray-500">
                Ao clicar, será aberto seu cliente de e-mail com a solicitação pré-preenchida para envio a{' '}
                <strong>privacidade@r2pb.com.br</strong>.
              </p>
            </form>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">✓</div>
              <h2 className="font-semibold text-green-800 mb-1">Solicitação gerada</h2>
              <p className="text-sm text-green-700">
                Envie o e-mail que foi aberto no seu cliente de e-mail. Processaremos em até 15 dias úteis.
              </p>
              <button onClick={() => setEnviado(false)} className="mt-4 text-xs text-green-600 underline">
                Gerar novamente
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-2">Revogar acesso ao Instagram/Meta</h2>
            <p className="text-sm text-gray-600">
              Para revogar imediatamente o acesso do Mirage Hub à sua conta Meta/Instagram,
              acesse as configurações do Facebook e remova o aplicativo:
            </p>
            <a
              href="https://www.facebook.com/settings?tab=applications"
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 text-sm text-blue-600 underline"
            >
              facebook.com/settings → Aplicativos e sites
            </a>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Dúvidas? Entre em contato: <strong>privacidade@r2pb.com.br</strong>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Mirage Hub · R2PB Soluções Digitais ·{' '}
          <a href="/privacidade" className="underline">Política de Privacidade</a> ·{' '}
          <a href="/termos" className="underline">Termos de Serviço</a>
        </div>
      </div>
    </div>
  );
}
