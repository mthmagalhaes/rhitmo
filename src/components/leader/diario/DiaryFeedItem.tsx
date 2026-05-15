// Item do feed cross-member do Diário v2.
// Linha compacta colapsável: ícone privacidade + data + avatar/nome + título + tags + chevron.
// Snippet completo aparece só ao expandir. "Abrir nota" deep-linka pra página clássica.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, Lock, Eye, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getTagColor, getTagEmoji, getTagLabel } from '@/lib/tagConfig';

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
  const [open, setOpen] = useState(false);
  const isShared = item.visibility === 'shared';
  const dateIso = item.occurred_at || item.created_at;
  const dateLabel = format(new Date(dateIso), 'dd/MM/yyyy');
  const fullText = stripHtml(item.content || '');

  return (
    <div className="rounded-xl border border-border/50 bg-card hover:border-border transition-colors overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
      >
        {isShared ? (
          <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0 tabular-nums">
          <CalendarIcon className="h-3 w-3" />
          {dateLabel}
        </span>
        <MemberAvatar
          memberId={item.member_id}
          memberName={item.member_name}
          avatarUrl={item.member_avatar}
          size="sm"
          className="h-5 w-5 shrink-0"
        />
        <span className="text-xs text-foreground/80 shrink-0 truncate max-w-[140px]">
          {item.member_name}
        </span>
        <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
          {item.title || 'Sem título'}
        </span>
        {item.tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className={cn(
              'hidden md:inline-flex items-center gap-1 text-[11px] rounded-md px-1.5 py-0.5 border shrink-0',
              getTagColor(tag),
            )}
          >
            <span>{getTagEmoji(tag)}</span>
            {getTagLabel(tag)}
          </span>
        ))}
        {item.tags && item.tags.length > 2 && (
          <span className="hidden md:inline text-[11px] text-muted-foreground shrink-0">
            +{item.tags.length - 2}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-2 mt-2.5 mb-2 flex-wrap text-[11px] text-muted-foreground">
            {item.member_role && <span>{item.member_role}</span>}
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(dateIso), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            <div className="flex items-center gap-1 ml-auto flex-wrap md:hidden">
              {item.tags?.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border',
                    getTagColor(tag),
                  )}
                >
                  <span>{getTagEmoji(tag)}</span>
                  {getTagLabel(tag)}
                </span>
              ))}
            </div>
          </div>
          {fullText && (
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {fullText}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lider/diario?member=${item.member_id}#${item.id}`);
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir nota
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
