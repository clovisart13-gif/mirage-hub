import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Settings, Shield, Sun, Moon, Activity, CreditCard, Brain } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { useTheme } from '@/contexts/ThemeContext';
const mirageLogoLight = `${import.meta.env.BASE_URL}mirage_logo_transparent.png`;
const mirageLogoDark = `${import.meta.env.BASE_URL}mirage_logo_dark_transparent.png`;
import { ChatWidget } from '@/components/ChatWidget';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { AthosChatWidget } from '@/components/AthosChatWidget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const SUPER_ADMIN_EMAIL = 'clovisart13@gmail.com';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <img
                src={theme === 'dark' ? mirageLogoDark : mirageLogoLight}
                alt="Mirage"
                className="h-12 w-auto"
              />
            </Link>

            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link href="/hub" className={`transition-colors hover:text-foreground/80 ${location === '/hub' ? 'text-foreground font-semibold' : 'text-foreground/60'}`}>
                  Hub
                </Link>
                <Link href="/planos" className={`transition-colors hover:text-foreground/80 ${location === '/planos' ? 'text-foreground font-semibold' : 'text-foreground/60'}`}>
                  Planos
                </Link>
                {isSuperAdmin && (
                  <>
                    <Link href="/admin" className={`transition-colors hover:text-foreground/80 flex items-center gap-1 ${location === '/admin' ? 'text-violet-700 font-semibold' : 'text-violet-500'}`}>
                      <Shield className="w-3.5 h-3.5" />
                      Admin
                    </Link>
                    <Link href="/operacoes" className={`transition-colors hover:text-foreground/80 flex items-center gap-1 ${location === '/operacoes' ? 'text-violet-700 font-semibold' : 'text-violet-500'}`}>
                      <Activity className="w-3.5 h-3.5" />
                      Operações
                    </Link>
                    <Link href="/hub/mentor" className={`transition-colors hover:text-foreground/80 flex items-center gap-1 ${location === '/hub/mentor' ? 'text-indigo-700 font-semibold' : 'text-indigo-500'}`}>
                      <Brain className="w-3.5 h-3.5" />
                      ATHOS
                    </Link>
                    <Link href="/hub/mapa" className={`transition-colors hover:text-foreground/80 flex items-center gap-1 ${location === '/hub/mapa' ? 'text-teal-700 font-semibold' : 'text-teal-500'}`}>
                      🗺 Mapa
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!isAuthenticated ? (
              <>
                <Link href="/planos" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block">
                  Ver Planos
                </Link>
                <Button variant="ghost" asChild>
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Criar conta</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold uppercase">
                        {user?.email?.[0] || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none truncate">
                        {isSuperAdmin ? 'Super Admin — Mirage' : 'Minha Conta'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                    {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/hub/assinatura">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Minha Assinatura
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/hub/configuracoes">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer text-violet-700">
                        <Link href="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Painel Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-indigo-600">
                        <Link href="/hub/mentor">
                          <Brain className="mr-2 h-4 w-4" />
                          ATHOS_MENTOR
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <ChatWidget />
      <FeedbackWidget />
      <AthosChatWidget />

      <footer className="border-t py-6 md:py-0 bg-white">
        <div className="container mx-auto px-4 flex flex-col md:h-16 items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} Mirage Hub. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:underline">Termos</span>
            <span className="cursor-pointer hover:underline">Privacidade</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
