import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Brain, Loader2 } from 'lucide-react';

export function Login() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/chat');
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message || 'Falha ao fazer login');
    }
    
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-sm space-y-10">
        
        {/* Logo and branding */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">ATHOS</h1>
            <p className="text-sm text-muted-foreground">Assistente de Inteligência Operacional</p>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input/50 border border-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input/50 border border-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center font-medium animate-in slide-in-from-top-1">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl py-3.5 font-medium shadow-md shadow-violet-900/20 active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
