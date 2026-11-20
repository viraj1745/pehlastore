/** Phrases a new creator should not publish: guarantees, financial promises, medical claims. */
const RISKY: Array<[RegExp, string]> = [
  [/guarantee[ds]?/i, "guarantees"],
  [/\b100\s?%\s*(result|success|guarantee|returns?)/i, "100% promises"],
  [/risk[\s-]?free/i, "'risk-free' claims"],
  [/(assured|fixed|guaranteed)\s+returns?/i, "assured returns"],
  [/double\s+your\s+(money|income|savings)/i, "double-your-money claims"],
  [/\b(lose|burn)\s+\d+\s?(kg|kgs|kilos?)\b/i, "specific weight-loss promises"],
  [/\bcure[sd]?\b/i, "cure claims"],
  [/\bsure[\s-]?shot\b/i, "sure-shot claims"],
  [/\bget\s+rich\b/i, "get-rich claims"],
];

export function findRiskyClaims(text: string): string[] {
  const found = new Set<string>();
  for (const [pattern, label] of RISKY) if (pattern.test(text)) found.add(label);
  return [...found];
}