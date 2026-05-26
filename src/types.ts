import { Type } from "@google/genai";

export type DocumentType = 'quote' | 'statement';
export type VatType = 'exclude' | 'include';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  note: string;
}

export interface ClientInfo {
  name: string;
  manager: string;
  email: string;
  date: string;
}

export const DEFAULT_ITEMS: QuoteItem[] = [
  { id: '1', description: '강의료', quantity: 1, unitPrice: 0, note: '' },
  { id: '2', description: '보조강사비', quantity: 0, unitPrice: 0, note: '' },
];
