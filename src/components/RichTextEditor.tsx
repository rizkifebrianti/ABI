import React, { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  id: string;
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  compact?: boolean;
  serif?: boolean;
  maxHeightClass?: string;
  onNotify?: (msg: string, type?: 'info' | 'warning' | 'success' | 'error') => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  placeholder = '',
  compact = false,
  serif = false,
  maxHeightClass = '',
  onNotify
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const execCmd = (command: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, undefined);
    onChange(el.innerHTML);
  };

  const transformUppercase = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const selectedText = sel.toString();
    if (!selectedText) {
      onNotify?.('Sorot/blok terlebih dahulu kata yang ingin diubah ke huruf KAPITAL.', 'info');
      return;
    }
    document.execCommand('insertText', false, selectedText.toUpperCase());
    onChange(el.innerHTML);
  };

  return (
    <div className="border-2 border-zinc-900 rounded-xl overflow-hidden bg-white focus-within:shadow-[3px_3px_0px_#18181B] transition-shadow">
      <div className="bg-[#FAF7F0] border-b-2 border-zinc-900 px-2.5 py-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('bold');
          }}
          className="px-2.5 py-0.5 rounded-md bg-white hover:bg-[#FEF08A] border-2 border-zinc-900 text-xs font-extrabold text-zinc-900"
          title="Tebal (Bold)"
          aria-label="Tebal"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('italic');
          }}
          className="px-2.5 py-0.5 rounded-md bg-white hover:bg-[#FEF08A] border-2 border-zinc-900 text-xs italic font-serif font-bold text-zinc-900"
          title="Miring (Italic)"
          aria-label="Miring"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('underline');
          }}
          className="px-2.5 py-0.5 rounded-md bg-white hover:bg-[#FEF08A] border-2 border-zinc-900 text-xs underline font-bold text-zinc-900"
          title="Garis Bawah (Underline)"
          aria-label="Garis Bawah"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            transformUppercase();
          }}
          className="px-2.5 py-0.5 rounded-md bg-white hover:bg-[#FEF08A] border-2 border-zinc-900 text-[11px] font-bold text-zinc-900"
          title="Ubah Teks Terpilih ke Huruf KAPITAL"
        >
          KAPITAL
        </button>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className={`rich-editor p-3 text-sm text-zinc-900 ${compact ? '!min-h-[44px] p-2.5' : ''} ${
          serif ? 'font-serif text-zinc-800' : ''
        } ${maxHeightClass}`}
      />
    </div>
  );
};
