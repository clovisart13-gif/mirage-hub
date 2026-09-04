-- =====================================================
-- MIRAGE — Seed de Dados de Demonstração
-- Tenant: R2PB Confecções (cliente piloto da Mirage)
-- ID: 4a21771a-2f34-4506-8bb2-176b94731387
-- =====================================================

do $$
declare
  tid uuid := '4a21771a-2f34-4506-8bb2-176b94731387';

  -- Cores
  cor_preto uuid; cor_branco uuid; cor_marinho uuid;
  cor_cinza uuid; cor_rosa uuid; cor_verde uuid;

  -- Grades
  grade_pp_gg uuid; grade_36_44 uuid;

  -- Famílias
  fam_feminino uuid; fam_masculino uuid; fam_fitness uuid;

  -- Fornecedores
  forn_costura uuid; forn_bordado uuid; forn_lavanderia uuid;
  forn_tecido uuid; forn_acabamento uuid;

  -- Clientes
  cli_lojas_sol uuid; cli_modas_bela uuid; cli_atacado uuid;

  -- Referências
  ref_blusa uuid; ref_calca uuid; ref_vestido uuid;
  ref_shorts uuid; ref_conjunto uuid; ref_top uuid;

begin

-- ─── CORES ───────────────────────────────────────────────────
insert into public.cores (id, tenant_id, nome, hex) values
  (gen_random_uuid(), tid, 'Preto', '#000000'),
  (gen_random_uuid(), tid, 'Branco', '#FFFFFF'),
  (gen_random_uuid(), tid, 'Marinho', '#1E3A5F'),
  (gen_random_uuid(), tid, 'Cinza Mescla', '#9E9E9E'),
  (gen_random_uuid(), tid, 'Rosa Bebê', '#F8BBD9'),
  (gen_random_uuid(), tid, 'Verde Militar', '#4A5E3A')
on conflict (tenant_id, nome) do nothing;

select id into cor_preto from public.cores where tenant_id = tid and nome = 'Preto';
select id into cor_branco from public.cores where tenant_id = tid and nome = 'Branco';
select id into cor_marinho from public.cores where tenant_id = tid and nome = 'Marinho';
select id into cor_cinza from public.cores where tenant_id = tid and nome = 'Cinza Mescla';
select id into cor_rosa from public.cores where tenant_id = tid and nome = 'Rosa Bebê';
select id into cor_verde from public.cores where tenant_id = tid and nome = 'Verde Militar';

-- ─── GRADES ───────────────────────────────────────────────────
insert into public.grades (id, tenant_id, nome, tamanhos) values
  (gen_random_uuid(), tid, 'PP ao GG', array['PP','P','M','G','GG']),
  (gen_random_uuid(), tid, '36 ao 44', array['36','38','40','42','44'])
on conflict (tenant_id, nome) do nothing;

select id into grade_pp_gg from public.grades where tenant_id = tid and nome = 'PP ao GG';
select id into grade_36_44 from public.grades where tenant_id = tid and nome = '36 ao 44';

-- ─── FAMÍLIAS ─────────────────────────────────────────────────
insert into public.familias_produto (id, tenant_id, nome, descricao) values
  (gen_random_uuid(), tid, 'Feminino', 'Linha feminina adulto'),
  (gen_random_uuid(), tid, 'Masculino', 'Linha masculina adulto'),
  (gen_random_uuid(), tid, 'Fitness', 'Linha fitness e esportiva');

select id into fam_feminino from public.familias_produto where tenant_id = tid and nome = 'Feminino';
select id into fam_masculino from public.familias_produto where tenant_id = tid and nome = 'Masculino';
select id into fam_fitness from public.familias_produto where tenant_id = tid and nome = 'Fitness';

-- ─── FORNECEDORES ─────────────────────────────────────────────
insert into public.fornecedores (id, tenant_id, nome, cnpj, pix, telefone) values
  (gen_random_uuid(), tid, 'Ateliê Costa Costura', '12.345.678/0001-01', '12345678000101', '(11) 98001-1001'),
  (gen_random_uuid(), tid, 'Bordados Elegance', '23.456.789/0001-02', '23456789000102', '(11) 98002-2002'),
  (gen_random_uuid(), tid, 'Lavanderia TopWash', '34.567.890/0001-03', '34567890000103', '(11) 98003-3003'),
  (gen_random_uuid(), tid, 'Tecidos & Cia', '45.678.901/0001-04', '45678901000104', '(11) 98004-4004'),
  (gen_random_uuid(), tid, 'Acabamento Fino', '56.789.012/0001-05', '56789012000105', '(11) 98005-5005');

