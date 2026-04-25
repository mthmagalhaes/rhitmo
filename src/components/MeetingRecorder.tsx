import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Monitor, Loader2, CheckCircle, Copy, Check, ExternalLink, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface MeetingRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId?: string;
  memberName?: string;
}

type RecorderState = 'idle' | 'recording-external' | 'done';

const CHANNEL_NAME = 'rhitmo-recorder';

export const MeetingRecorder = ({ open, onOpenChange, memberId, memberName }: MeetingRecorderProps) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [externalDuration, setExternalDuration] = useState(0);
  const [externalStatus, setExternalStatus] = useState<string>('recording');

  // Replication states
  const [feedbackContent, setFeedbackContent] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackTitle, setFeedbackTitle] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [replicateMembers, setReplicateMembers] = useState<string[]>([]);
  const [replicateShared, setReplicateShared] = useState<Record<string, boolean>>({});
  const [isReplicating, setIsReplicating] = useState(false);
  const [replicationDone, setReplicationDone] = useState(false);

  const popupRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const { toast } = useToast();
  const { canRecord, limits, recordingHoursRemaining } = usePlanLimits();
  const navigate = useNavigate();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Listen for BroadcastChannel messages from popup
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg?.type) return;

      switch (msg.type) {
        case 'status':
          if (msg.state === 'recording') {
            setExternalDuration(msg.duration || 0);
            setExternalStatus('recording');
          } else if (msg.state === 'converting') {
            setExternalStatus('converting');
          } else if (msg.state === 'uploading') {
            setExternalStatus('uploading');
          }
          break;

        case 'done':
          setTranscriptId(msg.transcript_id);
          setFeedbackId(msg.feedback_id || null);
          setFeedbackContent(msg.feedback_content || null);
          setFeedbackTitle(msg.feedback_title || null);
          setState('done');
          loadWorkspaceMembers();
          toast({
            title: msg.transcribed ? 'Transcrição salva como nota!' : 'Gravação enviada!',
            description: msg.transcribed
              ? 'A transcrição foi adicionada ao diário de bordo.'
              : 'O áudio está sendo processado.',
          });
          break;

        case 'popup-ready':
          // Popup is open and ready
          break;
      }
    };

    return () => { channel.close(); };
  }, []);

  // Load workspace members for replication
  const loadWorkspaceMembers = useCallback(async () => {
    if (!memberId) return;
    const { data: memberData } = await supabase
      .from('team_members')
      .select('id, team_id, teams!inner(workspace_id)')
      .eq('id', memberId)
      .single();
    if (!memberData?.teams) return;
    const workspaceId = (memberData.teams as any).workspace_id;
    const { data: members } = await supabase
      .from('team_members')
      .select('id, name, role, teams!inner(workspace_id)')
      .eq('teams.workspace_id', workspaceId)
      .neq('id', memberId)
      .order('name');
    if (members) setAllMembers(members);
  }, [memberId]);

  const handleReplicate = async () => {
    if (replicateMembers.length === 0 || !feedbackContent) return;
    setIsReplicating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      for (const mid of replicateMembers) {
        const { data: feedback, error } = await supabase
          .from('feedbacks')
          .insert({
            member_id: mid,
            manager_id: user.id,
            content: feedbackContent,
            title: feedbackTitle || null,
            source: 'transcription',
            type: 'neutral',
            occurred_at: new Date().toISOString(),
            visibility: replicateShared[mid] ? 'shared' : 'private_leader',
          })
          .select('id')
          .single();
        if (error) { console.error('Replication error:', error); continue; }
        if (feedback?.id) {
          supabase.functions.invoke('analyze-feedback-background', {
            body: { feedbackId: feedback.id }
          }).catch(err => console.warn('Background analysis failed:', err));
        }
      }
      toast({
        title: `Nota replicada para ${replicateMembers.length} liderado(s)! ✨`,
        description: 'Cada nota receberá análise de IA individual.',
      });
      setReplicationDone(true);
    } catch (err: any) {
      toast({ title: 'Erro na replicação', description: err.message, variant: 'destructive' });
    } finally {
      setIsReplicating(false);
    }
  };

  const openRecorderPopup = useCallback(() => {
    const params = new URLSearchParams();
    if (memberId) params.set('memberId', memberId);
    if (memberName) params.set('memberName', memberName);
    if (meetingTitle.trim()) params.set('title', meetingTitle.trim());

    const w = 420;
    const h = 520;
    const left = window.screenX + window.outerWidth - w - 40;
    const top = window.screenY + 80;

    const popup = window.open(
      `/recorder?${params.toString()}`,
      'rhitmo-recorder',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );

    if (popup) {
      popupRef.current = popup;
      setState('recording-external');
    } else {
      toast({
        title: 'Popup bloqueado',
        description: 'Permita popups para rhitmo.co nas configurações do navegador.',
        variant: 'destructive',
      });
    }
  }, [memberId, memberName, meetingTitle, toast]);

  const focusPopup = useCallback(() => {
    popupRef.current?.focus();
  }, []);

  // Check if popup was closed externally
  useEffect(() => {
    if (state !== 'recording-external') return;
    const interval = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        // Popup was closed — if we didn't get a 'done', reset
        if (state === 'recording-external') {
          setState('idle');
          toast({
            title: 'Gravação encerrada',
            description: 'A janela de gravação foi fechada.',
          });
        }
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state, toast]);

  // Reset on dialog close
  useEffect(() => {
    if (!open) {
      setState('idle');
      setMeetingTitle('');
      setTranscriptId(null);
      setExternalDuration(0);
      setExternalStatus('recording');
      setFeedbackContent(null);
      setFeedbackId(null);
      setFeedbackTitle(null);
      setAllMembers([]);
      setReplicateMembers([]);
      setReplicateShared({});
      setIsReplicating(false);
      setReplicationDone(false);
    }
  }, [open]);

  const toggleReplicateMember = (id: string) => {
    setReplicateMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (state === 'recording-external') {
        // Allow closing dialog — popup continues independently
      }
      onOpenChange(v);
    }}>
      <DialogContent className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] max-w-md">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Gravar Reunião</DialogTitle>
          <DialogDescription>
            {memberName
              ? `Captura de áudio da aba para ${memberName}`
              : 'Captura de áudio de uma aba do navegador'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Idle state */}
          {state === 'idle' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Título da reunião (opcional)</Label>
                <Input
                  id="meeting-title"
                  placeholder="Ex: 1:1 Semanal"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Monitor className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Uma janela de gravação será aberta. Selecione a aba do Google Meet e marque <strong>"Compartilhar áudio da aba"</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Você poderá continuar usando a Rhitmo normalmente enquanto grava.
                </p>
              </div>

              {!canRecord ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {limits.maxRecordingHours === 0
                      ? `Gravação não disponível no plano ${limits.planName}`
                      : `Limite de ${limits.maxRecordingHours}h de gravação/mês atingido`}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Faça upgrade para gravar reuniões.
                  </p>
                </div>
              ) : (
                <>
                  {recordingHoursRemaining !== Infinity && recordingHoursRemaining < 2 && (
                    <p className="text-xs text-amber-600 text-center">
                      ⚠️ Restam {recordingHoursRemaining.toFixed(1)}h de gravação neste mês
                    </p>
                  )}
                  <Button onClick={openRecorderPopup} className="w-full gap-2 rounded-xl" size="lg">
                    <Monitor className="h-5 w-5" />
                    Iniciar Gravação
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Recording in external popup */}
          {state === 'recording-external' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-muted/50 rounded-2xl p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  {externalStatus === 'recording' ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm font-medium text-destructive">Gravando em janela externa</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {externalStatus === 'converting' ? 'Processando áudio...' : 'Enviando gravação...'}
                      </span>
                    </>
                  )}
                </div>

                {externalStatus === 'recording' && (
                  <p className="text-3xl font-mono font-bold tracking-tight text-foreground">
                    {formatDuration(externalDuration)}
                  </p>
                )}

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Radio className="h-3.5 w-3.5 text-primary" />
                  <span>Você pode navegar na Rhitmo — a gravação continua na outra janela</span>
                </div>
              </div>

              <Button
                onClick={focusPopup}
                variant="outline"
                className="w-full gap-2 rounded-xl"
              >
                <ExternalLink className="h-4 w-4" />
                Ver janela de gravação
              </Button>
            </div>
          )}

          {/* Done state */}
          {state === 'done' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-muted/50 rounded-2xl p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Transcrição salva!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O áudio foi transcrito e adicionado como nota ao diário de bordo.
                  </p>
                </div>
              </div>

              {/* Replication section */}
              {feedbackContent && allMembers.length > 0 && !replicationDone && (
                <div className="border border-border rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Copy className="h-4 w-4 text-muted-foreground" />
                      Esta gravação envolve outros liderados?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A transcrição será replicada para os selecionados com análise de IA individual.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allMembers.map((member) => (
                      <div key={member.id} className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <Checkbox
                            checked={replicateMembers.includes(member.id)}
                            onCheckedChange={() => toggleReplicateMember(member.id)}
                            disabled={isReplicating}
                          />
                          <span className="text-sm">{member.name}</span>
                          <span className="text-xs text-muted-foreground">• {member.role}</span>
                        </label>
                        {replicateMembers.includes(member.id) && (
                          <div className="flex items-center gap-2 ml-6">
                            <Switch
                              checked={replicateShared[member.id] || false}
                              onCheckedChange={(checked) =>
                                setReplicateShared(prev => ({ ...prev, [member.id]: checked }))
                              }
                              disabled={isReplicating}
                              className="scale-75"
                            />
                            <span className="text-xs text-muted-foreground">
                              Compartilhar com {member.name.split(' ')[0]}?
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {replicateMembers.length > 0 && (
                    <Button
                      onClick={handleReplicate}
                      disabled={isReplicating}
                      className="w-full rounded-xl gap-2"
                      size="sm"
                    >
                      {isReplicating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Replicar para {replicateMembers.length} selecionado(s)
                    </Button>
                  )}
                </div>
              )}

              {replicationDone && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                    <Check className="h-4 w-4" />
                    Replicação concluída!
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
