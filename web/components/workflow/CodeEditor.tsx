/**
 * Code Editor Component
 * Monaco Editor wrapper for displaying generated agent code
 */

'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

export interface CodeEditorProps {
  value: string;
  language: 'typescript' | 'json';
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  height?: string;
  theme?: 'vs-dark' | 'light';
}

export function CodeEditor({
  value,
  language,
  readOnly = true,
  onChange,
  height = '100%',
  theme = 'vs-dark',
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={theme}
      onChange={onChange}
      options={{
        readOnly,
        minimap: { enabled: true },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'all',
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      }
    />
  );
}
