import { Router, type Request, type Response } from "express";

const router = Router();

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Seja um Parceiro R2PB Confecções</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e8e8e8;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column}
a{color:inherit;text-decoration:none}
header{background:#111;border-bottom:1px solid rgba(41,128,185,.25);padding:16px 24px;display:flex;align-items:center;gap:12px}
.logo{font-size:20px;font-weight:900;color:#2980b9;letter-spacing:.05em}
.logo span{color:#fff}
header p{font-size:13px;color:#888;margin-top:2px}
main{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px 60px}
.card{width:100%;max-width:620px;background:#111;border:1px solid rgba(41,128,185,.2);border-radius:16px;overflow:hidden}
.card-head{background:linear-gradient(135deg,#1a3d5c,#0f2a40);padding:28px 32px}
.card-head h1{font-size:22px;font-weight:800;color:#fff;line-height:1.3}
.card-head p{font-size:14px;color:#7bb8da;margin-top:8px;line-height:1.5}
.card-body{padding:28px 32px;display:flex;flex-direction:column;gap:20px}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#7bb8da}
.field input,.field select,.field textarea{width:100%;padding:11px 14px;background:#1a1a1a;border:1px solid rgba(41,128,185,.3);border-radius:8px;color:#fff;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#3498db}
.field input::placeholder,.field textarea::placeholder{color:#555}
.field select option{background:#1a1a1a}
.field textarea{resize:vertical;min-height:80px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.checks{display:flex;flex-direction:column;gap:8px}
.check-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(41,128,185,.06);border:1px solid rgba(41,128,185,.18);border-radius:8px;cursor:pointer;transition:all .18s}
.check-item:hover{background:rgba(41,128,185,.14)}
.check-item input[type=checkbox]{width:16px;height:16px;accent-color:#2980b9;flex-shrink:0}
.check-item label{font-size:13px;color:#d8e8f5;cursor:pointer}
.sub-field{display:none;margin-top:12px;padding:14px;background:rgba(41,128,185,.06);border-radius:8px;border:1px solid rgba(41,128,185,.15)}
.sub-field.visible{display:block}
.sub-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#7bb8da;margin-bottom:8px}
.sub-checks{display:flex;flex-wrap:wrap;gap:8px}
.tag-check{display:flex;align-items:center;gap:6px;padding:6px 10px;background:#1a1a1a;border:1px solid rgba(41,128,185,.25);border-radius:6px;cursor:pointer;font-size:12px;color:#c0d8ea;transition:all .15s}
.tag-check:hover{border-color:#3498db;color:#fff}
.tag-check input{accent-color:#2980b9;width:13px;height:13px}
.error{color:#e74c3c;font-size:12px;display:none;margin-top:4px}
.btn-submit{width:100%;padding:14px;border-radius:10px;background:#2980b9;color:#fff;font-size:16px;font-weight:700;font-family:inherit;border:none;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.btn-submit:hover:not(:disabled){background:#3498db;transform:translateY(-2px);box-shadow:0 6px 20px rgba(41,128,185,.35)}
.btn-submit:disabled{opacity:.6;cursor:not-allowed}
.success{display:none;text-align:center;padding:40px 32px}
.success-icon{font-size:56px;margin-bottom:16px}
.success h2{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px}
.success p{font-size:14px;color:#7bb8da;line-height:1.6}
footer{text-align:center;padding:20px;font-size:12px;color:#444}
@media(max-width:520px){.card-head,.card-body{padding:20px 18px}.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  <div>
    <div class="logo">R<span>2</span>PB <span style="font-weight:400;font-size:14px;color:#888">Confecções</span></div>
    <p>Banco de Parceiros &amp; Fornecedores</p>
  </div>
</header>

<main>
  <div class="card">
    <div class="card-head">
      <h1>Quero ser parceiro da R2PB</h1>
      <p>Preencha o formulário abaixo. Nossa equipe de suprimentos entrará em contato para avaliar a parceria.</p>
    </div>

    <div class="card-body" id="form-body">
      <!-- Dados pessoais -->
      <div class="field">
        <label>Nome completo *</label>
        <input type="text" id="f-nome" placeholder="Seu nome ou razão social"/>
        <div class="error" id="e-nome">Informe seu nome.</div>
      </div>
      <div class="row">
        <div class="field">
          <label>WhatsApp * (com DDD)</label>
          <input type="tel" id="f-whatsapp" placeholder="(11) 99999-9999"/>
          <div class="error" id="e-whatsapp">Informe um WhatsApp válido.</div>
        </div>
        <div class="field">
          <label>E-mail</label>
          <input type="email" id="f-email" placeholder="seu@email.com"/>
        </div>
      </div>
      <div class="field">
        <label>Empresa / Ateliê</label>
        <input type="text" id="f-empresa" placeholder="Nome da empresa (opcional)"/>
      </div>

      <!-- Área de atuação -->
      <div class="field">
        <label>Áreas de atuação *</label>
        <div class="error" id="e-area">Selecione pelo menos uma área.</div>
        <div class="checks">
          <div class="check-item">
            <input type="checkbox" id="a-producao" value="producao" onchange="toggleSub('sub-costura',this.checked)"/>
            <label for="a-producao">🧵 Produção / Costura</label>
          </div>
          <div class="sub-field" id="sub-costura">
            <div class="sub-label">Especialidade em costura</div>
            <div class="sub-checks">
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="malha"/> Malha</label>
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="plano"/> Plano / Tecido</label>
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="jeans"/> Jeans</label>
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="couro"/> Couro / PU</label>
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="alfaiataria"/> Alfaiataria</label>
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="fitness"/> Fitness</label>
              <label class="tag-check"><input type="checkbox" name="esp-costura" value="moda-praia"/> Moda Praia</label>
            </div>
          </div>

          <div class="check-item">
            <input type="checkbox" id="a-beneficiamento" value="beneficiamento" onchange="toggleSub('sub-benef',this.checked)"/>
            <label for="a-beneficiamento">🖨️ Beneficiamento</label>
          </div>
          <div class="sub-field" id="sub-benef">
            <div class="sub-label">Tipo de beneficiamento</div>
            <div class="sub-checks">
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="sublimacao"/> Sublimação</label>
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="dtf"/> DTF</label>
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="serigrafia"/> Serigrafia</label>
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="bordado"/> Bordado</label>
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="laser"/> Corte a Laser</label>
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="transfer"/> Transfer</label>
              <label class="tag-check"><input type="checkbox" name="esp-benef" value="tingimento"/> Tingimento</label>
            </div>
          </div>

          <div class="check-item">
            <input type="checkbox" id="a-lavanderia" value="lavanderia"/>
            <label for="a-lavanderia">💧 Lavanderia Industrial</label>
          </div>
          <div class="check-item">
            <input type="checkbox" id="a-acabamento" value="acabamento"/>
            <label for="a-acabamento">✂️ Acabamento &amp; Embalagem</label>
          </div>
          <div class="check-item">
            <input type="checkbox" id="a-insumos" value="fornecedor"/>
            <label for="a-insumos">📦 Fornecedor de Insumos (tecido, aviamento, etc)</label>
          </div>
        </div>
      </div>

      <!-- Localização -->
      <div class="row">
        <div class="field">
          <label>Cidade</label>
          <input type="text" id="f-cidade" placeholder="São Paulo"/>
        </div>
        <div class="field">
          <label>Estado</label>
          <select id="f-estado">
            <option value="">Selecione</option>
            <option>SP</option><option>RJ</option><option>MG</option><option>PR</option>
            <option>SC</option><option>RS</option><option>BA</option><option>CE</option>
            <option>PE</option><option>GO</option><option>DF</option><option>ES</option>
            <option>AM</option><option>PA</option><option>MT</option><option>MS</option>
            <option>Outro</option>
          </select>
        </div>
      </div>

      <!-- Capacidade -->
      <div class="field">
        <label>Capacidade produtiva</label>
        <select id="f-capacidade">
          <option value="">Não sei / Prefiro não informar</option>
          <option value="ate100">Até 100 peças/mês</option>
          <option value="100-500">100 a 500 peças/mês</option>
          <option value="500-2000">500 a 2.000 peças/mês</option>
          <option value="2000-10000">2.000 a 10.000 peças/mês</option>
          <option value="acima10000">Acima de 10.000 peças/mês</option>
        </select>
      </div>

      <!-- Observação -->
      <div class="field">
        <label>Observações (opcional)</label>
        <textarea id="f-obs" placeholder="Diferenciais, equipamentos, portfólio, site..."></textarea>
      </div>

      <button class="btn-submit" id="btn-enviar" onclick="enviar()">
        Enviar cadastro
      </button>
    </div>

    <div class="success" id="success">
      <div class="success-icon">✅</div>
      <h2>Cadastro recebido!</h2>
      <p>Nossa equipe de suprimentos vai analisar o seu perfil e entrar em contato pelo WhatsApp em breve.<br/><br/>Obrigado pelo interesse em ser parceiro da R2PB!</p>
    </div>
  </div>
</main>

<footer>R2PB Confecções &mdash; Parceria e Fornecedores</footer>

<script>
function toggleSub(id, show){
  document.getElementById(id).classList.toggle('visible', show);
}

function getChecked(name){
  return Array.from(document.querySelectorAll('input[name="'+name+'"]:checked')).map(function(el){return el.value;});
}

function getAreas(){
  var ids=['a-producao','a-beneficiamento','a-lavanderia','a-acabamento','a-insumos'];
  return ids.filter(function(id){return document.getElementById(id).checked;})
            .map(function(id){return document.getElementById(id).value;});
}

function validPhone(p){var d=p.replace(/\\D/g,'');return d.length>=10&&d.length<=11;}

async function enviar(){
  var nome    = document.getElementById('f-nome').value.trim();
  var whatsapp= document.getElementById('f-whatsapp').value.trim();
  var email   = document.getElementById('f-email').value.trim();
  var empresa = document.getElementById('f-empresa').value.trim();
  var cidade  = document.getElementById('f-cidade').value.trim();
  var estado  = document.getElementById('f-estado').value;
  var cap     = document.getElementById('f-capacidade').value;
  var obs     = document.getElementById('f-obs').value.trim();
  var areas   = getAreas();
  var espCostura = getChecked('esp-costura');
  var espBenef   = getChecked('esp-benef');

  // Validação
  var ok = true;
  document.querySelectorAll('.error').forEach(function(e){e.style.display='none';});
  if(!nome){ document.getElementById('e-nome').style.display='block'; ok=false; }
  if(!validPhone(whatsapp)){ document.getElementById('e-whatsapp').style.display='block'; ok=false; }
  if(!areas.length){ document.getElementById('e-area').style.display='block'; ok=false; }
  if(!ok) return;

  var btn = document.getElementById('btn-enviar');
  btn.disabled=true; btn.textContent='Enviando...';

  try {
    var resp = await fetch('/api/public/r2pb/fornecedores', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        nome, whatsapp, email, empresa,
        areas_atuacao: areas,
        especialidade_costura: espCostura,
        especialidade_beneficiamento: espBenef,
        capacidade_produtiva: cap,
        cidade, estado, obs
      })
    });
    if(resp.ok){
      document.getElementById('form-body').style.display='none';
      document.getElementById('success').style.display='block';
    } else {
      throw new Error('Erro ' + resp.status);
    }
  } catch(e) {
    btn.disabled=false; btn.textContent='Enviar cadastro';
    alert('Erro ao enviar. Tente novamente.');
  }
}
</script>
</body>
</html>`;

// GET /api/public/r2pb/fornecedores-form  — página pública de cadastro
router.get("/public/r2pb/fornecedores-form", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML);
});

export default router;
