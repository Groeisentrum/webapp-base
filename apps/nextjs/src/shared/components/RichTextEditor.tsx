"use client";

import React, { useRef, useEffect } from "react";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Underline } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tik jou artikelinhoud hier...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Synchronize incoming value into contentEditable without breaking cursor position
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const executeCommand = (command: string, arg?: string) => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeBlock = (tag: string) => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.focus();
    }
    const cleanTag = tag.toLowerCase();
    const tagWithAngle = `<${cleanTag}>`;

    // Cross-browser formatBlock: Chromium handles both clean and angle tags, Firefox strictly prefers clean or <TAG>
    let success = false;
    try {
      success = document.execCommand("formatBlock", false, cleanTag);
    } catch {
      // ignore
    }
    if (!success) {
      try {
        document.execCommand("formatBlock", false, tagWithAngle);
      } catch {
        // ignore
      }
    }

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-(--panel-border) bg-(--panel-bg) shadow-xs">
      {/* Floating WordPress-style Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-(--panel-border) bg-(--page-bg) p-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("bold")}
          title="Vetgedruk (Ctrl+B)"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("italic")}
          title="Skuinsdruk (Ctrl+I)"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("underline")}
          title="Onderstreep"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <Underline size={15} />
        </button>

        <div className="mx-1 h-4 w-px bg-(--panel-border)" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeBlock("h2")}
          title="Groot Opskrif (H2)"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <Heading1 size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeBlock("h3")}
          title="Sub-opskrif (H3)"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <Heading2 size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeBlock("p")}
          title="Gewone paragraaf"
          className="rounded px-2 py-1 text-xs text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          Paragraaf
        </button>

        <div className="mx-1 h-4 w-px bg-(--panel-border)" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("insertUnorderedList")}
          title="Kolpuntelys"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <List size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("insertOrderedList")}
          title="Genommerde lys"
          className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
        >
          <ListOrdered size={15} />
        </button>
      </div>

      {/* The Visual WYSIWYG Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        data-placeholder={placeholder}
        className="min-h-[16rem] p-4 text-sm leading-relaxed text-(--text-primary) focus:outline-hidden prose [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1.5 [&_p]:my-1 [&_ul]:list-
  disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_li]:list-item"
      />
    </div>
  );
}