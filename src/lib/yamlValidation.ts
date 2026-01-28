/**
 * YAML validation utilities for secure handling of user-uploaded YAML content
 */

import yaml from 'js-yaml';

export interface YamlValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedContent?: string;
}

// Maximum allowed YAML content size (1MB)
const MAX_CONTENT_SIZE = 1024 * 1024;

// Maximum nesting depth to prevent stack overflow attacks
const MAX_NESTING_DEPTH = 50;

// Potentially dangerous YAML tags that could be exploited
const DANGEROUS_TAGS = [
  '!',
  '!!python',
  '!!ruby',
  '!!perl',
  '!!java',
  '!!php',
  '!!js',
  '!!binary',
];

/**
 * Check the nesting depth of an object
 */
function getMaxDepth(obj: unknown, currentDepth = 0): number {
  if (currentDepth > MAX_NESTING_DEPTH) {
    return currentDepth;
  }

  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return currentDepth;
    return Math.max(...obj.map(item => getMaxDepth(item, currentDepth + 1)));
  }

  const values = Object.values(obj);
  if (values.length === 0) return currentDepth;
  return Math.max(...values.map(value => getMaxDepth(value, currentDepth + 1)));
}

/**
 * Check for dangerous YAML tags in the raw content
 */
function containsDangerousTags(content: string): string[] {
  const foundTags: string[] = [];

  for (const tag of DANGEROUS_TAGS) {
    // Look for tags that aren't part of standard YAML (like !!str, !!int, etc.)
    const regex = new RegExp(`${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zA-Z/]`, 'g');
    if (regex.test(content)) {
      foundTags.push(tag);
    }
  }

  return foundTags;
}

/**
 * Validate YAML content for security and correctness
 */
export function validateYamlContent(content: string): YamlValidationResult {
  const errors: string[] = [];

  // Check content size
  if (!content) {
    return { isValid: false, errors: ['YAML content is empty'] };
  }

  if (content.length > MAX_CONTENT_SIZE) {
    return { isValid: false, errors: [`YAML content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes`] };
  }

  // Check for dangerous tags before parsing
  const dangerousTags = containsDangerousTags(content);
  if (dangerousTags.length > 0) {
    return {
      isValid: false,
      errors: [`YAML contains potentially dangerous tags: ${dangerousTags.join(', ')}`]
    };
  }

  // Try to parse the YAML
  let parsedDocuments: unknown[];
  try {
    // Use safeLoad options - js-yaml's loadAll with safe schema by default
    parsedDocuments = yaml.loadAll(content, undefined, {
      schema: yaml.FAILSAFE_SCHEMA,
      json: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
    return { isValid: false, errors: [`Invalid YAML syntax: ${errorMessage}`] };
  }

  // Check nesting depth for each document
  for (let i = 0; i < parsedDocuments.length; i++) {
    const doc = parsedDocuments[i];
    const depth = getMaxDepth(doc);
    if (depth > MAX_NESTING_DEPTH) {
      errors.push(`Document ${i + 1} exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Re-serialize to ensure clean output (removes any potential exploits)
  try {
    const sanitizedContent = parsedDocuments
      .map(doc => yaml.dump(doc, {
        noRefs: true,
        sortKeys: false,
        lineWidth: -1,
      }))
      .join('---\n');

    return { isValid: true, errors: [], sanitizedContent };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown serialization error';
    return { isValid: false, errors: [`Failed to sanitize YAML: ${errorMessage}`] };
  }
}

/**
 * Validate that the YAML appears to be Kubernetes resources
 * This is a light validation - just checks for expected structure
 */
export function validateKubernetesYaml(content: string): YamlValidationResult {
  const baseValidation = validateYamlContent(content);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const errors: string[] = [];

  try {
    const documents = yaml.loadAll(content, undefined, { schema: yaml.FAILSAFE_SCHEMA });

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i] as Record<string, unknown> | null;

      // Skip empty documents
      if (!doc || Object.keys(doc).length === 0) {
        continue;
      }

      // Check for required Kubernetes fields
      if (!doc.apiVersion) {
        errors.push(`Document ${i + 1}: missing required field 'apiVersion'`);
      }
      if (!doc.kind) {
        errors.push(`Document ${i + 1}: missing required field 'kind'`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Kubernetes validation failed: ${errorMessage}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedContent: baseValidation.sanitizedContent,
  };
}
