'use client';

import { DollarSign, Euro, PoundSterling, JapaneseYen } from 'lucide-react';

interface CurrencyIconProps {
  currency?: string;
  className?: string;
}

export function CurrencyIcon({ currency = 'USD', className = 'w-4 h-4' }: CurrencyIconProps) {
  switch (currency?.toUpperCase()) {
    case 'EUR':
      return <Euro className={className} />;
    case 'GBP':
      return <PoundSterling className={className} />;
    case 'JPY':
      return <JapaneseYen className={className} />;
    case 'USD':
    case 'CAD':
    case 'AUD':
    default:
      return <DollarSign className={className} />;
  }
}

export function getCurrencySymbol(currency?: string): string {
  switch (currency?.toUpperCase()) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    case 'CAD':
      return 'C$';
    case 'AUD':
      return 'A$';
    case 'USD':
    default:
      return '$';
  }
}

