// ルーブリックの4軸(指示文の質。卒業基準①に対応 / 設計書 §3.4 ブロック①)
export type RubricAxis = "purpose" | "context" | "constraints" | "format";

export const AXIS_LABEL: Record<RubricAxis, string> = {
  purpose: "目的の明確さ",
  context: "文脈(背景・読み手)",
  constraints: "制約(条件・禁止事項)",
  format: "出力形式",
};

// ミニ演習の穴埋め欄
export interface ExerciseBlank {
  id: string;
  label: string;
  placeholder: string;
  hint?: string;
}

// 評価軸(演習ごとに動的に変える)
export interface Criterion {
  key: string;
  label: string;
}

// ミニ演習(穴埋め → ライブ実行 → 自動フィードバック)
// mode:
//   compose = 指示を書いて実行(週1・週2)
//   revise  = 既存のAI出力(given)への「修正指示」を書く →「どう直す?」(週3)
//   rewrite = 弱い原プロンプト(givenPrompt)+残念な出力(given)を見て、
//             「最初からどう書けばよかったか」を書き直す(週4)
export interface Exercise {
  scenario: string;
  mode?: "compose" | "revise" | "rewrite";
  given?: string; // revise=直す対象の出力 / rewrite=返ってきた残念な出力
  givenPrompt?: string; // rewrite=実際に使われた弱いプロンプト
  template: string; // {{blankId}} を含むテンプレート
  blanks: ExerciseBlank[];
  axes?: RubricAxis[]; // (旧)重点軸。criteria未指定時の4点セット強調に使用
  focus?: string; // この演習で鍛える力(採点AIへの指針)
  criteria?: Criterion[]; // 評価軸(動的)。未指定なら4点セットで採点
}

export interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

// タップ式ドリル(LLM採点なし。正解・解説を問題データに持つ — 問題設計ガイド §2.1)
//   ab    = 二択比較(良い方を1タップ)
//   flaw  = 弱点タップ(弱い区切りを1タップ)
//   order = 組み立て(チップをタップして自然な1文に。並びが違っても✗にしない)
export type Drill =
  | { kind: "ab"; question: string; a: string; b: string; answer: "a" | "b"; explanation: string }
  | { kind: "flaw"; question: string; segments: string[]; flawIndex: number; explanation: string }
  | { kind: "order"; question: string; chips: string[]; explanation: string };

export interface Lesson {
  week: number;
  day: number; // 1..5
  title: string;
  durationMin: number;
  explanation: string; // 簡易マークダウン(段落・- 箇条書き・**強調**)
  review?: Drill; // 準備運動(昨日/前週の復習1問・タップ式)
  drills?: Drill[]; // 腕ならし(タップ式2〜4問)
  exercise: Exercise;
  bridge: string; // ブリッジ課題(自分のClaudeで1回使う)
  quiz: Quiz;
}

export interface WeekendTask {
  week: number;
  title: string;
  brief: string; // 課題の指示(何を作る指示文を書くか)
  rubricNote: string; // 採点で重視する点
  optional?: boolean; // 難所週は「推奨」
}

export interface Week {
  week: number;
  theme: string;
  hardWeek?: boolean; // 難所・負荷軽減週(週2・5・9)
  lessons: Lesson[];
  weekend: WeekendTask;
}

// API: ミニ演習の自動フィードバック
export interface CriterionScore {
  label: string;
  score: number; // 0..3
}
export interface ExerciseFeedback {
  scores: CriterionScore[]; // 評価軸ごとのスコア(動的)
  good: string[];
  improve: string[];
  rewrite: string; // 改善版の指示文(お手本)
}

export interface ExerciseResult {
  output: string; // ライブ実行の結果
  feedback: ExerciseFeedback;
}

// API: 週末課題の添削
export interface GradeResult {
  scores: Record<RubricAxis, number>; // 0..3
  totalPct: number; // 0..100
  pass: boolean;
  good: string[];
  improve: string[];
  rewrite: string;
}
