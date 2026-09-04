import { Router } from "express";
import { logger } from "../lib/logger";

const HTML_STYLE = `
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#374151;background:#fff;margin:0;padding:0}
  .c{max-width:720px;margin:0 auto;padding:64px 24px}
  h1{font-size:2rem;font-weight:700;color:#111827;margin-bottom:4px}
  h2{font-size:1.1rem;font-weight:600;color:#111827;margin:32px 0 8px}
  p,li{line-height:1.7;margin:8px 0}
  ul{padding-left:24px}
  .sub{color:#6b7280;font-size:.875rem;margin-bottom:40px}
  .warn{background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px 24px;margin:24px 0}
  .info{background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:20px 24px;margin:24px 0}
  .warn h2,.info h2{margin-top:0}
  .warn h2{color:#92400e}.info h2{color:#1e40af}
  .warn li{color:#b45309;font-size:.9rem}.info li{color:#1d4ed8;font-size:.9rem}
  a{color:#2563eb}
  .foot{margin-top:64px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;font-size:.75rem;color:#9ca3af}
`;

// ─── Páginas públicas HTML — montadas em app.ts FORA de /api ─────────────────
export const publicPagesRouter = Router();

publicPagesRouter.get("/exclusao", (_req, res) => {
  res.status(200).type("text/html").send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Exclusão de Dados — Mirage Hub</title><style>${HTML_STYLE}</style></head>
<body><div class="c">
  <h1>Exclusão de Dados</h1>
  <p class="sub">Direito garantido pela LGPD (Lei nº 13.709/2018)</p>
  <p>Você pode solicitar a exclusão completa dos seus dados pessoais armazenados pelo <strong>Mirage Hub</strong>. Processaremos o pedido em até <strong>15 dias úteis</strong>.</p>
  <div class="warn">
    <h2>O que será excluído</h2>
    <ul>
      <li>Conta de usuário e dados de perfil</li>
      <li>Histórico de ações na plataforma</li>
      <li>Tokens de acesso a redes sociais (Meta/Instagram)</li>
      <li>Conteúdos enviados à comunidade Moda Conecta</li>
      <li>Dados de assinatura (após regularização financeira)</li>
    </ul>
  </div>
  <div class="info">
    <h2>O que pode ser retido</h2>
    <ul>
      <li>Registros fiscais e financeiros (exigência legal por 5 anos)</li>
      <li>Logs de segurança anonimizados</li>
    </ul>
  </div>
  <h2>Como solicitar a exclusão</h2>
  <p>Envie um e-mail para <strong>privacidade@r2pb.com.br</strong> com o assunto <em>"Solicitação de Exclusão de Dados"</em> informando seu nome completo e e-mail cadastrado. Responderemos em até 15 dias úteis.</p>
  <h2>Revogar acesso ao Instagram / Meta</h2>
  <p>Acesse <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noreferrer">facebook.com/settings → Aplicativos e sites</a> e remova o Mirage Hub.</p>
  <h2>Contato</h2>
  <p>E-mail: <strong>privacidade@r2pb.com.br</strong> · Site: <strong>www.gestaomirage.com.br</strong></p>
  <div class="foot">© 2025 Mirage Hub · R2PB Soluções Digitais ·
    <a href="/politica-de-privacidade">Política de Privacidade</a> ·
    <a href="/termos">Termos de Serviço</a>
  </div>
</div></body></html>`);
});

publicPagesRouter.get("/politica-de-privacidade", (_req, res) => {
  res.status(200).type("text/html").send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Política de Privacidade — Mirage Hub</title><style>${HTML_STYLE}</style></head>
<body><div class="c">
  <h1>Política de Privacidade</h1>
  <p class="sub">Última atualização: maio de 2025</p>
  <h2>1. Quem somos</h2>
  <p>O <strong>Mirage Hub</strong> é uma plataforma SaaS para o mercado têxtil e de confecção brasileiro, desenvolvida pela <strong>R2PB Soluções Digitais</strong>.</p>
  <p>Site: <strong>www.gestaomirage.com.br</strong> · Contato: <strong>privacidade@r2pb.com.br</strong></p>
  <h2>2. Dados que coletamos</h2>
  <ul>
    <li><strong>Dados de conta:</strong> nome, e-mail, telefone, CNPJ/CPF.</li>
    <li><strong>Dados de uso:</strong> ações na plataforma, páginas visitadas.</li>
    <li><strong>Integração Meta/Instagram:</strong> tokens de acesso, métricas e perfil público, conforme autorizado pelo usuário.</li>
    <li><strong>Dados financeiros:</strong> assinatura via gateway certificado (não armazenamos dados de cartão).</li>
  </ul>
  <h2>3. Como usamos os dados</h2>
  <ul>
    <li>Fornecer e melhorar os serviços da plataforma.</li>
    <li>Gerar relatórios de marketing para usuários conectados ao Instagram/Meta.</li>
    <li>Cumprir obrigações legais e prevenir fraudes.</li>
  </ul>
  <p>Não vendemos nem compartilhamos dados pessoais para fins publicitários.</p>
  <h2>4. Integração com Meta / Instagram</h2>
  <ul>
    <li>Solicitamos apenas as permissões necessárias para as funcionalidades ativadas.</li>
    <li>Tokens de acesso armazenados de forma segura e criptografada.</li>
    <li>Você pode revogar o acesso em <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noreferrer">facebook.com/settings</a> a qualquer momento.</li>
    <li>Não utilizamos dados do Instagram para fins além dos solicitados pelo usuário.</li>
  </ul>
  <h2>5. Seus direitos (LGPD)</h2>
  <ul>
    <li>Acesso, correção, portabilidade e exclusão dos seus dados.</li>
    <li>Revogação de consentimentos.</li>
  </ul>
  <p>Para exercer seus direitos: <strong>privacidade@r2pb.com.br</strong></p>
  <h2>6. Retenção e exclusão</h2>
  <p>Dados excluídos em até 90 dias após encerramento da conta. Solicitação imediata: <a href="/exclusao">/exclusao</a></p>
  <h2>7. Contato</h2>
  <p><strong>R2PB Soluções Digitais</strong> · E-mail: <strong>privacidade@r2pb.com.br</strong></p>
  <div class="foot">© 2025 Mirage Hub · R2PB Soluções Digitais ·
    <a href="/termos">Termos de Serviço</a> ·
    <a href="/exclusao">Exclusão de Dados</a>
  </div>
</div></body></html>`);
});

