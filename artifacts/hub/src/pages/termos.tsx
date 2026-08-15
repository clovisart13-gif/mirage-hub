export default function Termos() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <img src="/logo.svg" alt="Mirage Hub" className="h-8 mb-6" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Serviço</h1>
          <p className="text-sm text-gray-500">Última atualização: junho de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta ou utilizar o <strong>Mirage Hub</strong>, você concorda com estes Termos de Serviço.
              Caso não concorde, não utilize a plataforma. O Mirage Hub é operado pela <strong>Mirage Gestão & Tecnologia Ltda</strong>, CNPJ 67.660.591/0001-02, com sede em São Paulo/SP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p>
              O Mirage Hub é uma plataforma SaaS multitenant destinada ao mercado têxtil e de confecção brasileiro.
              Oferece módulos de gestão de produção (Kanban), custos e orçamentos, PLM (Product Lifecycle Management),
              relatórios, comunidade B2B (Moda Conecta), CRM e marketing digital com integração ao Instagram/Meta.
            </p>
            <p className="mt-2">
              O acesso aos módulos é condicionado ao plano de assinatura contratado. Funcionalidades podem ser
              adicionadas, modificadas ou descontinuadas mediante aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Contas e Responsabilidades</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Cada conta é de uso pessoal ou da empresa contratante (tenant). Não é permitido compartilhar acessos entre empresas diferentes.</li>
              <li>Você é responsável por todo o conteúdo inserido na plataforma.</li>
              <li>Menores de 18 anos devem ter autorização de responsável legal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Uso Aceitável</h2>
            <p>É proibido utilizar o Mirage Hub para:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Atividades ilegais ou que violem direitos de terceiros.</li>
              <li>Envio de spam, conteúdo malicioso ou enganoso.</li>
              <li>Tentativas de acesso não autorizado a sistemas ou dados de outros usuários.</li>
              <li>Revenda ou sublicenciamento da plataforma sem autorização expressa.</li>
              <li>Uso automatizado abusivo (scraping, bots) sem acordo prévio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Integração com Meta / Instagram</h2>
            <p>
              O módulo de marketing permite integração com a Meta Graph API e o Instagram Business API.
              Ao conectar sua conta Meta/Instagram ao Mirage Hub:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Você autoriza o Mirage Hub a acessar, publicar e analisar conteúdo em seu nome, conforme as permissões concedidas.</li>
              <li>Você é responsável por garantir que o conteúdo publicado está em conformidade com as políticas da Meta e da legislação aplicável.</li>
              <li>A revogação da integração pode ser feita a qualquer momento nas configurações da plataforma ou em <a href="https://www.facebook.com/settings?tab=applications" className="text-blue-600 underline" target="_blank" rel="noreferrer">facebook.com/settings</a>.</li>
              <li>O Mirage Hub não armazena senhas de contas Meta/Instagram.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Assinatura e Pagamento</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Os planos são cobrados conforme o ciclo escolhido (mensal ou anual).</li>
              <li>Pagamentos são processados por gateway certificado. O Mirage Hub não armazena dados de cartão.</li>
              <li>O cancelamento pode ser feito a qualquer momento. O acesso permanece até o fim do período pago.</li>
              <li>Não há reembolso por períodos parcialmente utilizados, salvo disposição legal em contrário.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todo o código-fonte, design, marca e conteúdo do Mirage Hub são de propriedade da R2PB Soluções Digitais.
              Os dados inseridos pelos usuários permanecem de propriedade do respectivo tenant.
              Concedemos ao usuário licença limitada, não exclusiva e intransferível para uso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitação de Responsabilidade</h2>
            <p>
              O Mirage Hub é fornecido "como está". Não garantimos disponibilidade ininterrupta,
              embora nos esforcemos para manter uptime elevado. Não nos responsabilizamos por
              perdas indiretas, perda de dados decorrente de uso indevido ou falhas de terceiros
              (incluindo APIs da Meta).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar contas que violem estes termos, com ou sem aviso prévio em casos graves.
              O usuário pode encerrar sua conta a qualquer momento via configurações ou pelo e-mail de suporte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por e-mail ou
              notificação na plataforma com antecedência mínima de 15 dias. O uso continuado após a vigência das
              alterações constitui aceitação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de São Paulo/SP
              para resolução de conflitos, salvo disposição legal em contrário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contato</h2>
            <p>
              <strong>R2PB Soluções Digitais</strong><br />
              E-mail: <strong>suporte@r2pb.com.br</strong><br />
              Site: <strong>www.gestaomirage.com.br</strong>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Mirage Hub · R2PB Soluções Digitais ·{' '}
          <a href="/privacidade" className="underline">Política de Privacidade</a> ·{' '}
          <a href="/exclusao-de-dados" className="underline">Exclusão de Dados</a>
        </div>
      </div>
    </div>
  );
}
