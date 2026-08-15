export default function Privacidade() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <img src="/logo.svg" alt="Mirage Hub" className="h-8 mb-6" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
          <p className="text-sm text-gray-500">Última atualização: junho de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Quem somos</h2>
            <p>
              O <strong>Mirage Hub</strong> é uma plataforma SaaS voltada ao mercado têxtil e de confecção brasileiro,
              desenvolvida pela <strong>Mirage Gestão & Tecnologia Ltda</strong> (CNPJ 67.660.591/0001-02), com sede em São Paulo/SP. Oferecemos ferramentas de gestão de produção,
              custos, vendas, marketing digital e comunidade B2B para confecções e fornecedores do setor.
            </p>
            <p>Nosso site institucional e aplicativo estão disponíveis em: <strong>www.gestaomirage.com.br</strong></p>
            <p>Contato do responsável pelo tratamento de dados: <strong>privacidade@r2pb.com.br</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Dados que coletamos</h2>
            <p>Coletamos apenas os dados necessários para prestar os serviços da plataforma:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Dados de conta:</strong> nome, e-mail, telefone, CNPJ/CPF, dados da empresa.</li>
              <li><strong>Dados de uso:</strong> ações realizadas na plataforma, páginas visitadas, preferências.</li>
              <li><strong>Dados de integração com redes sociais:</strong> quando o usuário conecta conta do Instagram/Meta para uso do módulo de marketing, coletamos tokens de acesso, métricas de publicações e informações de perfil público, conforme autorizado pelo usuário.</li>
              <li><strong>Dados financeiros:</strong> informações de assinatura e pagamento, processados por gateway certificado (não armazenamos dados de cartão).</li>
              <li><strong>Comunicações:</strong> mensagens enviadas ao suporte e conteúdo compartilhado na comunidade.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Como usamos os dados</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer, operar e melhorar os serviços da plataforma.</li>
              <li>Gerenciar contas, assinaturas e comunicações.</li>
              <li>Gerar relatórios e insights de marketing para os usuários conectados ao Instagram/Meta.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
              <li>Prevenir fraudes e garantir segurança.</li>
            </ul>
            <p className="mt-3">
              Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins publicitários.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Integração com Meta / Instagram</h2>
            <p>
              O módulo de marketing do Mirage Hub pode se integrar com a <strong>Meta Graph API</strong> e o
              <strong> Instagram Business API</strong> para publicação de conteúdo e análise de desempenho.
              Ao conectar sua conta:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Solicitamos apenas as permissões necessárias para as funcionalidades ativadas.</li>
              <li>Os tokens de acesso são armazenados de forma segura e criptografada.</li>
              <li>Você pode revogar o acesso a qualquer momento nas configurações da plataforma ou diretamente no seu painel da Meta em <a href="https://www.facebook.com/settings?tab=applications" className="text-blue-600 underline" target="_blank" rel="noreferrer">facebook.com/settings</a>.</li>
              <li>Não utilizamos os dados do Instagram para fins que não sejam os solicitados pelo próprio usuário dentro da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Compartilhamento de dados</h2>
            <p>Podemos compartilhar dados com:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Provedores de infraestrutura:</strong> serviços de hospedagem, banco de dados e armazenamento em nuvem.</li>
              <li><strong>APIs de terceiros:</strong> Meta, Instagram, gateways de pagamento — conforme autorizado pelo usuário.</li>
              <li><strong>Autoridades legais:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Seus direitos (LGPD)</h2>
            <p>Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar seus dados pessoais.</li>
              <li>Corrigir dados incompletos ou desatualizados.</li>
              <li>Solicitar anonimização, bloqueio ou eliminação dos seus dados.</li>
              <li>Solicitar a portabilidade dos dados.</li>
              <li>Revogar consentimentos concedidos.</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, envie solicitação para: <strong>privacidade@r2pb.com.br</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Retenção e exclusão de dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para prestação dos serviços ou cumprimento de obrigações legais.
              Ao encerrar sua conta, seus dados são anonimizados ou excluídos em até 90 dias, salvo exigência legal em contrário.
              Para solicitação imediata de exclusão, acesse: <a href="/exclusao-de-dados" className="text-blue-600 underline">/exclusao-de-dados</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para autenticação e funcionamento da plataforma.
              Não utilizamos cookies de rastreamento para publicidade de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado,
              alteração, divulgação ou destruição, incluindo criptografia em trânsito (TLS) e em repouso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contato</h2>
            <p>
              Dúvidas sobre esta política:<br />
              <strong>R2PB Soluções Digitais</strong><br />
              E-mail: <strong>privacidade@r2pb.com.br</strong><br />
              Site: <strong>www.gestaomirage.com.br</strong>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Mirage Hub · R2PB Soluções Digitais ·{' '}
          <a href="/termos" className="underline">Termos de Serviço</a> ·{' '}
          <a href="/exclusao-de-dados" className="underline">Exclusão de Dados</a>
        </div>
      </div>
    </div>
  );
}