publicPagesRouter.get("/termos", (_req, res) => {
  res.status(200).type("text/html").send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Termos de Serviço — Mirage Hub</title><style>${HTML_STYLE}</style></head>
<body><div class="c">
  <h1>Termos de Serviço</h1>
  <p class="sub">Última atualização: maio de 2025</p>
  <h2>1. Aceitação</h2>
  <p>Ao utilizar o <strong>Mirage Hub</strong>, você concorda com estes Termos. Operado pela <strong>R2PB Soluções Digitais</strong>.</p>
  <h2>2. Serviço</h2>
  <p>Plataforma SaaS para gestão de produção, custos, PLM, relatórios, comunidade B2B e marketing digital com integração ao Instagram/Meta.</p>
  <h2>3. Uso Aceitável</h2>
  <p>É proibido usar para atividades ilegais, spam, acesso não autorizado a dados de terceiros ou revenda sem autorização.</p>
  <h2>4. Integração Meta / Instagram</h2>
  <ul>
    <li>Ao conectar sua conta, você autoriza o Mirage Hub a publicar e analisar conteúdo em seu nome conforme permissões concedidas.</li>
    <li>A revogação pode ser feita em <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noreferrer">facebook.com/settings</a>.</li>
    <li>O Mirage Hub não armazena senhas de contas Meta/Instagram.</li>
  </ul>
  <h2>5. Assinatura</h2>
  <p>Cobranças conforme ciclo escolhido. Cancelamento a qualquer momento; acesso permanece até fim do período pago.</p>
  <h2>6. Limitação de Responsabilidade</h2>
  <p>Plataforma fornecida "como está". Não nos responsabilizamos por falhas de terceiros, incluindo APIs da Meta.</p>
  <h2>7. Lei Aplicável</h2>
  <p>Legislação brasileira. Foro: São Paulo/SP.</p>
  <h2>8. Contato</h2>
  <p><strong>R2PB Soluções Digitais</strong> · E-mail: <strong>suporte@r2pb.com.br</strong> · Site: <strong>www.gestaomirage.com.br</strong></p>
  <div class="foot">© 2025 Mirage Hub · R2PB Soluções Digitais ·
    <a href="/politica-de-privacidade">Política de Privacidade</a> ·
    <a href="/exclusao">Exclusão de Dados</a>
  </div>
</div></body></html>`);
});

// ─── Endpoint API — montado em /api via routes/index.ts ──────────────────────
// Acessível em POST /api/meta/data-deletion
const router = Router();

router.post("/meta/data-deletion", (req, res) => {
  const signed_request = req.body?.signed_request ?? null;
  logger.info({ signed_request: signed_request ? "[presente]" : "[ausente]" }, "Meta data-deletion callback recebido");

  const confirmation_code = `MIRAGE-DEL-${Date.now()}`;
  const url = `https://www.gestaomirage.com.br/exclusao?code=${confirmation_code}`;

  res.status(200).json({ url, confirmation_code });
});

export default router;
