import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <RhitmoLogo className="h-10 w-auto" />
        </div>

        <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            Erro 404
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif mb-3">
            Página não encontrada
          </h1>
          <p className="text-muted-foreground mb-8">
            Não encontramos o endereço que você tentou acessar. Talvez o link
            esteja desatualizado ou você tenha digitado algo diferente.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate("/dashboard")}
              className="rounded-full px-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="rounded-full px-6 gap-2"
            >
              <Home className="h-4 w-4" />
              Ir para a Home
            </Button>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Rota tentada: <code className="font-mono">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
