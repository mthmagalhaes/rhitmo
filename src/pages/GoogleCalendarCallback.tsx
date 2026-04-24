import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RhythmWave } from "@/components/RhythmWave";

type Status = "processing" | "success" | "error" | "cancelled";

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Usuário cancelou no Google
    if (error === "access_denied") {
      setStatus("cancelled");
      return;
    }

    if (error) {
      setStatus("error");
      setErrorMessage(`O Google retornou um erro: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMessage("Parâmetros de autorização ausentes na resposta do Google.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: ANON_KEY,
              Authorization: `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ code, state }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Falha ao conectar Google Calendar");
        }

        setStatus("success");
        toast.success("Google Calendar conectado!", {
          description: data.calendar_email
            ? `Sincronizando ${data.calendar_email}`
            : "Suas próximas reuniões aparecerão no dashboard.",
        });

        // Pequeno delay pra o usuário ver o feedback
        setTimeout(() => {
          navigate("/dashboard?calendar=connected");
        }, 1200);
      } catch (err) {
        console.error("Calendar callback error:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Erro inesperado ao conectar com o Google Calendar."
        );
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Rhythm Wave decorativa */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <RhythmWave />
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-card rounded-3xl shadow-[0_2px_40px_rgba(0,0,0,0.06)] border border-border/40 p-10 text-center">
          {status === "processing" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-3">
                Conectando seu Google Calendar
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Estamos finalizando a autorização com segurança. Isso leva apenas alguns segundos.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-3">
                Calendário conectado
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Levando você ao dashboard...
              </p>
            </>
          )}

          {status === "cancelled" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-3">
                Autorização cancelada
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Tudo bem — você pode conectar o Google Calendar a qualquer momento pelo dashboard.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="rounded-xl"
                size="lg"
              >
                Voltar para o dashboard
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-3">
                Não conseguimos conectar
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl"
                  size="lg"
                >
                  Voltar e tentar novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
