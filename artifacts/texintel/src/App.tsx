import { useCallback, useEffect, useState } from "react"
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import NotFound from "@/pages/not-found"
import { Shell } from "@/components/layout/shell"
import Dashboard from "@/pages/Dashboard"
import BrandDetail from "@/pages/BrandDetail"
import Auth from "@/pages/Auth"
import WorkspaceSelect from "@/pages/WorkspaceSelect"
import { api, MeResponse } from "@/lib/api"

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/app" component={Dashboard} />
        <Route path="/app/brands" component={Dashboard} />
        <Route path="/app/brands/:id" component={BrandDetail} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  )
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>
}

function App() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setMe(await api<MeResponse>("/api/auth/me"))
    } catch {
      setMe({ authenticated: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-sm text-slate-400">Carregando seu workspace…</div>
  }

  if (!me?.authenticated) {
    return <Auth onSuccess={() => void refresh()} />
  }

  if (!me.currentWorkspace) {
    return <WorkspaceSelect workspaces={me.workspaces || []} onSelected={() => void refresh()} />
  }

  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Shell
          user={me.user!}
          workspace={me.currentWorkspace}
          onLogout={async () => {
            await api("/api/auth/logout", { method: "POST" })
            setMe({ authenticated: false })
          }}
        >
          <Router />
        </Shell>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
