import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Redirecionado para o Pipeline de Curadoria dentro de Comunidade.
 * A curadoria agora é gerenciada em: /hub/comunidade (aba Pipeline de Curadoria)
 */
export default function AdminCadastrosModaConecta() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate('/hub/comunidade');
  }, [navigate]);
  return (
    <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
      Redirecionando para o Pipeline de Curadoria...
    </div>
  );
}
