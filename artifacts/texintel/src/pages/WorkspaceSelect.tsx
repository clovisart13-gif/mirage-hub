import { useState } from "react";
import { Loader2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, Workspace } from "@/lib/api";

export default function WorkspaceSelect({
  workspaces,
  onSelected,
}: {
  workspaces: Workspace[];
  onSelected: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const select = async (workspaceId: string) => {
    setLoading(workspaceId);
    setError("");
    try {
      await api("/api/auth/select-workspace", {
        method: "POST",
        body: JSON.stringify({ workspaceId }),
      });
      onSelected();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível selecionar.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5">
      <Card className="w-full max-w-lg border-slate-200/80 shadow-xl shadow-slate-200/40">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UsersRound className="size-5" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Escolha um workspace</CardTitle>
          <CardDescription>Você tem acesso a mais de um espaço. Selecione onde deseja trabalhar agora.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => select(workspace.id)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
              disabled={loading !== null}
            >
              <span>
                <span className="block font-semibold text-slate-900">{workspace.name}</span>
                <span className="mt-1 block text-xs uppercase tracking-wider text-slate-400">{workspace.role}</span>
              </span>
              {loading === workspace.id && <Loader2 className="size-4 animate-spin text-indigo-600" />}
            </button>
          ))}
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button variant="ghost" className="mt-2 w-full text-slate-500" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => window.location.reload())}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}