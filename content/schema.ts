export type Track = "SYSTEM_DESIGN" | "LLD";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface CategorySpec {
  slug: string;
  track: Track;
  title: string;
  description: string;
  order: number;
}

export interface RubricSpec {
  requiredComponents: string[];
  requiredConnections: { from: string; to: string; label?: string }[];
  weights?: Record<string, number>;
}

export interface ProblemSpec {
  slug: string;
  categorySlug: string;
  track: Track;
  title: string;
  description: string; // markdown
  difficulty: Difficulty;
  tags: string[];
  estMinutes: number;
  order: number;
  rubric: RubricSpec;
  referenceExplanation: string; // markdown
}
