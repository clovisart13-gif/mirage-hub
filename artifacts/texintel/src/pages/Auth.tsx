import { FormEvent, useState } from "react";
import { BrainCircuit, Eye, EyeOff, Loader2, LockKeyhole, Radar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type AuthMode = "login" | "register";

export default function Auth({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspaceName: "",
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      onSuccess();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between px-10 py-10 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <BrainCircuit className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">TexIntel</span>
          </div>
          <div className="max-w-lg">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Intelligence workspace
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
              Encontre as marcas que merecem uma conversa.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-500">
              Organize descoberta, evidências e curadoria comercial em um espaço próprio para inteligência de moda.
            </p>
            <div className="mt-10 grid gap-3 text-sm text-slate-600">
              {[
                ["Descoberta pública", "Comece por Instagram e web, sem depender de CNPJ."],
                ["Fit explicável", "Scores acompanhados pelas evidências que sustentam cada sinal."],
                ["Curadoria humana", "A tecnologia ordena o trabalho; a decisão continua sua."],
              ].map(([title, description], index) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white/75 p-4">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    {index === 0 ? <Radar className="size-4" /> : index === 1 ? <ShieldCheck className="size-4" /> : <LockKeyhole className="size-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-slate-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400">TexIntel v1 · São Paulo first</p>
        </section>

        <main className="flex items-center justify-center px-5 py-8 sm:px-10">
          <Card className="w-full max-w-md border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="space-y-4 pb-5">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <BrainCircuit className="size-4" />
                </div>
                <span className="font-bold">TexIntel</span>
              </div>
              <div>
                <CardTitle className="text-2xl tracking-tight">
                  {mode === "login" ? "Bem-vindo de volta" : "Crie seu espaço de inteligência"}
                </CardTitle>
                <CardDescription className="mt-2">
                  {mode === "login"
                    ? "Entre para continuar sua curadoria de marcas."
                    : "Comece com um workspace próprio para sua operação."}
                </CardDescription>
              </div>
              <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
                {(["login", "register"] as AuthMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setMode(option);
                      setError("");
                    }}
                    className={`rounded-md px-3 py-2 font-medium transition ${
                      mode === option ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {option === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                {mode === "register" && (
                  <>
                    <label className="block space-y-2 text-sm font-medium">
                      Seu nome
                      <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Ex.: Maria Silva" autoComplete="name" required />
                    </label>
                    <label className="block space-y-2 text-sm font-medium">
                      Nome do workspace
                      <Input value={form.workspaceName} onChange={(event) => update("workspaceName", event.target.value)} placeholder="Ex.: Minha curadoria SP" required />
                    </label>
                  </>
                )}
                <label className="block space-y-2 text-sm font-medium">
                  E-mail
                  <Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="voce@empresa.com" autoComplete="email" required />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  Senha
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => update("password", event.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="pr-10"
                      minLength={8}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
                {mode === "login" && (
                  <p className="text-xs leading-5 text-slate-400">
                    Recuperação de acesso será adicionada na próxima etapa da fundação.
                  </p>
                )}
                {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <Button type="submit" className="h-11 w-full gap-2 bg-slate-950 hover:bg-slate-800" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {mode === "login" ? "Entrar no TexIntel" : "Criar meu workspace"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}