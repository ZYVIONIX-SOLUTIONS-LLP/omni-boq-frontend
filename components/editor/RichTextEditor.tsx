import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { Bold, Type, Minus, Plus } from 'lucide-react'

// Current font sizes sequence in px
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28]

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function RichTextEditor({ content, onChange, placeholder, className, readOnly = false }: RichTextEditorProps) {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none [&_p]:my-0 [&_p]:leading-normal ${className || ''}`,
      },
    },
  })

  if (!editor) return null

  const increaseFontSize = () => {
    // Get current font size
    const currentSize = editor.getAttributes('textStyle').fontSize
    let sizePx = 12 // default base
    if (currentSize && currentSize.endsWith('px')) {
      sizePx = parseInt(currentSize.replace('px', ''))
    }
    const nextSize = FONT_SIZES.find(s => s > sizePx) || FONT_SIZES[FONT_SIZES.length - 1]
    editor.commands.setFontSize(`${nextSize}px`)
  }

  const decreaseFontSize = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize
    let sizePx = 12 // default base
    if (currentSize && currentSize.endsWith('px')) {
      sizePx = parseInt(currentSize.replace('px', ''))
    }
    const nextSize = [...FONT_SIZES].reverse().find(s => s < sizePx) || FONT_SIZES[0]
    editor.commands.setFontSize(`${nextSize}px`)
  }

  return (
    <>
      {editor && (
        <BubbleMenu 
          editor={editor} 
          className="flex items-center gap-1 bg-slate-800 text-white rounded-lg shadow-xl p-1 border border-slate-700 z-50"
        >
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
            className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${editor.isActive('bold') ? 'bg-purple-600 text-white' : 'text-slate-200'}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-slate-600 mx-1" />
          
          <div className="flex items-center px-1 text-slate-300">
            <Type className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span className="text-[10px] font-medium min-w-[20px] text-center">
              {editor.getAttributes('textStyle').fontSize?.replace('px', '') || '12'}
            </span>
          </div>

          <button
            onClick={(e) => { e.preventDefault(); decreaseFontSize() }}
            className="p-1 rounded hover:bg-slate-700 text-slate-200 transition-colors"
            title="Decrease Font Size"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); increaseFontSize() }}
            className="p-1 rounded hover:bg-slate-700 text-slate-200 transition-colors"
            title="Increase Font Size"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </>
  )
}
