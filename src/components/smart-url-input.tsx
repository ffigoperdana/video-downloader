"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Spinner from "@/components/ui/spinner";

interface SmartUrlInputProps {
  platformName: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onFetch: () => void;
  disabled: boolean;
  fetching: boolean;
  glowClassName: string;
  focusBorderClassName: string;
  fetchButtonClassName: string;
  fetchButtonStyle?: CSSProperties;
}

/**
 * Shared URL field for every downloader. It keeps clipboard handling and the
 * Paste/Clear affordance consistent without requiring a clipboard permission
 * until the visitor explicitly presses Paste.
 */
export default function SmartUrlInput({
  platformName,
  placeholder,
  value,
  onValueChange,
  onFetch,
  disabled,
  fetching,
  glowClassName,
  focusBorderClassName,
  fetchButtonClassName,
  fetchButtonStyle,
}: SmartUrlInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clipboardMessage, setClipboardMessage] = useState("");
  const hasUrl = Boolean(value.trim());

  const handlePasteOrClear = async () => {
    setClipboardMessage("");

    if (hasUrl) {
      onValueChange("");
      inputRef.current?.focus();
      return;
    }

    if (!navigator.clipboard?.readText) {
      setClipboardMessage("Clipboard access is unavailable. Paste the URL into the field.");
      inputRef.current?.focus();
      return;
    }

    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (!clipboardText) {
        setClipboardMessage("Your clipboard is empty.");
        inputRef.current?.focus();
        return;
      }

      onValueChange(clipboardText);
      inputRef.current?.focus();
    } catch {
      setClipboardMessage("Allow clipboard access, then try Paste again.");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !disabled && hasUrl) {
      onFetch();
    }
  };

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${glowClassName} opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity pointer-events-none`}
      />
      <div
        className={`relative flex gap-1.5 sm:gap-2 glass rounded-2xl p-2 border border-white/6 ${focusBorderClassName} transition-colors`}
      >
        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={placeholder}
          aria-label={`${platformName} URL`}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handlePasteOrClear}
          disabled={disabled}
          aria-label={
            hasUrl
              ? `Clear ${platformName} URL and result`
              : `Paste ${platformName} URL from clipboard`
          }
          className="flex-shrink-0 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasUrl ? "Clear" : "Paste"}
        </button>
        <button
          type="button"
          onClick={onFetch}
          disabled={disabled || !hasUrl}
          aria-label={`Fetch ${platformName} media`}
          className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-xl text-sm font-syne font-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg ${fetchButtonClassName}`}
          style={fetchButtonStyle}
        >
          {fetching ? (
            <span className="flex items-center gap-1.5">
              <Spinner /> Fetching
            </span>
          ) : (
            "Fetch"
          )}
        </button>
      </div>
      {clipboardMessage && (
        <p className="mt-2 px-1 text-xs text-amber-300/90" role="status">
          {clipboardMessage}
        </p>
      )}
    </div>
  );
}
