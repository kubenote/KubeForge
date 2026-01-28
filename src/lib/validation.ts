/**
 * Field validation utilities for Kubernetes schema validation
 */

export interface ValidationError {
    path: string;
    message: string;
    level: 'error' | 'warning';
}

export interface Schema {
    type?: string | string[];
    pattern?: string;
    enum?: (string | number | boolean)[];
    format?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    required?: string[];
}

/**
 * Validate a field value against a JSON schema
 */
export function validateField(
    value: unknown,
    schema: Schema | undefined,
    path: string,
    valueType: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!schema && !valueType) {
        return errors;
    }

    // Skip validation for empty/undefined values (they might be optional)
    if (value === undefined || value === null || value === '') {
        return errors;
    }

    // Type validation
    if (valueType === 'integer') {
        if (typeof value === 'string') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                errors.push({
                    path,
                    message: 'Must be a valid integer',
                    level: 'error',
                });
            } else if (!Number.isInteger(numValue)) {
                errors.push({
                    path,
                    message: 'Must be an integer (no decimals)',
                    level: 'error',
                });
            }
        } else if (typeof value === 'number' && !Number.isInteger(value)) {
            errors.push({
                path,
                message: 'Must be an integer (no decimals)',
                level: 'error',
            });
        }
    }

    if (valueType === 'number') {
        if (typeof value === 'string') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                errors.push({
                    path,
                    message: 'Must be a valid number',
                    level: 'error',
                });
            }
        }
    }

    // Schema-based validation
    if (schema) {
        // Pattern validation
        if (schema.pattern && typeof value === 'string') {
            try {
                const regex = new RegExp(schema.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        path,
                        message: `Must match pattern: ${schema.pattern}`,
                        level: 'error',
                    });
                }
            } catch (e) {
                // Invalid regex pattern in schema, skip validation
            }
        }

        // Enum validation
        if (schema.enum && schema.enum.length > 0) {
            if (!schema.enum.includes(value as string | number | boolean)) {
                errors.push({
                    path,
                    message: `Must be one of: ${schema.enum.join(', ')}`,
                    level: 'error',
                });
            }
        }

        // Format validation
        if (schema.format && typeof value === 'string') {
            const formatErrors = validateFormat(value, schema.format, path);
            errors.push(...formatErrors);
        }

        // Minimum/maximum for numbers
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
            const numValue = Number(value);
            if (schema.minimum !== undefined && numValue < schema.minimum) {
                errors.push({
                    path,
                    message: `Must be at least ${schema.minimum}`,
                    level: 'error',
                });
            }
            if (schema.maximum !== undefined && numValue > schema.maximum) {
                errors.push({
                    path,
                    message: `Must be at most ${schema.maximum}`,
                    level: 'error',
                });
            }
        }

        // String length validation
        if (typeof value === 'string') {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                errors.push({
                    path,
                    message: `Must be at least ${schema.minLength} characters`,
                    level: 'error',
                });
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                errors.push({
                    path,
                    message: `Must be at most ${schema.maxLength} characters`,
                    level: 'error',
                });
            }
        }
    }

    return errors;
}

/**
 * Validate common format types
 */
function validateFormat(value: string, format: string, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (format) {
        case 'uri':
        case 'uri-reference':
            try {
                new URL(value);
            } catch {
                // Try as relative URI
                if (!value.startsWith('/') && !value.startsWith('./') && !value.startsWith('../')) {
                    try {
                        new URL(value, 'http://example.com');
                    } catch {
                        errors.push({
                            path,
                            message: 'Must be a valid URI',
                            level: 'error',
                        });
                    }
                }
            }
            break;

        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                errors.push({
                    path,
                    message: 'Must be a valid email address',
                    level: 'error',
                });
            }
            break;

        case 'hostname':
            const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!hostnameRegex.test(value)) {
                errors.push({
                    path,
                    message: 'Must be a valid hostname',
                    level: 'error',
                });
            }
            break;

        case 'ipv4':
            const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipv4Regex.test(value)) {
                errors.push({
                    path,
                    message: 'Must be a valid IPv4 address',
                    level: 'error',
                });
            } else {
                const parts = value.split('.').map(Number);
                if (parts.some((part) => part > 255)) {
                    errors.push({
                        path,
                        message: 'Invalid IPv4 address (octets must be 0-255)',
                        level: 'error',
                    });
                }
            }
            break;

        case 'date-time':
            const dateTimeValue = new Date(value);
            if (isNaN(dateTimeValue.getTime())) {
                errors.push({
                    path,
                    message: 'Must be a valid date-time (ISO 8601)',
                    level: 'error',
                });
            }
            break;

        case 'date':
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(value)) {
                errors.push({
                    path,
                    message: 'Must be a valid date (YYYY-MM-DD)',
                    level: 'error',
                });
            }
            break;

        case 'int-or-string':
            // Kubernetes specific format - accepts either integer or string
            // No validation needed as both are valid
            break;

        default:
            // Unknown format, skip validation
            break;
    }

    return errors;
}

/**
 * Check if a value is considered empty
 */
export function isEmpty(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
}
