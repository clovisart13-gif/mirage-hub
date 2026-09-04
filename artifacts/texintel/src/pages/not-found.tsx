import { Link } from "wouter"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        A rota que você tentou acessar não existe ou foi movida.
      </p>
      <Link href="/">
        <Button>Voltar para o Dashboard</Button>
      </Link>
    </div>
  )
}
