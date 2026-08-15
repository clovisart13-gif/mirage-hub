import { useState, useRef } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FinanceiroBackup() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".json")) {
      toast.error("Selecione um arquivo .json exportado do app financeiro");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleRestore = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const data = await apiFetch("/financeiro/restaurar-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...json, limpar: true }),
      });
      setResult(data.importado);
      toast.success("Dados restaurados com sucesso!");
    } catch (err: any) {
      const msg = err?.message || "Erro ao restaurar dados";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FinanceiroLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Restaurar Dados Antigos</h1>
          <p className="text-muted-foreground mt-1">
            Importe o backup JSON exportado do seu app financeiro anterior (Manus).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-600" />
              Upload do Backup
            </CardTitle>
            <CardDescription>
              Selecione o arquivo <code className="text-xs bg-muted px-1 rounded">r2pb_backup_*.json</code> exportado
              do app anterior. Todos os dados existentes serão substituídos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                dragging ? "border-teal-500 bg-teal-50 dark:bg-teal-950/20" : "border-border hover:border-teal-400 hover:bg-muted/50",
              )}
            >
              <UploadCloud className={cn("w-10 h-10", dragging ? "text-teal-500" : "text-muted-foreground")} />
              {file ? (
                <div className="text-center">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium">Arraste o arquivo JSON aqui</p>
                  <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {file && !result && (
              <Button
                onClick={handleRestore}
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  "Restaurar Dados"
                )}
              </Button>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  Restauração concluída!
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(result).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between bg-white dark:bg-background rounded-lg px-3 py-2 border">
                      <span className="text-muted-foreground capitalize">{k}</span>
                      <Badge variant="secondary">{String(v)}</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Acesse o Extrato ou Dashboard para ver seus dados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              <strong>Atenção:</strong> A restauração apaga todos os dados financeiros existentes e os substitui
              pelo conteúdo do backup. Esta ação não pode ser desfeita.
            </p>
          </CardContent>
        </Card>
      </div>
    </FinanceiroLayout>
  );
}
