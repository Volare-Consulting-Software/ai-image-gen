"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { REFERENCE_CHIP_PHRASE } from "@/lib/referenceImage";

const CHIP_LABEL = "Image Reference";

// Imperative handle so a parent's buttons can drive the single reference chip.
export interface PromptEditorHandle {
  insertChip(): void;
  removeChip(): void;
  hasChip(): boolean;
}

interface PromptEditorProps {
  // The serialized plain string (chip already rendered as REFERENCE_CHIP_PHRASE).
  value: string;
  onChange: (serialized: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

// A lightweight contentEditable prompt editor that supports a single inline,
// non-editable "(Image Reference)" chip. The DOM is the source of truth (React
// never re-renders its children — that would jump the caret); we only push the
// serialized string up via onChange. The chip serializes to a canonical phrase
// so every server consumer keeps seeing a plain string.
export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor(
  { value, onChange, placeholder, rows = 2, disabled = false },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);
  // The last string we emitted, so an external `value` change (e.g. a reset to
  // "") rewrites the DOM but our own edits don't fight the caret.
  const lastEmitted = useRef<string>(value);

  function buildChip(): HTMLSpanElement {
    const chip = document.createElement("span");
    chip.dataset.chip = "";
    chip.contentEditable = "false";
    chip.textContent = CHIP_LABEL;
    chip.className =
      "mx-0.5 inline-flex select-none items-center rounded-full bg-accent-dim px-2 py-0.5 align-baseline text-xs font-semibold text-accent";
    return chip;
  }

  function serialize(root: HTMLElement): string {
    const nodeToText = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as HTMLElement;
      if (el.dataset.chip !== undefined) return REFERENCE_CHIP_PHRASE;
      if (el.tagName === "BR") return "\n";
      let inner = "";
      el.childNodes.forEach((child) => {
        inner += nodeToText(child);
      });
      // Block elements (browsers wrap new lines in <div>/<p>) start a new line.
      return el.tagName === "DIV" || el.tagName === "P" ? `\n${inner}` : inner;
    };

    let text = "";
    root.childNodes.forEach((node) => {
      text += nodeToText(node);
    });
    // Normalise nbsp and collapse runs of blank lines.
    return text.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n");
  }

  function syncEmpty() {
    const el = editorRef.current;
    if (!el) return;
    const empty = (el.textContent ?? "").trim().length === 0 && !el.querySelector("[data-chip]");
    el.dataset.empty = empty ? "true" : "false";
  }

  function emitChange() {
    const el = editorRef.current;
    if (!el) return;
    const serialized = serialize(el);
    lastEmitted.current = serialized;
    syncEmpty();
    onChange(serialized);
  }

  // Initialise the DOM once, and re-sync only when `value` changes externally
  // (i.e. differs from what we last emitted) — typically a reset to "".
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    el.textContent = value;
    lastEmitted.current = value;
    syncEmpty();
  }, [value]);

  useImperativeHandle(ref, () => ({
    hasChip() {
      return !!editorRef.current?.querySelector("[data-chip]");
    },
    removeChip() {
      const el = editorRef.current;
      if (!el) return;
      el.querySelectorAll("[data-chip]").forEach((chip) => chip.remove());
      emitChange();
    },
    insertChip() {
      const el = editorRef.current;
      if (!el || disabled) return;
      if (el.querySelector("[data-chip]")) return; // single chip only

      el.focus();
      const selection = window.getSelection();
      let range: Range;
      if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
        range = selection.getRangeAt(0);
        range.deleteContents();
      } else {
        // Caret isn't in the editor — append at the end.
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }

      const chip = buildChip();
      const trailingSpace = document.createTextNode(" ");
      range.insertNode(trailingSpace);
      range.insertNode(chip);

      // Place the caret just after the trailing space.
      const after = document.createRange();
      after.setStartAfter(trailingSpace);
      after.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(after);

      emitChange();
    },
  }));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Defensive: remove the chip as a unit when backspacing right after it.
    if (event.key !== "Backspace") return;
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let prev: Node | null = null;
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
      prev = range.startContainer.previousSibling;
    } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      prev = range.startContainer.childNodes[range.startOffset - 1] ?? null;
    }
    if (prev && prev.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).dataset.chip !== undefined) {
      event.preventDefault();
      prev.parentNode?.removeChild(prev);
      emitChange();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    // Keep the editor plain-text only; strip any pasted HTML/images.
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    emitChange();
  }

  return (
    <div
      ref={editorRef}
      data-prompt-editor
      data-placeholder={placeholder}
      contentEditable={!disabled}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      tabIndex={0}
      onInput={emitChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      style={{ minHeight: `${rows * 1.5 + 1}rem` }}
      className={`w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-base p-2 text-text-primary outline-none focus:border-accent ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    />
  );
});
