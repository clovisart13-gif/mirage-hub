import { useState, useEffect, useRef } from "react";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Upload, Save } from "lucide-react";
import CustosNav from "@/components/orcamento/CustosNav";
import { apiFetch } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CustosConfiguracoes() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: empresaData, isLoading: loading } = useQuery<any>({
    queryKey: ["empresa"],
    queryFn: () => apiFetch("/tenants/empresa"),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const [form, setForm] = useState({
    nome_empresa: "",
    logo_url: "",
    endereco: "",
    cidade_estado_cep: "",
    cnpj: "",
    pix: "",
    email: "",
    site: "",
    telefone: "",
  });

  useEffect(() => {
    if (empresaData) {
      setForm({
        nome_empresa: empresaData.nome_empresa || "",
        logo_url: empresaData.logo_url || "",
        endereco: empresaData.endereco || "",
        cidade_estado_cep: empresaData.cidade_estado_cep || "",
        cnpj: empresaData.cnpj || "",
        pix: empresaData.pix || "",
        email: empresaData.email || "",
        site: empresaData.site || "",
        telefone: empresaData.telefone || "",
      });
    }
  }, [empresaData]);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      await apiFetch("/tenants/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      qc.invalidateQueries({ queryKey: ["empresa"] });
      toast.success("Configurações salvas com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/custos/upload-logo", { method: "POST", body: fd });
      setForm(f => ({ ...f, logo_url: res.url }));
      toast.success("Logo enviado!");
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(f => ({ ...f, logo_url: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
      toast.info("Logo carregado localmente. Salve para confirmar.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  if (loading) return (
    <>
      <CustosNav />
      <div className="container py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </>
  );

  return (
    <KanbanLayout>
      <CustosNav />
      <div className="px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
            <p className="text-muted-foreground text-sm">Esses dados aparecem no cabeçalho e rodapé dos orçamentos</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader><CardTitle className="text-base">Logo da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {form.logo_url && (
                <div className="border rounded-lg p-4 bg-muted flex items-center justify-center">
                  <img src={form.logo_url} alt="Logo" className="h-16 object-contain" />
                </div>
              )}
              <div className="flex gap-3">
                <Input
                  placeholder="URL da imagem (https://...)"
                  value={form.logo_url}
                  onChange={e => set("logo_url", e.target.value)}
                />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? "Enviando..." : "Upload"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Cole a URL da imagem ou faça upload. Formatos: PNG, JPG, SVG.</p>
            </CardContent>
          </Card>

          {/* Dados da Empresa */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da Empresa</Label>
                <Input placeholder="Ex: QUICK THREADS LTDA" value={form.nome_empresa} onChange={e => set("nome_empresa", e.target.value)} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input placeholder="Ex: R. Ten. Pena, 166 - Bom Retiro" value={form.endereco} onChange={e => set("endereco", e.target.value)} />
              </div>
              <div>
                <Label>Cidade, Estado - CEP</Label>
                <Input placeholder="Ex: São Paulo - SP, 01127-020" value={form.cidade_estado_cep} onChange={e => set("cidade_estado_cep", e.target.value)} />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input placeholder="Ex: 50.295.280/0001-80" value={form.cnpj} onChange={e => set("cnpj", e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input placeholder="Ex: (11) 99999-9999" value={form.telefone} onChange={e => set("telefone", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Rodapé do Orçamento */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dados para o Rodapé do Orçamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>PIX / CNPJ para pagamento</Label>
                <Input placeholder="Ex: 50295280000180" value={form.pix} onChange={e => set("pix", e.target.value)} />
              </div>
              <div>
                <Label>E-mail comercial</Label>
                <Input type="email" placeholder="Ex: comercial@empresa.com.br" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <Label>Site</Label>
                <Input placeholder="Ex: www.empresa.com.br" value={form.site} onChange={e => set("site", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Preview do rodapé */}
          {(form.pix || form.email || form.site) && (
            <Card className="border-dashed">
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Preview do Rodapé</CardTitle></CardHeader>
              <CardContent>
                <div className="border-t-2 border-slate-700 pt-3 text-center text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-slate-600">
                    {form.pix && <span>PIX (CNPJ): {form.pix}</span>}
                    {form.email && <span>{form.pix ? " | " : ""}Email: {form.email}</span>}
                    {form.site && <span>{(form.pix || form.email) ? " | " : ""}Site: {form.site}</span>}
                  </div>
                  <div className="text-slate-400 italic">Este orçamento é válido por [N] dias a partir da data de emissão. <span className="text-xs">(preenchido automaticamente por orçamento)</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSalvar} disabled={saving} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </KanbanLayout>
  );
}
