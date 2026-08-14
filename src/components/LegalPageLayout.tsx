import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface LegalPageLayoutProps {
  children: ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-foreground hover:opacity-80 transition-opacity">
            <RhitmoLogo size="sm" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
              Termos de Serviço
            </Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Rhitmo. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
