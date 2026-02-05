 import { Trash2, ChevronDown } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
 } from '@/components/ui/collapsible';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
 } from '@/components/ui/alert-dialog';
 import { cn } from '@/lib/utils';
 import { getTagEmoji, getTagColor } from '@/lib/tagConfig';
 import { cleanTranscriptText, containsHtml } from '@/lib/textSanitizer';
 import DOMPurify from 'dompurify';
 
 interface Feedback {
   id: string;
   created_at: string;
   occurred_at?: string;
   content: string;
   type: 'positive' | 'constructive' | 'neutral';
   tags?: string[];
   title?: string | null;
 }
 
 interface FeedbackTimelineProps {
   feedbacks: Feedback[];
   onDelete?: (id: string) => void;
 }
 
 // Função para renderizar conteúdo sanitizado
 const renderSanitizedContent = (content: string) => {
   if (!content) return null;
   
   // Verificar se contém HTML
   if (containsHtml(content)) {
     // Sanitizar HTML e renderizar com estilos prose
     return (
       <div 
         className="prose prose-sm max-w-none text-foreground dark:prose-invert"
         dangerouslySetInnerHTML={{ 
           __html: DOMPurify.sanitize(content, {
             ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
             ALLOWED_ATTR: []
           }) 
         }} 
       />
     );
   }
   
   // Texto puro: limpar e usar whitespace-pre-wrap
   const cleanedText = cleanTranscriptText(content);
   return (
     <p className="whitespace-pre-wrap text-foreground leading-relaxed">
       {cleanedText}
     </p>
   );
 };
 
 export const FeedbackTimeline = ({ feedbacks, onDelete }: FeedbackTimelineProps) => {
   return (
     <div className="space-y-2">
       {feedbacks.map((feedback) => {
         const displayTitle = feedback.title || "📝 Anotação não classificada";
         const isFallbackTitle = !feedback.title;
         const formattedDate = new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR');
         
         return (
           <Collapsible key={feedback.id} className="group">
             <div className="flex items-center rounded-lg border bg-card hover:bg-muted/50 transition-colors">
               {/* Trigger Area - Data + Título + Tags + Chevron */}
               <CollapsibleTrigger className="flex-1 flex items-center gap-3 p-4 text-left">
                 {/* Data */}
                 <span className="text-sm text-muted-foreground whitespace-nowrap">
                   📅 {formattedDate}
                 </span>
                 
                 {/* Título com Fallback */}
                 <span className={cn(
                   "font-medium truncate",
                   isFallbackTitle ? "text-muted-foreground italic" : "text-foreground"
                 )}>
                   {displayTitle}
                 </span>
                 
                 {/* Tags (se existirem) */}
                 {feedback.tags && feedback.tags.length > 0 && (
                   <div className="hidden sm:flex flex-wrap gap-1 shrink-0">
                     {feedback.tags.map((tag) => (
                       <Badge 
                         key={tag} 
                         variant="outline" 
                         className={cn("text-xs py-0.5 px-2 border", getTagColor(tag))}
                       >
                         {getTagEmoji(tag)} {tag}
                       </Badge>
                     ))}
                   </div>
                 )}
                 
                 {/* Chevron */}
                 <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 ml-auto" />
               </CollapsibleTrigger>
               
               {/* Delete Button (fora do trigger para evitar conflito) */}
               {onDelete && (
                 <div className="pr-3">
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                         aria-label="Excluir feedback"
                         onClick={(e) => e.stopPropagation()}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                         <AlertDialogDescription>
                           Tem certeza que deseja excluir este feedback? 
                           Esta ação não pode ser desfeita.
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>Cancelar</AlertDialogCancel>
                         <AlertDialogAction 
                           onClick={() => onDelete(feedback.id)}
                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                         >
                           Excluir
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                 </div>
               )}
             </div>
             
             {/* Conteúdo Expandido */}
             <CollapsibleContent>
               <div className="px-4 py-3 border-x border-b rounded-b-lg bg-muted/30">
                 {/* Tags em mobile (repetidas aqui para visibilidade) */}
                 {feedback.tags && feedback.tags.length > 0 && (
                   <div className="flex sm:hidden flex-wrap gap-1.5 mb-3">
                     {feedback.tags.map((tag) => (
                       <Badge 
                         key={tag} 
                         variant="outline" 
                         className={cn("text-xs py-0.5 px-2 border", getTagColor(tag))}
                       >
                         {getTagEmoji(tag)} {tag}
                       </Badge>
                     ))}
                   </div>
                 )}
                 
                 {/* Conteúdo Sanitizado */}
                 {renderSanitizedContent(feedback.content)}
               </div>
             </CollapsibleContent>
           </Collapsible>
         );
       })}
     </div>
   );
 };