select id into forn_costura    from public.fornecedores where tenant_id = tid and nome = 'Ateliê Costa Costura';
select id into forn_bordado    from public.fornecedores where tenant_id = tid and nome = 'Bordados Elegance';
select id into forn_lavanderia from public.fornecedores where tenant_id = tid and nome = 'Lavanderia TopWash';
select id into forn_tecido     from public.fornecedores where tenant_id = tid and nome = 'Tecidos & Cia';
select id into forn_acabamento from public.fornecedores where tenant_id = tid and nome = 'Acabamento Fino';

-- ─── CLIENTES ─────────────────────────────────────────────────
insert into public.clientes (id, tenant_id, nome, cnpj, email, telefone, cidade, estado) values
  (gen_random_uuid(), tid, 'Lojas Sol Nascente', '67.890.123/0001-06', 'compras@lojassol.com.br', '(11) 3001-1000', 'São Paulo', 'SP'),
  (gen_random_uuid(), tid, 'Modas Bella Donna', '78.901.234/0001-07', 'pedidos@belladonna.com.br', '(21) 3002-2000', 'Rio de Janeiro', 'RJ'),
  (gen_random_uuid(), tid, 'Atacado Veste Bem', '89.012.345/0001-08', 'atacado@vestebem.com.br', '(31) 3003-3000', 'Belo Horizonte', 'MG');

select id into cli_lojas_sol  from public.clientes where tenant_id = tid and nome = 'Lojas Sol Nascente';
select id into cli_modas_bela from public.clientes where tenant_id = tid and nome = 'Modas Bella Donna';
select id into cli_atacado    from public.clientes where tenant_id = tid and nome = 'Atacado Veste Bem';

-- ─── REFERÊNCIAS (OPs no Kanban) ─────────────────────────────
insert into public.referencias (id, tenant_id, codigo, descricao, cliente_id, familia_id, fase_atual, quantidade_total, valor_venda, data_entrada, data_prevista_entrega) values
  (gen_random_uuid(), tid, 'OP-2024-001', 'Blusa Social Manga Longa', cli_lojas_sol, fam_feminino, 'costura', 250, 89.90, '2024-04-01', '2024-04-28'),
  (gen_random_uuid(), tid, 'OP-2024-002', 'Calça Alfaiataria Slim', cli_lojas_sol, fam_feminino, 'acabamento', 180, 149.90, '2024-04-03', '2024-04-30'),
  (gen_random_uuid(), tid, 'OP-2024-003', 'Vestido Midi Estampado', cli_modas_bela, fam_feminino, 'lavanderia', 120, 189.90, '2024-04-05', '2024-05-05'),
  (gen_random_uuid(), tid, 'OP-2024-004', 'Shorts Cargo Masculino', cli_atacado, fam_masculino, 'corte', 300, 79.90, '2024-04-08', '2024-05-08'),
  (gen_random_uuid(), tid, 'OP-2024-005', 'Conjunto Fitness Legging', cli_modas_bela, fam_fitness, 'modelagem', 200, 129.90, '2024-04-10', '2024-05-10'),
  (gen_random_uuid(), tid, 'OP-2024-006', 'Top Fitness Nadador', cli_atacado, fam_fitness, 'inicio', 400, 59.90, '2024-04-12', '2024-05-15'),
  (gen_random_uuid(), tid, 'OP-2024-007', 'Jaqueta Jeans Destroyed', cli_lojas_sol, fam_feminino, 'expedicao', 80, 219.90, '2024-03-20', '2024-04-20'),
  (gen_random_uuid(), tid, 'OP-2024-008', 'Camisa Social Masculina', cli_atacado, fam_masculino, 'passadoria', 160, 99.90, '2024-03-25', '2024-04-22'),
  (gen_random_uuid(), tid, 'OP-2024-009', 'Saia Midi Plissada', cli_modas_bela, fam_feminino, 'beneficiamento', 140, 139.90, '2024-04-02', '2024-04-29'),
  (gen_random_uuid(), tid, 'OP-2024-010', 'Bermuda Moletom Masculina', cli_atacado, fam_masculino, 'concluido', 350, 69.90, '2024-03-15', '2024-04-15');

