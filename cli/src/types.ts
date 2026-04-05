export type TitleInput = {
  productType?: string;
  origin?: string;
  brand?: string;
  manufacturer?: string;
  modelName?: string;
  currentTitle?: string;
  coreTerms: string[];
  differentiators: string[];
  contextTerms: string[];
  representativeSpec?: string;
  targetCustomer?: string;
  forbiddenPhrases?: string[];
  variantValues?: string[];
};

export type TitleScoreBreakdown = {
  C: number;
  D: number;
  X: number;
  B: number;
  Q: number;
  R: number;
  L: number;
  P: number;
  T: number;
  S: number;
  V: number;
  total: number;
};

export type TitleCandidate = {
  title: string;
  breakdown: TitleScoreBreakdown;
};
