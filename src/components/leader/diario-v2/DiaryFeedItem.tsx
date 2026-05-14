// Item do feed cross-member do Diário v2.
// Cada linha mostra: avatar do liderado, nome, cargo, snippet, tags, timestamp,
// ícone de privacidade. Click navega para a página clássica filtrada por aquela pessoa.
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, Eye } from 'lucide-react';
import { MemberAvatar } from '@/components/MemberAvatar';

export interface FeedItem {
  id: string;
  member_id: string;
  member_name: string;
  member_role: string | null;
  member_avatar: string | null;
  title: string | null;
  content: string;
  tags: string[] | null;
  visibility: string | null;
  occurred_at: string;
  created_at: string;
}

interface DiaryFeedItemProps {
  item: FeedItem;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function DiaryFeedItem({ item }: DiaryFeedItemProps) {
  const navigate = useNavigate();
  const isShared = item.visibility === 'shared';
  const dateIso = item.occurred_at || item.created_at;
  const snippet = stripHtml(item.content || '').slice(0, 220);

  return (
    <button
      type="button"
      onClick={() => navigate(`/lider/diario?member=${item.member_id}#${item.id}`)}
      className="group w-full text-left rounded-2xl border border-border/50 bg-card hover:bg-muted/40 hover:border-border transition-colors p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <MemberAvatar
          memberId={item.member_id}
          memberName={item.member_name}
          avatarUrl={item.member_avatar}
          size="sm"
          className="h-9 w-9 shrink-0 mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {item.member_name}
            </span>
            {item.member_role && (
              <span className="text-xs text-muted-foreground truncate">
                · {item.member_role}
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {formatDistanceToNow(new Date(dateIso), { addSuffix: true, locale: ptBR })}
            </span>
          </div>

          {item.title && (
            <p className="font-serif text-sm font-semibold text-foreground mt-1.5 truncate">
              {item.title}
            </p>
          )}

          {snippet && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {snippet}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              {isShared ? (
                <>
                  <Eye className="h-3 w-3" />
                  Compartilhada
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Privada
                </>
              )}
            </span>
            {item.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-[11px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
            {item.tags && item.tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
