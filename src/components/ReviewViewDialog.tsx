import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer, Pencil, Trash2, TrendingUp, Share2, EyeOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactMarkdown from 'react-markdown';
import { citationMarkdownComponents } from '@/lib/markdownCitations';
import { CitationCounterProvider } from '@/components/context/CitationCounterProvider';
import { marked } from 'marked';
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import DOMPurify from 'dompurify';
import { useQueryClient } from "@tanstack/react-query";

interface PerformanceReview {
  id: string;
  title: string;
  content: string;
  coaching_tip?: string | null;
  period_type: string;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
  shared_with_member?: boolean;
}

interface ReviewViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: PerformanceReview;
  memberId: string;
  memberName?: string;
  onReviewUpdated: () => void;
  onReviewDeleted: () => void;
}

export const ReviewViewDialog = ({ 
  open, 
  onOpenChange, 
  review,
  memberId,
  memberName,
  onReviewUpdated,
  onReviewDeleted
}: ReviewViewDialogProps) => {
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(review.title);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert Markdown to HTML for the editor when editing starts
  useEffect(() => {
    if (editing) {
      const content = review.content;
      // Check if already HTML or Markdown
      const htmlContent = content.includes('</') ? content : marked.parse(content) as string;
      setEditedContent(htmlContent);
    }
  }, [editing, review.content]);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível abrir a janela de impressão.",
        variant: "destructive",
      });
      return;
    }

    // SECURITY (xss_print_review): review.title comes from the database and
    // can be set by another user (the manager). Never interpolate it raw into
    // document.write — escape entities first. The body HTML must also pass
    // through DOMPurify because review.content can be markdown-or-HTML user
    // input.
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const rawHtml = review.content.includes('</')
      ? review.content
      : (marked(review.content) as string);
    const htmlContent = DOMPurify.sanitize(rawHtml);
    const safeTitle = esc(review.title || '');
    const safeMemberName = memberName ? esc(memberName) : '';

    // Formatar período avaliado
    const periodStart = review.period_start 
      ? new Date(review.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;
    const periodEnd = review.period_end 
      ? new Date(review.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;
    
    const periodText = periodStart && periodEnd 
      ? `${periodStart} a ${periodEnd}` 
      : 'Período não especificado';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            @page {
              margin: 0;
              size: A4;
            }
            
            * {
              box-sizing: border-box;
            }
            
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .document {
              padding: 2cm;
              max-width: 100%;
              height: auto;
            }
            
            /* Header */
            .header {
              border-bottom: 3px solid #7C3AED;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            h1 {
              color: #222;
              margin: 0 0 16px 0;
              font-size: 24px;
            }
            
            .metadata {
              color: #666;
              font-size: 0.9em;
            }
            
            .metadata p {
              margin: 4px 0;
            }
            
            .period-highlight {
              background-color: #F3F4F6;
              padding: 8px 12px;
              border-radius: 4px;
              margin-top: 12px;
              display: inline-block;
            }
            
            /* Content Styles */
            h2 { 
              color: #444; 
              margin-top: 28px;
              margin-bottom: 12px;
              font-size: 18px;
            }
            
            h3 {
              color: #555;
              margin-top: 20px;
              margin-bottom: 10px;
              font-size: 16px;
            }
            
            ul, ol { 
              padding-left: 24px;
              margin: 12px 0;
            }
            
            li {
              margin: 6px 0;
            }
            
            p {
              margin: 10px 0;
            }
            
            strong {
              color: #222;
            }
            
            /* Evitar página em branco */
            .content {
              height: auto !important;
              page-break-inside: auto;
            }
            
            @media print {
              .document {
                padding: 1.5cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header">
              <h1>${safeTitle}</h1>
              <div class="metadata">
                ${safeMemberName ? `<p><strong>Colaborador:</strong> ${safeMemberName}</p>` : ''}
                <p><strong>Data de Criação:</strong> ${new Date(review.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}</p>
                <div class="period-highlight">
                  <strong>📅 Período Avaliado:</strong> ${esc(periodText)}
                </div>
              </div>
            </div>
            <div class="content">
              ${htmlContent}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleSave = async () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          title: editedTitle.trim(),
          content: editedContent.trim(),
        })
        .eq('id', review.id);

      if (error) throw error;

      // Invalidar cache para forçar refetch com dados novos
      await queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] });

      toast({
        title: "Avaliação atualizada! ✅",
        description: "As alterações foram salvas.",
      });

      onReviewUpdated();
      setEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('performance_reviews')
        .delete()
        .eq('id', review.id);

      if (error) throw error;

      toast({
        title: "Avaliação excluída",
        description: "A avaliação foi removida com sucesso.",
      });

      onReviewDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao deletar avaliação:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover a avaliação.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {editing ? "Editar Avaliação" : review.title}
              <div className="flex gap-2">
                {!editing && (
                  <>
                    {review.shared_with_member ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sharing}
                        onClick={async () => {
                          setSharing(true);
                          try {
                            const { error } = await supabase
                              .from('performance_reviews')
                              .update({ shared_with_member: false } as any)
                              .eq('id', review.id);
                            if (error) throw error;
                            toast({ title: "Acesso revogado", description: `${memberName || 'O liderado'} não pode mais ver esta avaliação.` });
                            onReviewUpdated();
                          } catch { toast({ title: "Erro", variant: "destructive" }); }
                          finally { setSharing(false); }
                        }}
                        className="gap-2 text-muted-foreground"
                      >
                        <EyeOff className="h-4 w-4" />
                        Revogar acesso
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sharing}
                        onClick={async () => {
                          setSharing(true);
                          try {
                            const { error } = await supabase
                              .from('performance_reviews')
                              .update({ shared_with_member: true } as any)
                              .eq('id', review.id);
                            if (error) throw error;
                            toast({ title: "Avaliação compartilhada ✅", description: `${memberName || 'O liderado'} agora pode ver esta avaliação no portal dele.` });
                            onReviewUpdated();

                            // Fire-and-forget: send email notification
                            try {
                              const { data: memberData } = await supabase
                                .from('team_members')
                                .select('name, email')
                                .eq('id', memberId)
                                .single();

                              const { data: { user: currentUser } } = await supabase.auth.getUser();
                              const leaderName = currentUser?.user_metadata?.full_name || 'Seu líder';

                              if (memberData?.email) {
                                supabase.functions.invoke('notify-review-shared', {
                                  body: { reviewId: review.id },
                                }).catch(err => console.error('Email notification failed:', err));
                              }
                            } catch (emailErr) {
                              console.error('Failed to send review notification email:', emailErr);
                            }
                          } catch { toast({ title: "Erro", variant: "destructive" }); }
                          finally { setSharing(false); }
                        }}
                        className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      >
                        <Share2 className="h-4 w-4" />
                        Compartilhar com liderado
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPDF}
                      className="gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
            {!editing && (
              <DialogDescription>
                Criado em {new Date(review.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </DialogDescription>
            )}
          </DialogHeader>

          {review.coaching_tip && !editing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg print:hidden">
              <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                💡 Dicas para Apresentação (Visível apenas para você)
              </p>
              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                <CitationCounterProvider>
                  <ReactMarkdown components={citationMarkdownComponents}>{review.coaching_tip}</ReactMarkdown>
                </CitationCounterProvider>
              </div>
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Conteúdo</Label>
                <RichTextEditor
                  content={editedContent}
                  onChange={setEditedContent}
                  placeholder="Edite o conteúdo da avaliação..."
                  minHeight="400px"
                />
              </div>
            </div>
          ) : (
<div className="prose prose-sm max-w-none dark:prose-invert prose-p:mb-4 prose-p:leading-relaxed prose-headings:mb-3 prose-headings:mt-6 prose-ul:my-4 prose-ol:my-4">
              {review.content.includes('</') ? (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.content) }} />
              ) : (
                <CitationCounterProvider>
                  <ReactMarkdown components={citationMarkdownComponents}>{review.content}</ReactMarkdown>
                </CitationCounterProvider>
              )}
            </div>
          )}

          {editing && (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditing(false);
                  setEditedTitle(review.title);
                  setEditedContent(review.content);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A avaliação será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};