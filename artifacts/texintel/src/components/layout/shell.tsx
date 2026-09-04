import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { BrainCircuit, Building2, ChevronDown, LayoutDashboard, LogOut } from "lucide-react"
import { Workspace } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function Shell({
  children,
  user,
  workspace,
  onLogout,
}: {
  children: React.ReactNode
  user: { name: string; email: string }
  workspace: Workspace
  onLogout: () => void
}) {
  const [location] = useLocation()

  const navItems = [
    { href: "/app", label: "Visão geral", icon: LayoutDashboard },
    { href: "/app/brands", label: "Marcas", icon: Building2 },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb] text-foreground md:flex-row">
      {/* Sidebar */}
      <aside className="w-full flex-shrink-0 border-b bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center border-b px-5">
          <div className="flex items-center gap-2 text-slate-950 font-bold text-lg tracking-tight">
            <BrainCircuit className="w-5 h-5" />
            <span>TexIntel</span>
          </div>
        </div>
        <div className="border-b bg-slate-50/70 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{workspace.name}</p><p className="mt-0.5 text-xs text-slate-400">{workspace.role}</p></div>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href
            const Icon = item.icon
            return (
              <div key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              </div>
            )
          })}
        </nav>
        <div className="hidden border-t p-4 md:block">
          <div className="mb-3 min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{user.name}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-slate-500 hover:text-slate-900" onClick={onLogout}><LogOut className="size-4" />Sair</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-5 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
