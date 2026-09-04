import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center text-center px-6">
      <p className="text-white/20 text-7xl font-black mb-4">404</p>
      <h1 className="text-white font-bold text-xl mb-2">Página não encontrada</h1>
      <p className="text-white/40 text-sm mb-8">O endereço que você acessou não existe.</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors"
      >
        ← Voltar ao portal
      </button>
    </div>
  );
}
