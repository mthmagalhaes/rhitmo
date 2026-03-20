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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  workspaceId: string;
}

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

            {/* Metadata Cards */}
            <div className="grid grid-cols-2 gap-3 px-6 py-4">
              <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Feedbacks
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{profile.feedback_count}</p>
                  {profile.last_feedback_date ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Último: {format(new Date(profile.last_feedback_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum registrado</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      PDI
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{profile.pdi_count}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {profile.has_pdi ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600">PDI ativo</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Sem PDI</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Tabs — only Sync & Skills */}
            <Tabs defaultValue="sync" className="flex-1 flex flex-col">
              <TabsList className="mx-6 mt-4 w-auto">
                <TabsTrigger value="sync" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  Rhitmo Sync
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Skills
                </TabsTrigger>
              </TabsList>

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
