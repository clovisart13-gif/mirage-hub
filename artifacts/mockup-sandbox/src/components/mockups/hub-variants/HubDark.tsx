import React from 'react';
import { LayoutDashboard, Calculator, Users, MessageSquare, Database, ArrowUpRight, Zap, Target, Clock, ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export function HubDark() {
  return (
    <div className="min-h-screen bg-[#0D0D1A] text-slate-300 flex overflow-hidden font-sans selection:bg-violet-500/30">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-white/5 bg-[#080811] flex flex-col h-screen sticky top-0">
        <div className="p-5 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              M
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Mirage</span>
          </div>
          
          <div className="px-3 py-2 rounded-md bg-white/5 border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Plano Pro</span>
          </div>
        </div>

        <div className="px-3 py-2 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 mt-4">Apps</div>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors group">
            <LayoutDashboard size={16} className="text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span className="text-sm font-medium">Kanban</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors group">
            <Calculator size={16} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="text-sm font-medium">Orçamento</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors group">
            <Users size={16} className="text-orange-400 group-hover:text-orange-300 transition-colors" />
            <span className="text-sm font-medium">Helena CRM</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors group">
            <MessageSquare size={16} className="text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <span className="text-sm font-medium">Comunidade</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors group">
            <Database size={16} className="text-slate-400 group-hover:text-slate-300 transition-colors" />
            <span className="text-sm font-medium">ERP Mirage</span>
          </a>
        </div>
        
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-white">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-200">João Doe</span>
              <span className="text-[10px] text-slate-500">Confecção Silva</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-10 py-12 relative z-10 space-y-16">
          
          {/* Hero */}
          <section className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Bem-vindo ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Ecossistema Mirage</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl">
              O hub definitivo para confecções. Centralize sua produção, acelere orçamentos e transforme leads em clientes.
            </p>
          </section>

          {/* Metrics Strip */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-medium text-slate-400">Tempo de entrega</span>
              </div>
              <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(124,58,237,0.3)]">60%</div>
              <div className="text-sm text-slate-500 mt-1">menos atrasos</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-400">Velocidade</span>
              </div>
              <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">5 min</div>
              <div className="text-sm text-slate-500 mt-1">por orçamento</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-medium text-slate-400">Retenção</span>
              </div>
              <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">0</div>
              <div className="text-sm text-slate-500 mt-1">clientes perdidos</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-400">Atendimento</span>
              </div>
              <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">24h</div>
              <div className="text-sm text-slate-500 mt-1">SDR automático</div>
            </div>
          </section>

          {/* Problems -> Solutions */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">O que a Mirage resolve</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Card 1 */}
              <div className="bg-[#111122] border border-white/5 rounded-2xl p-6 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[40px] rounded-full group-hover:bg-violet-500/20 transition-colors" />
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-slate-300">Perda de prazo de entrega</span>
                  </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-white">Previsibilidade total com o Kanban de Produção</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#111122] border border-white/5 rounded-2xl p-6 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full group-hover:bg-blue-500/20 transition-colors" />
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-slate-300">Orçamento no feeling</span>
                  </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-white">Custos exatos em minutos com o Gerador PRO</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#111122] border border-white/5 rounded-2xl p-6 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full group-hover:bg-orange-500/20 transition-colors" />
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-slate-300">Pedidos perdidos no WhatsApp</span>
                  </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-white">Funil automatizado com Helena CRM</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* App Grid */}
          <section className="space-y-6">
             <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-slate-400" />
              <h2 className="text-xl font-semibold text-white">Seus Aplicativos</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* App Kanban */}
              <a href="#" className="group block bg-[#0F101A] border border-white/5 hover:border-violet-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Kanban de Produção</h3>
                  <p className="text-sm text-slate-400 flex-1">Gestão visual das etapas produtivas com controle de prazos.</p>
                  <div className="mt-4 flex items-center text-xs font-medium text-violet-400">
                    Acessar app <ArrowUpRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </a>

              {/* App Orçamento */}
              <a href="#" className="group block bg-[#0F101A] border border-white/5 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calculator className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Gerador de Orçamento</h3>
                  <p className="text-sm text-slate-400 flex-1">Precificação exata com custos de material e mão de obra.</p>
                  <div className="mt-4 flex items-center text-xs font-medium text-blue-400">
                    Acessar app <ArrowUpRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </a>

              {/* App CRM */}
              <a href="#" className="group block bg-[#0F101A] border border-white/5 hover:border-orange-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Helena CRM</h3>
                  <p className="text-sm text-slate-400 flex-1">SDR via WhatsApp e gestão de leads e oportunidades.</p>
                  <div className="mt-4 flex items-center text-xs font-medium text-orange-400">
                    Acessar app <ArrowUpRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </a>

              {/* App Comunidade */}
              <a href="#" className="group block bg-[#0F101A] border border-white/5 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Comunidade Vestuário</h3>
                  <p className="text-sm text-slate-400 flex-1">Networking e parcerias com outras confecções do setor.</p>
                  <div className="mt-4 flex items-center text-xs font-medium text-emerald-400">
                    Acessar app <ArrowUpRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </a>

              {/* App ERP */}
              <a href="#" className="group block bg-[#0F101A] border border-white/5 hover:border-slate-400/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(148,163,184,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Database className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">ERP Mirage</h3>
                  <p className="text-sm text-slate-400 flex-1">Financeiro, estoque e emissão de notas fiscais integrado.</p>
                  <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                    Acessar app <ArrowUpRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </a>

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
