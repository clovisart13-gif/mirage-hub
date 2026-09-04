import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, Brand, DashboardSummary } from "@/lib/api";

const initialForm = {
  displayName: "",
  instagramHandle: "",
  instagramUrl: "",
  websiteUrl: "",
  city: "São Paulo",
  marketSegment: "Moda",
  discoverySummary: "",
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Building2;
  tone: string;
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextBrands] = await Promise.all([
        api<DashboardSummary>("/api/dashboard/summary"),
        api<Brand[]>("/api/brands?limit=8"),
      ]);
      setSummary(nextSummary);
      setBrands(nextBrands);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível carregar o dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const createBrand = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api("/api/brands", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível salvar a marca.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Visão geral
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            Seu radar de marcas
          </h1>
          <p className="mt-2 max-w-xl text-slate-500">
            Descubra, organize e qualifique marcas de moda sem perder o contexto
            que sustenta cada decisão.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Marcas no radar"
          value={summary?.totalBrands ?? 0}
          detail="Candidatas neste workspace"
          icon={Building2}
          tone="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          label="Com score"
          value={summary?.scoredBrands ?? 0}
          detail="Avaliações registradas"
          icon={Sparkles}
          tone="bg-amber-50 text-amber-600"
        />
        <MetricCard
          label="Em revisão"
          value={summary?.needingReview ?? 0}
          detail="Aguardando curadoria"
          icon={ClipboardCheck}
          tone="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          label="Evidências"
          value={summary?.evidenceCount ?? 0}
          detail="Sinais preservados"
          icon={FileSearch}
          tone="bg-sky-50 text-sky-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Radar className="size-5 text-indigo-600" />
                  Adicionar marca ao radar
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Comece com sinais públicos. O CNPJ pode vir depois.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="hidden gap-1.5 sm:flex">
                <Plus className="size-3" />
                manual
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={createBrand} className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                Nome da marca
                <Input
                  value={form.displayName}
                  onChange={(event) => update("displayName", event.target.value)}
                  placeholder="Ex.: Estúdio Aurora"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">
                  Instagram
                  <Input
                    value={form.instagramHandle}
                    onChange={(event) =>
                      update("instagramHandle", event.target.value.replace(/^@/, ""))
                    }
                    placeholder="@marca"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  Cidade
                  <Input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="São Paulo"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">
                  URL do Instagram
                  <Input
                    type="url"
                    value={form.instagramUrl}
                    onChange={(event) => update("instagramUrl", event.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  Website
                  <Input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(event) => update("websiteUrl", event.target.value)}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <label className="block space-y-2 text-sm font-medium">
                Resumo do sinal inicial
                <textarea
                  value={form.discoverySummary}
                  onChange={(event) => update("discoverySummary", event.target.value)}
                  placeholder="O que chamou atenção nessa marca?"
                  className="min-h-20 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {formError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full gap-2 bg-slate-950 hover:bg-slate-800"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Salvar marca candidata
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-end justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Marcas recentes</CardTitle>
              <CardDescription className="mt-1.5">
                O histórico do seu workspace começa aqui.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-slate-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : brands.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <Building2 className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Seu radar está vazio
                </p>
                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-400">
                  Adicione a primeira marca para começar a registrar evidências e decisões.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/app/brands/${brand.id}`}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {brand.display_name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {[brand.market_segment, brand.city, brand.state]
                          .filter(Boolean)
                          .join(" · ") || "Marca candidata"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {brand.total_score !== null ? (
                        <Badge variant="outline" className="font-mono">
                          {brand.total_score}/100
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sem score</Badge>
                      )}
                      <ArrowUpRight className="size-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}