select id into ref_blusa    from public.referencias where tenant_id = tid and codigo = 'OP-2024-001';
select id into ref_calca    from public.referencias where tenant_id = tid and codigo = 'OP-2024-002';
select id into ref_vestido  from public.referencias where tenant_id = tid and codigo = 'OP-2024-003';
select id into ref_shorts   from public.referencias where tenant_id = tid and codigo = 'OP-2024-004';
select id into ref_conjunto from public.referencias where tenant_id = tid and codigo = 'OP-2024-005';
select id into ref_top      from public.referencias where tenant_id = tid and codigo = 'OP-2024-006';

-- ─── MOVIMENTAÇÕES ────────────────────────────────────────────
insert into public.movimentacoes (tenant_id, referencia_id, fase_origem, fase_destino, fornecedor_id, cmo, data_prevista, quantidade) values
  (tid, ref_blusa,   'inicio',    'modelagem',     null,           null,   '2024-04-03', 250),
  (tid, ref_blusa,   'modelagem', 'tecido',         forn_tecido,   null,   '2024-04-08', 250),
  (tid, ref_blusa,   'tecido',    'corte',          null,           null,   '2024-04-12', 250),
  (tid, ref_blusa,   'corte',     'costura',        forn_costura,  3200.00, '2024-04-20', 250),
  (tid, ref_calca,   'inicio',    'modelagem',      null,           null,   '2024-04-05', 180),
  (tid, ref_calca,   'modelagem', 'corte',          null,           null,   '2024-04-10', 180),
  (tid, ref_calca,   'corte',     'costura',        forn_costura,  2800.00, '2024-04-15', 180),
  (tid, ref_calca,   'costura',   'acabamento',     forn_acabamento, 1200.00, '2024-04-28', 180),
  (tid, ref_vestido, 'inicio',    'modelagem',      null,           null,   '2024-04-07', 120),
  (tid, ref_vestido, 'modelagem', 'corte',          null,           null,   '2024-04-11', 120),
  (tid, ref_vestido, 'corte',     'costura',        forn_costura,  2100.00, '2024-04-18', 120),
  (tid, ref_vestido, 'costura',   'lavanderia',     forn_lavanderia, 900.00, '2024-04-28', 120),
  (tid, ref_shorts,  'inicio',    'modelagem',      null,           null,   '2024-04-10', 300),
  (tid, ref_shorts,  'modelagem', 'corte',          null,           null,   '2024-04-15', 300);

-- ─── CONTAS A PAGAR ───────────────────────────────────────────
insert into public.contas_a_pagar (tenant_id, referencia_id, fornecedor_id, fase, descricao, valor, data_vencimento, status, pix_fornecedor) values
  (tid, ref_blusa,   forn_costura,    'costura',      'CMO Costura — OP-2024-001',     3200.00, '2024-04-25', 'a_pagar', '12345678000101'),
  (tid, ref_calca,   forn_costura,    'costura',      'CMO Costura — OP-2024-002',     2800.00, '2024-04-20', 'a_pagar', '12345678000101'),
  (tid, ref_calca,   forn_acabamento, 'acabamento',   'CMO Acabamento — OP-2024-002',  1200.00, '2024-04-30', 'a_pagar', '56789012000105'),
  (tid, ref_vestido, forn_costura,    'costura',      'CMO Costura — OP-2024-003',     2100.00, '2024-04-22', 'pago',    '12345678000101'),
  (tid, ref_vestido, forn_lavanderia, 'lavanderia',   'CMO Lavanderia — OP-2024-003',   900.00, '2024-05-02', 'a_pagar', '34567890000103'),
  (tid, ref_shorts,  forn_costura,    'corte',        'CMO Corte — OP-2024-004',       1500.00, '2024-04-28', 'a_pagar', '12345678000101');

