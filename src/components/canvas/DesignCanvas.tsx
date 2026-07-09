"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import type { Editor, TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { useTheme } from "@/components/ThemeProvider";

const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--card-elevated)" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }} />
    </div>
  ),
});

interface Props {
  snapshot?: TLStoreSnapshot;
  readOnly?: boolean;
  /** Debounced callback fired ~800ms after the user stops editing. */
  onChange?: (snapshot: TLStoreSnapshot) => void;
  height?: string;
}

export default function DesignCanvas({ snapshot, readOnly, onChange, height = "560px" }: Props) {
  const { theme } = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMount = useCallback(
    (editor: Editor) => {
      if (readOnly) {
        editor.updateInstanceState({ isReadonly: true });
      }
      if (!onChange) return;
      const unlisten = editor.store.listen(
        () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            onChange(editor.store.getStoreSnapshot());
          }, 800);
        },
        { source: "user", scope: "document" }
      );
      return unlisten;
    },
    [onChange, readOnly]
  );

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ border: "1px solid var(--border)", height, boxShadow: "var(--shadow-sm)" }}
    >
      <Tldraw
        snapshot={snapshot}
        onMount={handleMount}
        colorScheme={theme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
