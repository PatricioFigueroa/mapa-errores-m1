// Mirror of contracts/*.schema.json. Do not change without changing the schemas.

export type OptionLetter = 'A' | 'B' | 'C' | 'D';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  topic: string;
  activity: string;
}

export interface Catalog {
  version: 1;
  language: string;
  items: CatalogItem[];
}

export interface Tag {
  error: string;
  score: number;
  source: 'gold' | 'model';
}

export interface Question {
  id: string;
  topic: string;
  skill?: string;
  difficulty?: string;
  stem: string;
  options: Record<OptionLetter, string>;
  answer: OptionLetter;
  solution?: string;
  tags: Partial<Record<OptionLetter, Tag[]>>;
}

export interface Bank {
  version: 1;
  questions: Question[];
}

export interface Manifest {
  model_id: string;
  variant: 'eedi' | 'libre';
  dim: number;
  n_catalog: number;
  catalog_sha256: string;
  threshold: number;
  metrics: Record<string, unknown>;
  created: string;
}
