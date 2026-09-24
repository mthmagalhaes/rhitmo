// Importar notas do note taker (Granola, Fireflies) direto de Anotações & Evidências.
// Pensado para a conversa que não estava na agenda: a nota não casa sozinha com
// um liderado, então o líder escolhe o dono aqui, sem ir às Configurações.
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, ClipboardPaste, Download, Inbox, Loader2, Plug, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NoteTakerConnectorCard } from '@/components/settings/NoteTakerConnectorCard';
import { useAnyNoteTakerConnection, useNoteTaker, type RecentNote } from '@/hooks/useNoteTaker';
import { NOTE_TAKER_PROVIDERS, type NoteTakerProviderId } from '@/lib/noteTakerProviders';

interface Member {
  id: string;
  name: string;
  email?: string | null;
}

/** Sugere o liderado pelo e-mail dos convidados ou pelo primeiro nome no título. */
function suggestMember(note: RecentNote, members: Member[]): string | undefined {
  const emails = new Set(
    (note.attendees ?? []).map((a) => (a.email ?? '').toLowerCase()).filter(Boolean),
  );
  const byEmail = members.find((m) => m.email && emails.has(m.email.toLowerCase()));
  if (byEmail) return byEmail.id;
  const hay = `${note.title ?? ''} ${(note.attendees ?? []).map((a) => a.name ?? '').join(' ')}`.toLowerCase();
  return members.find((m) => {
    const first = m.name.split(/\s+/)[0]?.toLowerCase();
    return first && first.length > 2 && hay.includes(first);
  })?.id;
}

function NoteRow({
  note,
  members,
  presetMemberId,
  onImport,
  onDismiss,
  busy,
}: {
  note: RecentNote;
  members: Member[];
  presetMemberId?: string;
  onImport: (memberId: string) => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const [memberId, setMemberId] = useState<string | undefined>(
    presetMemberId ?? suggestMember(note, members),
  );
  const imported = note.status === 'imported';
  const owner = imported ? members.find((m) => m.id === note.member_id)?.name : undefined;
  const date = note.note_created_at
    ? format(new Date(note.note_created_at), "d 'de' MMM, HH:mm", { locale: ptBR })
    : '';

  return (
    <Card className="rounded-2xl border-none bg-card p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{note.title || 'Nota sem título'}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
        {imported ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3" />
            {owner ? `Em ${owner.split(' ')[0]}` : 'Importada'}
          </span>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Descartar nota"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {!imported && (
        <div className="mt-3 flex gap-2">
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className="h-9 flex-1 rounded-xl">
              <SelectValue placeholder="De quem é esta conversa?" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-9 rounded-xl"
            disabled={!memberId || busy}
            onClick={() => memberId && onImport(memberId)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Importar'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function ConnectedList({
  provider,
  members,
  presetMemberId,
}: {
  provider: NoteTakerProviderId;
  members: Member[];
  presetMemberId?: string;
}) {
  const nt = useNoteTaker(provider);
  const { data: notes = [], isFetching } = nt.useRecent(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = useMemo(() => notes.filter((n) => n.status !== 'dismissed'), [notes]);

  if (isFetching && notes.length === 0) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando suas notas mais recentes…
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <Inbox className="mx-auto mb-2 h-6 w-6" />
        Nenhuma nota nos últimos 14 dias. Se a conversa acabou agora, espere o resumo ficar pronto
        e abra de novo.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {isFetching && (
        <p className="text-xs text-muted-foreground">Atualizando…</p>
      )}
      {visible.map((n) => (
        <NoteRow
          key={n.id}
          note={n}
          members={members}
          presetMemberId={presetMemberId}
          busy={busyId === n.id}
          onDismiss={() => nt.dismiss.mutate(n.id)}
          onImport={(memberId) => {
            setBusyId(n.id);
            nt.assign.mutate(
              { noteId: n.id, memberId },
              { onSettled: () => setBusyId(null) },
            );
          }}
        />
      ))}
    </div>
  );
}

export function ImportFromNoteTakerSheet({
  open,
  onOpenChange,
  members,
  presetMemberId,
  onPasteInstead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
  presetMemberId?: string;
  onPasteInstead: () => void;
}) {
  const any = useAnyNoteTakerConnection();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-serif text-xl font-bold tracking-tight">
            {any.label ? `Importar do ${any.label}` : 'Importar notas'}
          </SheetTitle>
          <SheetDescription>
            {any.isConnected
              ? 'Escolha a conversa e o liderado. A nota entra privada, com resumo e origem.'
              : 'Conecte seu note taker uma vez e traga qualquer conversa com dois cliques.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {any.isLoading ? null : any.provider ? (
            <ConnectedList
              provider={any.provider}
              members={members}
              presetMemberId={presetMemberId}
            />
          ) : (
            <div className="space-y-3">
              {NOTE_TAKER_PROVIDERS.map((p) => (
                <NoteTakerConnectorCard key={p.id} provider={p.id} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button variant="ghost" size="sm" className="gap-2 rounded-xl" onClick={onPasteInstead}>
              <ClipboardPaste className="h-4 w-4" />
              Colar transcrição
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2 rounded-xl">
              <Link to="/lider/conectores">
                <Plug className="h-4 w-4" />
                Conectores
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Faixa no topo do diário quando há notas esperando um dono. */
export function PendingNotesBanner({ onOpen }: { onOpen: () => void }) {
  const any = useAnyNoteTakerConnection();
  const nt = useNoteTaker(any.provider ?? 'granola');
  const count = any.provider ? nt.pending.length : 0;
  if (count === 0) return null;
  return (
    <Card className="flex items-center justify-between gap-3 rounded-2xl border-none bg-primary/5 p-4 shadow-none">
      <p className="text-sm">
        <span className="font-semibold">
          {count} {count === 1 ? 'nota' : 'notas'} do {any.label}
        </span>{' '}
        {count === 1 ? 'esperando' : 'esperando'} você dizer de quem é.
      </p>
      <Button size="sm" className="gap-2 rounded-xl" onClick={onOpen}>
        <Download className="h-4 w-4" />
        Atribuir
      </Button>
    </Card>
  );
}
