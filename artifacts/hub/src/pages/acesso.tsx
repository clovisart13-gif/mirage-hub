import { useEffect } from "react";
import { useParams } from "wouter";

/**
 * Página pública — redireciona link limpo de acesso ao Hub.
 * URL: /acesso/:token
 * Redireciona para /api/acesso/:token que faz 302 para o magic link do Supabase.
 */
export default function Acesso() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  useEffect(() => {
    if (token) {
      window.location.href = `/api/acesso/${token}`;
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Preparando seu acesso...</p>
      </div>
    </div>
  );
}
