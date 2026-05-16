import { scanFiles, readFileContent, Severity, IssueType } from '@aiready/core';
import type { AnalysisResult, Issue } from '@aiready/core';
import { detectDuplicatePatterns, type DuplicatePattern } from './detector';
import {
  groupDuplicatesByFilePair,
  createRefactorClusters,
  filterClustersByImpact,
  filterBrandSpecificVariants,
  type DuplicateGroup,
  type RefactorCluster,
} from './grouping';
import {
  PatternDetectOptions,
  getSmartDefaults,
  logConfiguration,
} from './config';
import {
  getRefactoringSuggestion,
  filterBySeverity,
  calculateSeverity,
} from './summary';

export { Severity };
export {
  PatternDetectOptions,
  getSmartDefaults,
  logConfiguration,
} from './config';
export {
  PatternSummary,
  generateSummary,
  filterBySeverity,
  calculateSeverity,
} from './summary';
export { calculatePatternScore } from './scoring';

/**
 * Main entry point for pattern detection analysis.
 *
 * @param options - Configuration including rootDir and detection parameters.
 * @returns Promise resolving to the comprehensive pattern detect report.
 */
export async function analyzePatterns(options: PatternDetectOptions): Promise<{
  results: AnalysisResult[];
  duplicates: DuplicatePattern[];
  files: string[];
  groups?: DuplicateGroup[];
  clusters?: RefactorCluster[];
  config: PatternDetectOptions;
}> {
  const smartDefaults = await getSmartDefaults(options.rootDir || '.', options);
  const finalOptions = { ...smartDefaults, ...options };

  const {
    minSimilarity = 0.4,
    minLines = 5,
    batchSize = 100,
    approx = true,
    minSharedTokens = 8,
    maxCandidatesPerBlock = 100,
    streamResults = false,
    severity = 'all',
    groupByFilePair = true,
    createClusters = true,
    minClusterTokenCost = 1000,
    minClusterFiles = 3,
    excludePatterns = [],
    excludeFiles = [],
    confidenceThreshold = 0,
    ignoreWhitelist = [],
    ...scanOptions
  } = finalOptions;

  const files = await scanFiles(scanOptions);
  const estimatedBlocks = files.length * 3;
  logConfiguration(finalOptions, estimatedBlocks);

  const results: AnalysisResult[] = [];
  const READ_BATCH_SIZE = 50;
  const fileContents: { file: string; content: string }[] = [];

  for (let i = 0; i < files.length; i += READ_BATCH_SIZE) {
    const batch = files.slice(i, i + READ_BATCH_SIZE);
    const batchContents = await Promise.all(
      batch.map(async (file) => ({
        file,
        content: await readFileContent(file),
      }))
    );
    fileContents.push(...batchContents);
  }

  const duplicates = await detectDuplicatePatterns(fileContents, {
    minSimilarity,
    minLines,
    batchSize,
    approx,
    minSharedTokens,
    maxCandidatesPerBlock,
    streamResults,
    excludePatterns,
    excludeFiles,
    confidenceThreshold,
    ignoreWhitelist,
    onProgress: options.onProgress,
  });

  // Apply filters to downgrade severity for brand variants and interface definitions
  filterBrandSpecificVariants(duplicates);

  for (const file of files) {
    const fileDuplicates = duplicates.filter(
      (dup) => dup.file1 === file || dup.file2 === file
    );

    const issues: Issue[] = fileDuplicates.map((dup) => {
      const otherFile = dup.file1 === file ? dup.file2 : dup.file1;
      let severityLevel: Severity;
      if (
        (dup.severity as string) === 'info' ||
        (dup.severity as string) === 'Info'
      ) {
        severityLevel = Severity.Info;
      } else {
        severityLevel = calculateSeverity(dup.similarity);
      }

      return {
        type: IssueType.DuplicatePattern,
        severity: severityLevel,
        message: `${dup.patternType} pattern ${Math.round(dup.similarity * 100)}% similar to ${otherFile} (${dup.tokenCost} tokens wasted)`,
        location: {
          file,
          line: dup.file1 === file ? dup.line1 : dup.line2,
        },
        suggestion: getRefactoringSuggestion(dup.patternType, dup.similarity),
      };
    });

    const filteredIssues = filterBySeverity(issues, severity || 'all');

    const totalTokenCost = fileDuplicates.reduce(
      (sum, dup) => sum + dup.tokenCost,
      0
    );

    results.push({
      fileName: file,
      issues: filteredIssues,
      metrics: {
        tokenCost: totalTokenCost,
        consistencyScore: Math.max(0, 1 - fileDuplicates.length * 0.1),
      },
    });
  }

  let groups: DuplicateGroup[] | undefined;
  let clusters: RefactorCluster[] | undefined;

  if (groupByFilePair) {
    groups = groupDuplicatesByFilePair(duplicates);
  }

  if (createClusters) {
    const allClusters = createRefactorClusters(duplicates);
    clusters = filterClustersByImpact(
      allClusters,
      minClusterTokenCost,
      minClusterFiles
    );
  }

  return { results, duplicates, files, groups, clusters, config: finalOptions };
}
