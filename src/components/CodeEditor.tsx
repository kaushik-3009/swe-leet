"use client";

import { useTheme } from "@/components/ThemeProvider";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export default function CodeEditor({ value, onChange, height = "min(72vh, 760px)" }: CodeEditorProps) {
  const { theme } = useTheme();

  return (
    <div className="code-editor-shell" style={{ background: "var(--card)" }}>
      <CodeMirror
        value={value}
        height={height}
        theme={theme === "dark" ? oneDark : undefined}
        extensions={[python()]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
          autocompletion: true,
        }}
        className="code-editor"
        aria-label="Python implementation editor"
      />
    </div>
  );
}
