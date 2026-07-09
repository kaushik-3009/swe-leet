export type Track = "SYSTEM_DESIGN" | "LLD";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type DiagramType = "ARCHITECTURE" | "SEQUENCE" | "CLASS";

export interface ResourceSpec {
  kind: "EXTERNAL";
  title: string;
  url: string;
  order: number;
}

export interface CategorySpec {
  slug: string;
  track: Track;
  title: string;
  description: string;
  order: number;
  /** Our own on-site written article for this topic (headers + fenced-code diagrams). */
  articleTitle?: string;
  articleContent?: string; // markdown
  /** Curated external reading list. An ARTICLE-kind resource row pointing at our own
   *  article is added automatically by the seed script when articleContent is set. */
  resources?: ResourceSpec[];
}

export interface RubricSpec {
  requiredComponents: string[];
  requiredConnections: { from: string; to: string; label?: string }[];
  weights?: Record<string, number>;
}

export interface SolutionStepSpec {
  title: string;
  body: string;
}

export interface ProblemSpec {
  slug: string;
  categorySlug: string;
  track: Track;
  title: string;
  description: string; // markdown: requirements, constraints, clarifying context
  difficulty: Difficulty;
  tags: string[];
  estMinutes: number;
  order: number;
  /** Defaults to ARCHITECTURE for SYSTEM_DESIGN, CLASS for LLD (see problems.ts helpers). */
  diagramType?: DiagramType;
  generalHint?: string;
  stepHints?: string[];
  videoUrl?: string; // only set when a specific, verified video URL is known - never guessed
  /** Included in the small "bridge into practice" subset on the topic's study-plan page. */
  inStudyPlanSubset?: boolean;
  rubric: RubricSpec;
  referenceExplanation: string; // markdown: rationale, trade-offs, common mistakes, gotchas, edge cases
  solutionCode?: string; // LLD: a real reference implementation
  solutionCodeLanguage?: string; // default "python"
  solutionSteps?: SolutionStepSpec[]; // ordered, for the step-by-step progressive reveal
}
