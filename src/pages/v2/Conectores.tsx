import { Card, CardContent } from '@/components/ui/card';
import { NoteTakerConnectorCard } from '@/components/settings/NoteTakerConnectorCard';
import { NOTE_TAKER_PROVIDERS } from '@/lib/noteTakerProviders';

/**
 * Conectores como produto: a Rhitmo lê o que a empresa já captura.
 * O bot deixa de ser o motor e vira conveniência paga.
 */
export default function V2Conectores() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-none bg-muted/40 shadow-none">
        <CardContent className="p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Conectores</p>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight">
            Conecte o que você já usa
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Cada nota importada vira evidência citável com data e origem. Sem outro bot na sala,
            sem repetir o que a sua ferramenta já faz.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {NOTE_TAKER_PROVIDERS.map((p) => (
          <NoteTakerConnectorCard key={p.id} provider={p.id} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Não usa nenhum deles? O bot da Rhitmo continua disponível como add-on, e o Magic Paste
        aceita qualquer transcrição colada.
      </p>
    </div>
  );
}
