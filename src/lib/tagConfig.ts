 // Smart Tags Configuration - Shared between creation and display components
 
 export const TAG_CONFIG: Record<string, { emoji: string; color: string }> = {
   "1:1": { 
     emoji: "🎯", 
     color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" 
   },
   "PDI": { 
     emoji: "🚀", 
     color: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800" 
   },
   "Feedback Difícil": { 
     emoji: "🚨", 
     color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" 
   },
   "Check-in": { 
     emoji: "✅", 
     color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" 
   },
   "Reunião Geral": { 
     emoji: "📢", 
     color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800" 
   },
   "Brainstorming": { 
     emoji: "🧠", 
     color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" 
   },
 };
 
 export const VALID_TAGS = Object.keys(TAG_CONFIG);
 
 export const getTagEmoji = (tag: string): string => {
   return TAG_CONFIG[tag]?.emoji || "📝";
 };
 
 export const getTagColor = (tag: string): string => {
   return TAG_CONFIG[tag]?.color || "bg-muted text-muted-foreground";
 };