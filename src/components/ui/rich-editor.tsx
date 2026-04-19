"use client";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Code,
  Minus,
} from "lucide-react";

/**
 * A light WYSIWYG editor built on TipTap. Output is HTML — the form
 * submits via a hidden <input name={name}> that mirrors `editor.getHTML()`
 * on every change, so the existing form-post flow continues to work.
 */
export function RichEditor({
  name,
  defaultValue = "",
  placeholder = "เริ่มเขียนคำอธิบาย…",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "text-peach-600 underline underline-offset-2" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[220px] px-4 py-3 focus:outline-none prose-headings:text-teal-700 prose-p:my-2 prose-a:text-peach-600",
      },
    },
  });

  if (!editor) {
    return (
      <div className="rounded-xl border border-peach-200 bg-cream/40 min-h-[260px] animate-pulse" />
    );
  }

  return (
    <div className="rounded-xl border border-peach-200 bg-white overflow-hidden focus-within:border-peach-500 focus-within:ring-3 focus-within:ring-peach-500/15 transition">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Hidden mirror input so the surrounding <form> submits the HTML */}
      <input
        type="hidden"
        name={name}
        value={editor.getHTML() === "<p></p>" ? "" : editor.getHTML()}
        readOnly
      />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-peach-100 bg-cream/60 px-2 py-1.5">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold">
        <Bold className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic">
        <Italic className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strike">
        <Strikethrough className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} label="Code">
        <Code className="w-3.5 h-3.5" />
      </Btn>
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        label="Heading 2"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        label="Heading 3"
      >
        <Heading3 className="w-3.5 h-3.5" />
      </Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list">
        <List className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Ordered list">
        <ListOrdered className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote">
        <Quote className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider">
        <Minus className="w-3.5 h-3.5" />
      </Btn>
      <Sep />
      <Btn
        onClick={() => {
          const prev = editor.getAttributes("link").href;
          const url = window.prompt("ลิงก์ URL", prev || "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
        active={editor.isActive("link")}
        label="Link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo">
        <Undo2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo">
        <Redo2 className="w-3.5 h-3.5" />
      </Btn>
    </div>
  );
}

function Btn({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition ${
        active
          ? "bg-peach-500 text-white"
          : "text-ink/60 hover:bg-peach-100 hover:text-peach-700 disabled:opacity-40 disabled:cursor-not-allowed"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 w-px h-4 bg-peach-200" />;
}
