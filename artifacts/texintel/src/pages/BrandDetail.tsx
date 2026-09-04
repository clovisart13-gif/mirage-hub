import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, FileSearch, Loader2, MessageSquareText, Plus, Target } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, BrandDetail as BrandDetailType } from "@/lib/api";

export default function BrandDetail() {
  const [, params] = useRoute("/app/brands/:id");
  const id = params?.id;
  const [brand, setBrand] = useState<BrandDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState({
    claim: "",
    sourceUrl: "",
    sourceType: "manual",
    confidence: "medium",
  });
  const [score, setScore] = useState({ totalScore: "", rationale: "" });
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setBrand(await api<BrandDetailType>(`/api/brands/${id}`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar a marca.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent, type: "note" | "evidence" | "score") => {
    event.preventDefault();
    if (!id) return;
    setSaving(type);
    setError("");
    try {
      if (type === "note") {
        await api(`/api/brands/${id}/notes`, { method: "POST", body: JSON.stringify({ body: note, noteType: "observation" }) });
        setNote("");
      } else if (type === "evidence") {
        await api(`/api/brands/${id}/evidence`, { method: "POST", body: JSON.stringify(evidence) });
        setEvidence({ claim: "", sourceUrl: "", sourceType: "manual", confidence: "medium" });
      } else {
        const totalScore = Number(score.totalScore);
        await api(`/api/brands/${id}/score`, { method: "POST", body: JSON.stringify({
          totalScore,
          rationale: score.rationale,
          dimensionScores: { segmentFit: totalScore, evidenceQuality: totalScore },
        }) });
        setScore({ totalScore: "", rationale: "" });
      }
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar.");
    } finally {
      setSaving("");
    }
  };

  if (loading) return <div className="flex h-[50vh] items-center justify-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>;
  if (!brand) return <div className="mx-auto max-w-xl py-16 text-center"><p className="font-semibold text-slate-800">Marca não encontrada</p><Link href="/app" className="mt-3 inline-block text-sm text-indigo-600">Voltar ao dashboard</Link></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/app" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />Voltar ao radar</Link>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">{brand.display_name}</h1>
            <Badge variant="secondary">{brand.identity_status}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-500">{[brand.market_segment, brand.city, brand.state].filter(Boolean).join(" · ") || "Marca candidata"} · criada em {new Date(brand.created_at).toLocaleDateString("pt-BR")}</p>
        </div>
        <div className="flex gap-2">
          {brand.instagram_url && <Button variant="outline" size="sm" asChild><a href={brand.instagram_url} target="_blank" rel="noreferrer" className="gap-2"><ExternalLink className="size-4" />Instagram</a></Button>}
          {brand.website_url && <Button variant="outline" size="sm" asChild><a href={brand.website_url} target="_blank" rel="noreferrer" className="gap-2"><ExternalLink className="size-4" />Website</a></Button>}
        </div>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileSearch className="size-5 text-indigo-600" />Identidade e descoberta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Instagram</p><p className="mt-1 font-medium text-slate-800">{brand.instagram_handle ? `@${brand.instagram_handle}` : "Não informado"}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Website</p><p className="mt-1 truncate font-medium text-slate-800">{brand.website_url || "Não informado"}</p></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Sinal inicial</p><p className="mt-2 text-sm leading-6 text-slate-600">{brand.discovery_summary || "Nenhum resumo registrado ainda."}</p></div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquareText className="size-5 text-indigo-600" />Notas de curadoria</CardTitle><CardDescription>Registre o raciocínio por trás da próxima decisão.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(event) => void submit(event, "note")} className="flex gap-2"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: vale observar a próxima coleção..." className="min-h-20 flex-1 resize-y rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" /><Button type="submit" size="icon" disabled={!note.trim() || saving === "note"} aria-label="Salvar nota">{saving === "note" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}</Button></form>
              {brand.notes.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">Nenhuma nota ainda.</p> : <div className="space-y-3">{brand.notes.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><p className="text-sm leading-6 text-slate-700">{item.body}</p><p className="mt-2 text-xs text-slate-400">{item.author_name} · {new Date(item.created_at).toLocaleDateString("pt-BR")}</p></div>)}</div>}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-indigo-200 bg-indigo-50/40 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Target className="size-5 text-indigo-600" />Avaliação inicial</CardTitle><CardDescription>Score versionado para ordenar a curadoria, não para automatizar contato.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3"><span className="text-5xl font-semibold tracking-tight text-slate-950">{brand.total_score ?? "—"}</span><span className="pb-1 text-sm text-slate-500">/ 100</span>{brand.score_band && <Badge className="mb-2">{brand.score_band}</Badge>}</div>
              <form onSubmit={(event) => void submit(event, "score")} className="space-y-3 border-t border-indigo-100 pt-4"><label className="block space-y-2 text-sm font-medium">Score total <input type="number" min="0" max="100" value={score.totalScore} onChange={(event) => setScore((current) => ({ ...current, totalScore: event.target.value }))} placeholder="0–100" className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" required /></label><label className="block space-y-2 text-sm font-medium">Justificativa <textarea value={score.rationale} onChange={(event) => setScore((current) => ({ ...current, rationale: event.target.value }))} placeholder="Quais sinais sustentam essa avaliação?" className="min-h-20 w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" required /></label><Button type="submit" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" disabled={saving === "score"}>{saving === "score" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Salvar avaliação</Button></form>
              {brand.assessments.length > 0 && <div className="rounded-xl bg-white/80 p-3 text-sm text-slate-600"><p className="font-medium text-slate-800">Última justificativa</p><p className="mt-1 leading-6">{brand.assessments[0].rationale}</p><p className="mt-2 text-xs text-slate-400">Rubrica {brand.assessments[0].rubric_version}</p></div>}
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader><CardTitle className="text-lg">Evidências</CardTitle><CardDescription>Sinais preservados com sua origem.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(event) => void submit(event, "evidence")} className="space-y-3">
                <input value={evidence.claim} onChange={(event) => setEvidence((current) => ({ ...current, claim: event.target.value }))} placeholder="Ex.: vende no atacado" className="h-9 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" required />
                <input type="url" value={evidence.sourceUrl} onChange={(event) => setEvidence((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="URL da fonte (opcional)" className="h-9 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                <label className="block space-y-2 text-sm font-medium">
                  Confiança do sinal
                  <select
                    value={evidence.confidence}
                    onChange={(event) => setEvidence((current) => ({ ...current, confidence: event.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="low">Baixa — sinal fraco ou incompleto</option>
                    <option value="medium">Média — sinal plausível</option>
                    <option value="high">Alta — fonte clara e verificável</option>
                  </select>
                </label>
                <Button type="submit" variant="outline" className="w-full gap-2" disabled={saving === "evidence"}>{saving === "evidence" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Adicionar evidência</Button>
              </form>
              {brand.evidence.length === 0 ? <p className="py-3 text-center text-sm text-slate-400">Nenhuma evidência registrada.</p> : <div className="space-y-3">{brand.evidence.map((item) => <div key={item.id} className="border-l-2 border-indigo-200 pl-3"><p className="text-sm font-medium text-slate-700">{item.claim}</p><p className="mt-1 text-xs text-slate-400">{item.source_type}{item.source_url ? ` · ${item.source_url}` : ""} · confiança {item.confidence}</p></div>)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}