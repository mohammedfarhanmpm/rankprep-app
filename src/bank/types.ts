/** Compact question row as stored in src/bank/data/*.json. */
export type BankRow = {
  /** id */ i: string;
  /** question text; may contain [[img:<hash>]] tokens */ t: string;
  /** options (MCQ only) */ o?: string[];
  /** correct option index (MCQ only) */ a?: number;
  /** numerical answer (integer-type only) */ n?: string;
  /** solution */ s: string;
  /** difficulty: E | M | H */ d: 'E' | 'M' | 'H';
  /** topic */ p: string;
  /** source test name */ k: string;
  /** 1 = solution written by AI from the answer key */ x?: 1;
};
