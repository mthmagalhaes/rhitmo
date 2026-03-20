import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Target,
  Settings,
  Sparkles,
  Calendar,
  Mail,
  Briefcase,
  Loader2,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  workspaceId: string;
}

const sentimentColors: Record<string, string> = {
  muito_positivo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  positivo: 'bg-green-100 text-green-700 border-green-200',
  neutro: 'bg-slate-100 text-slate-700 border-slate-200',
  construtivo: 'bg-amber-100 text-amber-700 border-amber-200',
  critico: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'Em andamento', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function renderJsonValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }
  return String(val);
}

export function MemberProfileSheet({
  open,
  onOpenChange,
  memberId,
  workspaceId,
}: MemberProfileSheetProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['hr-member-profile', workspaceId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_member_profile', {
        _workspace_id: workspaceId,
        _member_id: memberId,
      });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: open && !!memberId && !!workspaceId,
  });

  const pdiItems = (profile?.pdi_items as any[]) || [];
  const recentFeedbacks = (profile?.recent_feedbacks as any[]) || [];
  const skillsData = profile?.skills_data;
  const skillsList = Array.isArray(skillsData) ? skillsData : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <UserX className="h-10 w-10 opacity-40" />
            <p className="text-sm">Perfil não encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 pb-4">
              <SheetHeader className="flex-row items-center gap-4 space-y-0">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {profile.member_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-lg tracking-tight truncate">
                    {profile.member_name}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground truncate">
                    {profile.member_role || 'Cargo não definido'}
                  </SheetDescription>
                </div>
              </SheetHeader>

              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{profile.member_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Líder: {profile.leader_name || 'Não atribuído'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Membro desde{' '}
                    {format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="feedbacks" className="flex-1 flex flex-col">
              <TabsList className="mx-6 mt-4 w-auto">
                <TabsTrigger value="feedbacks" className="gap-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Feedbacks
                </TabsTrigger>
                <TabsTrigger value="pdi" className="gap-1.5 text-xs">
                  <Target className="h-3.5 w-3.5" />
                  PDI
                </TabsTrigger>
                <TabsTrigger value="sync" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  Sync
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Skills
                </TabsTrigger>
              </TabsList>

              {/* Feedbacks */}
              <TabsContent value="feedbacks" className="flex-1 px-6 pb-6">
                <div className="flex items-center justify-between mt-3 mb-4">
                  <span className="text-sm font-medium">
                    {profile.feedback_count} feedbacks registrados
                  </span>
                  {profile.last_feedback_date && (
                    <span className="text-xs text-muted-foreground">
                      Último:{' '}
                      {format(new Date(profile.last_feedback_date), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>

                {recentFeedbacks.length === 0 ? (
                  <EmptyTab message="Nenhum feedback registrado ainda" />
                ) : (
                  <div className="space-y-3">
                    {recentFeedbacks.map((fb: any) => (
                      <Card
                        key={fb.id}
                        className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(fb.occurred_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            {fb.sentiment && (
                              <Badge
                                variant="outline"
                                className={`text-[11px] px-2 py-0.5 ${sentimentColors[fb.sentiment] || ''}`}
                              >
                                {fb.sentiment}
                              </Badge>
                            )}
                          </div>
                          {fb.title && (
                            <p className="text-sm font-medium mb-1">{fb.title}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {fb.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* PDI */}
              <TabsContent value="pdi" className="flex-1 px-6 pb-6">
                {pdiItems.length === 0 ? (
                  <EmptyTab message="Nenhum item de PDI definido ainda" />
                ) : (
                  <div className="space-y-3 mt-3">
                    {pdiItems.map((item: any) => {
                      const st = statusLabels[item.status] || statusLabels.pending;
                      return (
                        <Card
                          key={item.id}
                          className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border"
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">
                                {item.title}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={`text-[11px] px-2 py-0.5 ${st.className}`}
                              >
                                {st.label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            {item.description && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {item.category && <span>{item.category}</span>}
                              {item.due_date && (
                                <span>
                                  Meta:{' '}
                                  {format(new Date(item.due_date), 'dd/MM/yyyy', {
                                    locale: ptBR,
                                  })}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Rhitmo Sync */}
              <TabsContent value="sync" className="flex-1 px-6 pb-6">
                {!profile.work_style_data &&
                !profile.chronotype &&
                !profile.feedback_style ? (
                  <EmptyTab message="Rhitmo Sync não preenchido ainda" />
                ) : (
                  <div className="space-y-3 mt-3">
                    {profile.chronotype && (
                      <InfoCard title="Cronotipo" value={profile.chronotype} />
                    )}
                    {profile.feedback_style && (
                      <InfoCard title="Estilo de Feedback" value={profile.feedback_style} />
                    )}
                    {profile.recognition_style && (
                      <InfoCard
                        title="Estilo de Reconhecimento"
                        value={profile.recognition_style}
                      />
                    )}
                    {profile.motivators && (
                      <InfoCard
                        title="Motivadores"
                        value={renderJsonValue(profile.motivators)}
                      />
                    )}
                    {profile.user_manual && (
                      <InfoCard
                        title="Manual de Instruções"
                        value={renderJsonValue(profile.user_manual)}
                      />
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Skills */}
              <TabsContent value="skills" className="flex-1 px-6 pb-6">
                {skillsList.length === 0 ? (
                  <EmptyTab message="Mapa de habilidades não definido ainda" />
                ) : (
                  <div className="space-y-3 mt-3">
                    {skillsList.map((skill: any, i: number) => (
                      <Card
                        key={i}
                        className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border"
                      >
                        <CardContent className="p-4">
                          <p className="text-sm font-medium">
                            {skill.name || skill.skill}
                          </p>
                          {skill.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {skill.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm">{value}</p>
      </CardContent>
    </Card>
  );
}
