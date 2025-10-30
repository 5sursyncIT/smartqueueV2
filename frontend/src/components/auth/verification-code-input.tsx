'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
}

/**
 * Composant de saisie de code de vérification à 6 chiffres
 * Chaque chiffre est dans un input séparé pour une meilleure UX
 */
export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = false,
}: VerificationCodeInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // S'assurer que la valeur est toujours une chaîne de la bonne longueur
  const paddedValue = value.padEnd(length, ' ');

  const handleChange = (index: number, digit: string) => {
    // Ne garder que les chiffres
    const numericDigit = digit.replace(/\D/g, '');

    if (numericDigit.length === 0) {
      // Suppression
      const newValue = paddedValue.substring(0, index) + ' ' + paddedValue.substring(index + 1);
      onChange(newValue.trim());

      // Focus sur l'input précédent
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Ne prendre que le dernier chiffre saisi
    const lastDigit = numericDigit.slice(-1);

    // Construire la nouvelle valeur
    const newValue = paddedValue.substring(0, index) + lastDigit + paddedValue.substring(index + 1);
    const trimmedValue = newValue.trim();

    onChange(trimmedValue);

    // Focus sur l'input suivant si pas le dernier
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Si tous les chiffres sont remplis, appeler onComplete
    if (trimmedValue.length === length && onComplete) {
      onComplete(trimmedValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !paddedValue[index].trim()) {
      // Si l'input est vide et qu'on appuie sur Backspace, aller à l'input précédent
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);

    onChange(digits);

    // Focus sur le dernier input rempli ou le premier vide
    const focusIndex = Math.min(digits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    // Si tous les chiffres sont remplis, appeler onComplete
    if (digits.length === length && onComplete) {
      onComplete(digits);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={paddedValue[index]?.trim() || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            paddedValue[index]?.trim() && !error && 'border-blue-500 bg-blue-50'
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
