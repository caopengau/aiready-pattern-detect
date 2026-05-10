import { describe, it, expect } from 'vitest';
import * as patternDetect from '../index';

describe('pattern-detect index', () => {
  describe('exports', () => {
    it('should export PATTERN_DETECT_PROVIDER', () => {
      expect(patternDetect.PATTERN_DETECT_PROVIDER).toBeDefined();
      expect(patternDetect.PATTERN_DETECT_PROVIDER.id).toBe('pattern-detect');
    });

    it('should export Severity from @aiready/core', () => {
      expect(patternDetect.Severity).toBeDefined();
      expect(patternDetect.Severity.Critical).toBeDefined();
      expect(patternDetect.Severity.Major).toBeDefined();
      expect(patternDetect.Severity.Minor).toBeDefined();
      expect(patternDetect.Severity.Info).toBeDefined();
    });

    it('should export analyzer functions', () => {
      expect(typeof patternDetect.analyzePatterns).toBe('function');
    });

    it('should export detector functions', () => {
      expect(typeof patternDetect.detectDuplicatePatterns).toBe('function');
    });

    it('should export grouping functions', () => {
      expect(typeof patternDetect.groupDuplicatesByFilePair).toBe('function');
      expect(typeof patternDetect.createRefactorClusters).toBe('function');
      expect(typeof patternDetect.filterClustersByImpact).toBe('function');
    });

    it('should export scoring functions', () => {
      expect(typeof patternDetect.calculatePatternScore).toBe('function');
    });

    it('should export context-rules functions', () => {
      expect(typeof patternDetect.calculateSeverity).toBe('function');
      expect(typeof patternDetect.filterBySeverity).toBe('function');
    });
  });

  describe('PATTERN_DETECT_PROVIDER', () => {
    it('should have required provider methods', () => {
      expect(typeof patternDetect.PATTERN_DETECT_PROVIDER.analyze).toBe(
        'function'
      );
      expect(typeof patternDetect.PATTERN_DETECT_PROVIDER.score).toBe(
        'function'
      );
    });

    it('should have alias array', () => {
      expect(Array.isArray(patternDetect.PATTERN_DETECT_PROVIDER.alias)).toBe(
        true
      );
      expect(patternDetect.PATTERN_DETECT_PROVIDER.alias).toContain('patterns');
      expect(patternDetect.PATTERN_DETECT_PROVIDER.alias).toContain(
        'duplicates'
      );
      expect(patternDetect.PATTERN_DETECT_PROVIDER.alias).toContain(
        'duplication'
      );
    });

    it('should have defaultWeight', () => {
      expect(typeof patternDetect.PATTERN_DETECT_PROVIDER.defaultWeight).toBe(
        'number'
      );
      expect(
        patternDetect.PATTERN_DETECT_PROVIDER.defaultWeight
      ).toBeGreaterThan(0);
    });
  });
});
