import { Link } from 'wouter';
import { Sparkles, ArrowRight, Users, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CAMPAIGN_URL = '/moda-conecta/fundadores';

export default function Comecar() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center space-y-8">

        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-semibold px-4 py-2 rounded-full">
          <Star className="w-3.5 h-3.5" />
          Fase Fundadora — Vagas Limitadas
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            O Mirage Hub está em<br />
            <span className="text-purple-400">fase de fundadores</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Neste momento, o acesso à plataforma é feito exclusivamente por convite
            após curadoria. Estamos formando a base inicial da rede de conexões Mirage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { icon: Users, title: 'Conexões qualificadas', desc: 'Match entre quem precisa e quem oferece' },
            { icon: Zap, title: 'Entrada gratuita', desc: 'Primeiros aprovados entram sem custo' },
            { icon: Sparkles, title: 'Curadoria ativa', desc: 'Cada perfil é analisado antes do acesso' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-white font-medium text-xs">{title}</p>
              <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            asChild
            size="lg"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-base font-semibold h-12"
          >
            <Link href={CAMPAIGN_URL}>
              Quero entrar para a fase fundadora <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <p className="text-xs text-slate-600">
            Já tem conta?{' '}
            <Link href="/login" className="text-slate-400 hover:text-white underline transition-colors">
              Faça login aqui
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
