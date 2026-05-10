import { AnalysisResult, Issue, Severity, getSeverityLabel } from '@aiready/core';
import type { PatternType } from './detector';

export interface PatternSummary {
  totalPatterns: number;
  totalTokenCost: number;
  patternsByType: Record<PatternType, number>;
  topDuplicates: Array<{
    files: Array<{
      path: string;
      startLine: number;
      endLine: number;
    }>;
    similarity: number;
    patternType: PatternType;
    tokenCost: number;
  }>;
}

/**
 * Generate refactoring suggestion based on pattern type.
 *
 * @param patternType - The detected pattern category (e.g. 'api-handler', 'validator')
 * @param similarity - Similarity score from 0 to 1
 * @returns Human-readable refactoring advice
 */
export function getRefactoringSuggestion(
  patternType: PatternType,
  similarity: number
): string {
  const baseMessages: Record<PatternType, string> = {
    'api-handler': 'Extract common middleware or create a base handler class',
    validator:
      'Consolidate validation logic into shared schema validators (Zod/Yup)',
    utility: 'Move to a shared utilities file and reuse across modules',
    'class-method': 'Consider inheritance or composition to share behavior',
    component: 'Extract shared logic into a custom hook or HOC',
    function: 'Extract into a shared helper function',
    unknown: 'Extract common logic into a reusable module',
  };

  const urgency =
    similarity > 0.95
      ? ' (CRITICAL: Nearly identical code)'
      : similarity > 0.9
        ? ' (HIGH: Very similar, refactor soon)'
        : '';

  return baseMessages[patternType] + urgency;
}

/**
 * Generate a summary of pattern detection results.
 *
 * @param results - Array of raw analysis results from the detector
 * @returns Structured pattern summary and top duplicates
 */
export function generateSummary(results: AnalysisResult[]): PatternSummary {
  // Defensive check for results array to prevent crashes
  if (!Array.isArray(results)) {
    return {
      totalPatterns: 0,
      totalTokenCost: 0,
      patternsByType: {
        'api-handler': 0,
        validator: 0,
        utility: 0,
        'class-method': 0,
        component: 0,
        function: 0,
        unknown: 0,
      },
      topDuplicates: [],
    };
  }

  const allIssues = results.flatMap((r) => r.issues || []);
  const totalTokenCost = results.reduce(
    (sum, r) => sum + (r.metrics?.tokenCost || 0),
    0
  );

  const patternsByType: Record<PatternType, number> = {
    'api-handler': 0,
    validator: 0,
    utility: 0,
    'class-method': 0,
    component: 0,
    function: 0,
    unknown: 0,
  };

  allIssues.forEach((issue) => {
    const match = issue.message.match(/^(\S+(?:-\S+)*) pattern/);
    if (match) {
      const type = (match[1] as PatternType) || 'unknown';
      patternsByType[type] = (patternsByType[type] || 0) + 1;
    }
  });

  const topDuplicates = allIssues.slice(0, 10).map((issue) => {
    const similarityMatch = issue.message.match(/(\d+)% similar/);
    const tokenMatch = issue.message.match(/\((\d+) tokens/);
    const typeMatch = issue.message.match(/^(\S+(?:-\S+)*) pattern/);
    const fileMatch = issue.message.match(/similar to (.+?) \(/);

    return {
      files: [
        {
          path: issue.location.file,
          startLine: issue.location.line,
          endLine: 0,
        },
        {
          path: fileMatch?.[1] || 'unknown',
          startLine: 0,
          endLine: 0,
        },
      ],
      similarity: similarityMatch ? parseInt(similarityMatch[1]) / 100 : 0,
      patternType: (typeMatch?.[1] as PatternType) || 'unknown',
      tokenCost: tokenMatch ? parseInt(tokenMatch[1]) : 0,
    };
  });

  return {
    totalPatterns: allIssues.length,
    totalTokenCost,
    patternsByType,
    topDuplicates,
  };
}

/**
 * Filter issues by severity level.
 *
 * @param issues - List of detected issues
 * @param severity - Severity filter: 'all' | 'critical' | 'high' | 'medium'
 * @returns Filtered list of issues
 */
export function filterBySeverity(issues: Issue[], severity: string): Issue[] {
  if (severity === 'all') return issues;
  const severityMap: Record<string, Severity[]> = {
    critical: [Severity.Critical],
    high: [Severity.Critical, Severity.Major],
    medium: [Severity.Critical, Severity.Major, Severity.Minor],
  };
  const allowed = severityMap[severity] || [
    Severity.Critical,
    Severity.Major,
    Severity.Minor,
  ];
  return issues.filter((issue) => allowed.includes(issue.severity));
}

/**
 * Calculate severity based on similarity.
 *
 * @param similarity - Similarity score from 0 to 1
 * @returns The calculated core severity level
 */
export function calculateSeverity(similarity: number): Severity {
  if (similarity > 0.95) return Severity.Critical;
  if (similarity > 0.9) return Severity.Major;
  if (similarity > 0.7) return Severity.Minor;
  return Severity.Info;
}
