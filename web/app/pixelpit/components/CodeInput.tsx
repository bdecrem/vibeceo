'use client';

import React, { useCallback } from 'react';

interface CodeInputProps {
  value: string[];
  onChange: (digits: string[]) => void;
  colors: {
    bg: string;
    border: string;
    text: string;
  };
  /** Optional prefix for input IDs (default: 'code') */
  idPrefix?: string;
}

/**
 * 4-digit code input component with auto-focus advancement.
 *
 * Used for account verification codes in the Pixelpit auth flow.
 *
 * @example
 * ```tsx
 * const [digits, setDigits] = useState(['', '', '', '']);
 *
 * <CodeInput
 *   value={digits}
 *   onChange={setDigits}
 *   colors={{ bg: '#0a0f1a', border: '#fbbf24', text: '#f8fafc' }}
 * />
 * ```
 */
export function CodeInput({ value, onChange, colors, idPrefix = 'code' }: CodeInputProps) {
  const handleInput = useCallback((index: number, inputValue: string) => {
    // Take only first character if multiple pasted
    let char = inputValue.length > 1 ? inputValue[0] : inputValue;

    // Only allow alphanumeric
    if (char && !/^[a-zA-Z0-9]$/.test(char)) return;

    const newDigits = [...value];
    newDigits[index] = char;
    onChange(newDigits);

    // Auto-focus next input
    if (char && index < 3) {
      const nextInput = document.getElementById(`${idPrefix}-${index + 1}`);
      nextInput?.focus();
    }
  }, [value, onChange, idPrefix]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // On backspace with empty input, focus previous
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`${idPrefix}-${index - 1}`);
      prevInput?.focus();
    }
  }, [value, idPrefix]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').slice(0, 4);
    const newDigits = [...value];

    for (let i = 0; i < Math.min(pastedText.length, 4); i++) {
      if (/^[a-zA-Z0-9]$/.test(pastedText[i])) {
        newDigits[i] = pastedText[i];
      }
    }

    onChange(newDigits);

    // Focus the input after last filled digit
    const focusIndex = Math.min(pastedText.length, 3);
    const input = document.getElementById(`${idPrefix}-${focusIndex}`);
    input?.focus();
  }, [value, onChange, idPrefix]);

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          type="text"
          value={value[i]}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          maxLength={1}
          autoComplete="off"
          autoCapitalize="characters"
          style={{
            width: 40,
            height: 48,
            fontSize: 20,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: colors.text,
            textAlign: 'center',
            textTransform: 'uppercase',
            outline: 'none',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Get the combined code string from digits array
 */
export function getCodeFromDigits(digits: string[]): string {
  return digits.join('');
}

/**
 * Check if code is complete (all 4 digits filled)
 */
export function isCodeComplete(digits: string[]): boolean {
  return digits.every(d => d.length === 1);
}
