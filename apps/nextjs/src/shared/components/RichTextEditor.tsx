"use client";

    import React, { useRef, useEffect } from "react";
    import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Link, Underline } from "lucide-react";

    interface RichTextEditorProps {
      value: string;
      onChange: (html: string) => void;
      placeholder?: string;
    }

    export function RichTextEditor({ value, onChange, placeholder = "Tik jou artikelinhoud hier..." }:
  RichTextEditorProps) {
      const editorRef = useRef<HTMLDivElement>(null);

      // Synchronize incoming value into contentEditable without breaking cursor position
      useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
          editorRef.current.innerHTML = value || "";
        }
      }, [value]);

      const executeCommand = (command: string, arg?: string) => {
        document.execCommand(command, false, arg);
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
              onClick={() => executeCommand("bold")}
              title="Vetgedruk (Ctrl+B)"
              className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
            >
              <Bold size={15} />
            </button>

            <button
              type="button"
              onClick={() => executeCommand("italic")}
              title="Skuinsdruk (Ctrl+I)"
              className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
            >
              <Italic size={15} />
            </button>

            <button
              type="button"
              onClick={() => executeCommand("underline")}
              title="Onderstreep"
              className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
            >
              <Underline size={15} />
            </button>

            <div className="mx-1 h-4 w-px bg-(--panel-border)" />

            <button
              type="button"
              onClick={() => executeCommand("formatBlock", "<h2>")}
              title="Groot Opskrif"
              className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
            >
              <Heading1 size={15} />
            </button>

            <button
              type="button"
              onClick={() => executeCommand("formatBlock", "<h3>")}
              title="Sub-opskrif"
              className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
            >
              <Heading2 size={15} />
            </button>

            <button
              type="button"
              onClick={() => executeCommand("formatBlock", "<p>")}
              title="Gewone paragraaf"
              className="rounded px-2 py-1 text-xs text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--
  text-primary)"
            >
              Paragraaf
            </button>

            <div className="mx-1 h-4 w-px bg-(--panel-border)" />

            <button
              type="button"
              onClick={() => executeCommand("insertUnorderedList")}
              title="Kolpuntelys"
              className="rounded p-1.5 text-(--text-secondary) hover:bg-(--panel-bg) hover:text-(--text-primary)"
            >
              <List size={15} />
            </button>

            <button
              type="button"
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
            className="min-h-[16rem] p-4 text-sm leading-relaxed text-(--text-primary) focus:outline-hidden prose"
          />
        </div>
      );
    }