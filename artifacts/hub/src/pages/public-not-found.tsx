import { useEffect } from "react";

export default function PublicNotFound() {
  useEffect(() => {
    document.title = "Página não encontrada | Mirage Hub";
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute("content", "noindex, follow");
  }, []);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">Erro 404</p>
      <h1 className="mt-4 text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-slate-300">
        O endereço que você acessou não existe. Confira o link ou volte para a página inicial.
      </p>
      <a href="/" className="mt-8 rounded-lg bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500">
        Voltar para a página inicial
      </a>
    </main>
  );
}