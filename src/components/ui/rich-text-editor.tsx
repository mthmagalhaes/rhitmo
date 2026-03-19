import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useCallback } from 'react';
import { cleanTranscriptText } from '@/lib/textSanitizer';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  editorRef?: React.MutableRefObject<ReturnType<typeof useEditor> | null>;
  highlightWords?: string[];
}

export const RichTextEditor = ({
  content,
  onChange,
  placeholder = 'Digite aqui...',
  disabled = false,
  minHeight = '200px',
  editorRef,
  highlightWords,
}: RichTextEditorProps) => {
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editable: !disabled,
     editorProps: {
       handlePaste: (view, event) => {
         const text = event.clipboardData?.getData('text/plain');
         if (text) {
           // Limpa o texto antes de inserir (remove HTML, normaliza espaços)
           const cleanedText = cleanTranscriptText(text);
           // Insere como texto puro
           view.dispatch(
             view.state.tr.insertText(cleanedText)
           );
           return true; // Previne comportamento padrão
         }
         return false;
       },
     },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Expose editor via ref for external control (e.g., voice input)
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Apply bias highlights on detected words
  useEffect(() => {
    if (!editor || !highlightWords || highlightWords.length === 0) {
      if (editor) {
        editor.commands.unsetHighlight();
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      return;
    }

    const { doc } = editor.state;
    const tr = editor.state.tr;
    let hasMarks = false;

    doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const text = node.text.toLowerCase();
      highlightWords.forEach(word => {
        const lowerWord = word.toLowerCase();
        let index = text.indexOf(lowerWord);
        while (index !== -1) {
          tr.addMark(
            pos + index,
            pos + index + lowerWord.length,
            editor.schema.marks.highlight.create({ color: '#fde68a' })
          );
          hasMarks = true;
          index = text.indexOf(lowerWord, index + 1);
        }
      });
    });

    if (hasMarks) {
      editor.view.dispatch(tr);
    }

    // Auto-clear after 8 seconds
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      if (editor && !editor.isDestroyed) {
        editor.commands.unsetHighlight();
      }
    }, 8000);

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [editor, highlightWords]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      "rounded-lg border border-input bg-background ring-offset-background",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-input bg-muted/30 rounded-t-lg">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-label="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-label="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          aria-label="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          aria-label="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-label="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm max-w-none p-3",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit]",
          "[&_.ProseMirror.is-editor-empty]:before:content-[attr(data-placeholder)]",
          "[&_.ProseMirror.is-editor-empty]:before:text-muted-foreground",
          "[&_.ProseMirror.is-editor-empty]:before:float-left",
          "[&_.ProseMirror.is-editor-empty]:before:pointer-events-none",
          "[&_.ProseMirror.is-editor-empty]:before:h-0",
        )}
        style={{ minHeight }}
      />
    </div>
  );
};