-- ─── FICHAS DE CUSTO ──────────────────────────────────────────
insert into public.fichas_custo (tenant_id, referencia, tipo, familia, cliente_id,
  mao_obra_fase1, mao_obra_fase2, mao_obra_fase3, mao_obra_fase4,
  mao_obra_fase5, mao_obra_fase6, mao_obra_fase7, mao_obra_fase8,
  custo_tecido, custo_aviamento, observacoes) values
  (tid, 'BLS-001', 'Blusa', 'Feminino', cli_lojas_sol,
   4.50, 8.00, 0, 0, 3.00, 0, 0, 1.50, 12.00, 4.50,
   'Blusa social tecido crepe. Manga longa com punho.'),
  (tid, 'CAL-001', 'Calça', 'Feminino', cli_lojas_sol,
   5.00, 10.00, 4.00, 0, 4.00, 0, 0, 2.00, 18.00, 6.00,
   'Calça alfaiataria slim. Bolso falso lateral.'),
  (tid, 'VES-001', 'Vestido', 'Feminino', cli_modas_bela,
   6.00, 12.00, 5.00, 2.00, 4.00, 6.00, 4.00, 2.00, 22.00, 8.00,
   'Vestido midi estampado. Lavanderia obrigatória.'),
  (tid, 'SHO-001', 'Shorts', 'Masculino', cli_atacado,
   3.50, 6.00, 0, 0, 2.50, 0, 0, 1.00, 10.00, 3.50,
   'Shorts cargo. 6 bolsos. Barra dobrada.'),
  (tid, 'FIT-001', 'Conjunto', 'Fitness', cli_modas_bela,
   4.00, 7.00, 3.00, 0, 3.00, 0, 0, 1.50, 14.00, 5.00,
   'Conjunto fitness legging + top. Tecido suplex.');

-- ─── ORÇAMENTOS ───────────────────────────────────────────────
insert into public.orcamentos (tenant_id, numero, cliente_id, validade,
  desconto_tipo, desconto_valor, subtotal, total,
  condicao_sinal, condicao_retira, condicao_prazo_dias, condicao_prazo_valor,
  status, observacoes) values
  (tid, 'ORC-0001', cli_lojas_sol, current_date + 15,
   'percentual', 5, 13482.00, 12807.90,
   6403.95, 6403.95, 30, 12807.90,
   'aprovado', 'Coleção inverno 2024. Entrega em 30 dias.'),
  (tid, 'ORC-0002', cli_modas_bela, current_date + 15,
   'percentual', 0, 22788.00, 22788.00,
   11394.00, 11394.00, 30, 22788.00,
   'enviado', 'Proposta coleção primavera. Aguardando aprovação.'),
  (tid, 'ORC-0003', cli_atacado, current_date + 10,
   'valor', 1000, 24470.00, 23470.00,
   11735.00, 11735.00, 30, 23470.00,
   'rascunho', 'Pedido atacado mix de peças.');

-- Itens do ORC-0001
insert into public.itens_orcamento (tenant_id, orcamento_id, referencia, descricao, quantidade, valor_unitario)
select tid, id, 'BLS-001', 'Blusa Social Manga Longa', 150, 89.90 from public.orcamentos where tenant_id = tid and numero = 'ORC-0001';
insert into public.itens_orcamento (tenant_id, orcamento_id, referencia, descricao, quantidade, valor_unitario)
select tid, id, 'CAL-001', 'Calça Alfaiataria Slim', 0, 149.90 from public.orcamentos where tenant_id = tid and numero = 'ORC-0001';

-- Itens do ORC-0002
insert into public.itens_orcamento (tenant_id, orcamento_id, referencia, descricao, quantidade, valor_unitario)
select tid, id, 'VES-001', 'Vestido Midi Estampado', 120, 189.90 from public.orcamentos where tenant_id = tid and numero = 'ORC-0002';

-- Itens do ORC-0003
insert into public.itens_orcamento (tenant_id, orcamento_id, referencia, descricao, quantidade, valor_unitario)
select tid, id, 'SHO-001', 'Shorts Cargo Masculino', 200, 79.90 from public.orcamentos where tenant_id = tid and numero = 'ORC-0003';
insert into public.itens_orcamento (tenant_id, orcamento_id, referencia, descricao, quantidade, valor_unitario)
select tid, id, 'FIT-001', 'Conjunto Fitness', 150, 129.90 from public.orcamentos where tenant_id = tid and numero = 'ORC-0003';

-- ─── OBSERVAÇÕES PRÉ-DEFINIDAS ────────────────────────────────
insert into public.observacoes_predefinidas (tenant_id, titulo, conteudo, categoria) values
  (tid, 'Frete por conta do comprador', 'Frete e seguro por conta do comprador. CIF não incluso.', 'frete'),
  (tid, 'Validade 15 dias', 'Este orçamento é válido por 15 dias a partir da data de emissão.', 'prazo'),
  (tid, 'Pagamento 50/50', 'Sinal de 50% na aprovação do pedido. Restante na retirada da mercadoria.', 'pagamento'),
  (tid, 'Garantia de qualidade', 'Todas as peças passam por controle de qualidade antes da expedição.', 'garantia'),
  (tid, 'Prazo de entrega', 'Prazo de produção: 25 a 35 dias úteis após aprovação e sinal.', 'prazo');

end $$;
