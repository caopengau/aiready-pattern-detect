import { ToolRegistry } from '@aiready/core';
import { PATTERN_DETECT_PROVIDER } from './provider';

// Register with global registry
ToolRegistry.register(PATTERN_DETECT_PROVIDER);

export * from './detector';
export * from './analyzer';
export * from './grouping';
export {
  analyzePatterns,
  PatternDetectOptions,
  getSmartDefaults,
  logConfiguration,
  PatternSummary,
  generateSummary,
  filterBySeverity,
  calculateSeverity,
  calculatePatternScore,
  Severity,
} from './analyzer';
export { PATTERN_DETECT_PROVIDER };
