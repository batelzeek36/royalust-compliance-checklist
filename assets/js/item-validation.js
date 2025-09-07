/**
 * Item Validation Module
 * Handles data validation and error handling for checklist items
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ItemValidator {
    constructor(options = {}) {
        this.options = {
            strictMode: false,
            validateSources: true,
            validateDates: true,
            validateDependencies: true,
            customValidators: {},
            ...options
        };
        
        this.validationRules = new Map();
        this.customValidators = new Map();
        this.validationCache = new Map();
        this.errorMessages = new Map();
        
        this.init();
    }

    init() {
        this.registerDefaultRules();
        this.registerCustomValidators();
        this.setupErrorMessages();
    }

    // Validation Rules Registration
    registerDefaultRules() {
        // Required field validation
        this.validationRules.set('required', {
            name: 'Required Field',
            validator: (value, field, item) => {
                return value !== null && value !== undefined && value !== '';
            },
            message: (field) => `${field} is required`
        });
        
        // String length validation
        this.validationRules.set('minLength', {
            name: 'Minimum Length',
            validator: (value, field, item, params) => {
                if (!value) return true; // Skip if empty (use required rule for that)
                return value.length >= (params.min || 0);
            },
            message: (field, params) => `${field} must be at least ${params.min} characters long`
        });
        
        this.validationRules.set('maxLength', {
            name: 'Maximum Length',
            validator: (value, field, item, params) => {
                if (!value) return true;
                return value.length <= (params.max || Infinity);
            },
            message: (field, params) => `${field} must not exceed ${params.max} characters`
        });
        
        // URL validation
        this.validationRules.set('url', {
            name: 'Valid URL',
            validator: (value, field, item) => {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: (field) => `${field} must be a valid URL`
        });
        
        // Date validation
        this.validationRules.set('date', {
            name: 'Valid Date',
            validator: (value, field, item) => {
                if (!value) return true;
                return !isNaN(Date.parse(value));
            },
            message: (field) => `${field} must be a valid date`
        });
        
        // Future date validation
        this.validationRules.set('futureDate', {
            name: 'Future Date',
            validator: (value, field, item) => {
                if (!value) return true;
                const date = new Date(value);
                return date > new Date();
            },
            message: (field) => `${field} must be a future date`
        });
        
        // Email validation
        this.validationRules.set('email', {
            name: 'Valid Email',
            validator: (value, field, item) => {
                if (!value) return true;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message: (field) => `${field} must be a valid email address`
        });
        
        // Priority validation
        this.validationRules.set('priority', {
            name: 'Valid Priority',
            validator: (value, field, item) => {
                if (!value) return true;
                return ['low', 'medium', 'high', 'critical'].includes(value.toLowerCase());
            },
            message: (field) => `${field} must be one of: low, medium, high, critical`
        });
        
        // Risk level validation
        this.validationRules.set('riskLevel', {
            name: 'Valid Risk Level',
            validator: (value, field, item) => {
                if (!value) return true;
                return ['low', 'medium', 'high'].includes(value.toLowerCase());
            },
            message: (field) => `${field} must be one of: low, medium, high`
        });
        
        // Array validation
        this.validationRules.set('array', {
            name: 'Valid Array',
            validator: (value, field, item) => {
                if (!value) return true;
                return Array.isArray(value);
            },
            message: (field) => `${field} must be an array`
        });
        
        // Dependency validation
        this.validationRules.set('validDependencies', {
            name: 'Valid Dependencies',
            validator: (value, field, item, params) => {
                if (!value || !Array.isArray(value)) return true;
                
                // Check if all dependencies exist in the provided list
                const validIds = params.validIds || [];
                return value.every(dep => validIds.includes(dep));
            },
            message: (field) => `${field} contains invalid dependency references`
        });
        
        // Source links validation
        this.validationRules.set('validSources', {
            name: 'Valid Source Links',
            validator: (value, field, item) => {
                if (!value || !Array.isArray(value)) return true;
                
                return value.every(source => {
                    // Each source must have title and url
                    if (!source.title || !source.url) return false;
                    
                    // URL must be valid
                    try {
                        new URL(source.url);
                        return true;
                    } catch {
                        return false;
                    }
                });
            },
            message: (field) => `${field} must contain valid source objects with title and url`
        });
    }

    registerCustomValidators() {
        // Register any custom validators from options
        Object.entries(this.options.customValidators).forEach(([name, validator]) => {
            this.customValidators.set(name, validator);
        });
    }

    setupErrorMessages() {
        this.errorMessages.set('validation_failed', 'Validation failed');
        this.errorMessages.set('invalid_item_structure', 'Invalid item structure');
        this.errorMessages.set('missing_required_fields', 'Missing required fields');
        this.errorMessages.set('invalid_field_type', 'Invalid field type');
        this.errorMessages.set('validation_timeout', 'Validation timeout');
    }

    // Main Validation Methods
    validateItem(item, validationSchema = null) {
        if (!item || typeof item !== 'object') {
            return {
                isValid: false,
                errors: [{
                    field: 'item',
                    rule: 'structure',
                    message: 'Item must be a valid object',
                    severity: 'error'
                }]
            };
        }
        
        const schema = validationSchema || this.getDefaultSchema();
        const errors = [];
        const warnings = [];
        
        // Validate each field according to schema
        Object.entries(schema).forEach(([field, rules]) => {
            const fieldValue = item[field];
            const fieldErrors = this.validateField(fieldValue, field, item, rules);
            
            fieldErrors.forEach(error => {
                if (error.severity === 'warning') {
                    warnings.push(error);
                } else {
                    errors.push(error);
                }
            });
        });
        
        // Additional cross-field validation
        const crossFieldErrors = this.validateCrossFields(item);
        errors.push(...crossFieldErrors);
        
        const isValid = errors.length === 0;
        
        return {
            isValid,
            errors,
            warnings,
            validatedAt: new Date().toISOString()
        };
    }

    validateField(value, fieldName, item, rules) {
        const errors = [];
        
        if (!Array.isArray(rules)) {
            rules = [rules];
        }
        
        rules.forEach(rule => {
            const ruleResult = this.applyValidationRule(value, fieldName, item, rule);
            if (!ruleResult.isValid) {
                errors.push({
                    field: fieldName,
                    rule: rule.name || rule.type,
                    message: ruleResult.message,
                    severity: rule.severity || 'error',
                    value: value
                });
            }
        });
        
        return errors;
    }

    applyValidationRule(value, fieldName, item, rule) {
        try {
            // Handle different rule formats
            let ruleType, ruleParams, ruleSeverity;
            
            if (typeof rule === 'string') {
                ruleType = rule;
                ruleParams = {};
                ruleSeverity = 'error';
            } else if (typeof rule === 'object') {
                ruleType = rule.type || rule.name;
                ruleParams = rule.params || rule.options || {};
                ruleSeverity = rule.severity || 'error';
            } else {
                return {
                    isValid: false,
                    message: 'Invalid validation rule format'
                };
            }
            
            // Get validator function
            const validator = this.getValidator(ruleType);
            if (!validator) {
                return {
                    isValid: false,
                    message: `Unknown validation rule: ${ruleType}`
                };
            }
            
            // Apply validation
            const isValid = validator.validator(value, fieldName, item, ruleParams);
            
            return {
                isValid,
                message: isValid ? null : validator.message(fieldName, ruleParams)
            };
        } catch (error) {
            return {
                isValid: false,
                message: `Validation error: ${error.message}`
            };
        }
    }

    getValidator(ruleType) {
        // Check built-in validators first
        if (this.validationRules.has(ruleType)) {
            return this.validationRules.get(ruleType);
        }
        
        // Check custom validators
        if (this.customValidators.has(ruleType)) {
            return this.customValidators.get(ruleType);
        }
        
        return null;
    }

    // Cross-field validation
    validateCrossFields(item) {
        const errors = [];
        
        // Validate deadline vs completion
        if (item.deadline && item.completed) {
            const deadline = new Date(item.deadline);
            const now = new Date();
            
            if (deadline < now && !item.completed) {
                errors.push({
                    field: 'deadline',
                    rule: 'overdue',
                    message: 'Item is overdue and not completed',
                    severity: 'warning'
                });
            }
        }
        
        // Validate dependencies
        if (item.dependencies && Array.isArray(item.dependencies)) {
            // Check for circular dependencies (basic check)
            if (item.dependencies.includes(item.id)) {
                errors.push({
                    field: 'dependencies',
                    rule: 'circular',
                    message: 'Item cannot depend on itself',
                    severity: 'error'
                });
            }
        }
        
        // Validate priority vs risk level consistency
        if (item.priority && item.riskLevel) {
            const priorityLevel = this.getPriorityLevel(item.priority);
            const riskLevel = this.getRiskLevel(item.riskLevel);
            
            if (priorityLevel > riskLevel + 1) {
                errors.push({
                    field: 'priority',
                    rule: 'consistency',
                    message: 'Priority level seems inconsistent with risk level',
                    severity: 'warning'
                });
            }
        }
        
        return errors;
    }

    // Schema Management
    getDefaultSchema() {
        return {
            id: [
                { type: 'required' },
                { type: 'minLength', params: { min: 1 } }
            ],
            title: [
                { type: 'required' },
                { type: 'minLength', params: { min: 3 } },
                { type: 'maxLength', params: { max: 200 } }
            ],
            description: [
                { type: 'maxLength', params: { max: 1000 } }
            ],
            priority: [
                { type: 'priority' }
            ],
            riskLevel: [
                { type: 'riskLevel' }
            ],
            deadline: [
                { type: 'date' }
            ],
            sources: [
                { type: 'array' },
                { type: 'validSources' }
            ],
            dependencies: [
                { type: 'array' }
            ]
        };
    }

    createCustomSchema(schemaDefinition) {
        // Validate schema definition
        if (!schemaDefinition || typeof schemaDefinition !== 'object') {
            throw new Error('Schema definition must be an object');
        }
        
        // Normalize schema rules
        const normalizedSchema = {};
        
        Object.entries(schemaDefinition).forEach(([field, rules]) => {
            if (!Array.isArray(rules)) {
                rules = [rules];
            }
            
            normalizedSchema[field] = rules.map(rule => {
                if (typeof rule === 'string') {
                    return { type: rule };
                }
                return rule;
            });
        });
        
        return normalizedSchema;
    }

    // Batch Validation
    validateMultipleItems(items, schema = null) {
        const results = [];
        
        items.forEach((item, index) => {
            try {
                const result = this.validateItem(item, schema);
                results.push({
                    index,
                    itemId: item.id,
                    ...result
                });
            } catch (error) {
                results.push({
                    index,
                    itemId: item.id || `item_${index}`,
                    isValid: false,
                    errors: [{
                        field: 'validation',
                        rule: 'exception',
                        message: `Validation failed: ${error.message}`,
                        severity: 'error'
                    }],
                    warnings: []
                });
            }
        });
        
        return {
            totalItems: items.length,
            validItems: results.filter(r => r.isValid).length,
            invalidItems: results.filter(r => !r.isValid).length,
            results
        };
    }

    // Validation Reporting
    generateValidationReport(validationResults) {
        const report = {
            summary: {
                totalItems: validationResults.length,
                validItems: 0,
                invalidItems: 0,
                totalErrors: 0,
                totalWarnings: 0
            },
            errorsByField: {},
            errorsByRule: {},
            items: []
        };
        
        validationResults.forEach(result => {
            if (result.isValid) {
                report.summary.validItems++;
            } else {
                report.summary.invalidItems++;
            }
            
            report.summary.totalErrors += result.errors ? result.errors.length : 0;
            report.summary.totalWarnings += result.warnings ? result.warnings.length : 0;
            
            // Categorize errors
            if (result.errors) {
                result.errors.forEach(error => {
                    // By field
                    if (!report.errorsByField[error.field]) {
                        report.errorsByField[error.field] = 0;
                    }
                    report.errorsByField[error.field]++;
                    
                    // By rule
                    if (!report.errorsByRule[error.rule]) {
                        report.errorsByRule[error.rule] = 0;
                    }
                    report.errorsByRule[error.rule]++;
                });
            }
            
            report.items.push({
                itemId: result.itemId || 'unknown',
                isValid: result.isValid,
                errorCount: result.errors ? result.errors.length : 0,
                warningCount: result.warnings ? result.warnings.length : 0,
                errors: result.errors || [],
                warnings: result.warnings || []
            });
        });
        
        return report;
    }

    // Utility Methods
    getPriorityLevel(priority) {
        const levels = { low: 1, medium: 2, high: 3, critical: 4 };
        return levels[priority?.toLowerCase()] || 0;
    }

    getRiskLevel(riskLevel) {
        const levels = { low: 1, medium: 2, high: 3 };
        return levels[riskLevel?.toLowerCase()] || 0;
    }

    // Custom Validator Registration
    addCustomValidator(name, validator) {
        if (typeof validator !== 'object' || typeof validator.validator !== 'function') {
            throw new Error('Validator must be an object with a validator function');
        }
        
        this.customValidators.set(name, {
            name: validator.name || name,
            validator: validator.validator,
            message: validator.message || ((field) => `${field} failed custom validation`)
        });
    }

    removeCustomValidator(name) {
        return this.customValidators.delete(name);
    }

    // Validation Caching
    getCachedValidation(itemId) {
        return this.validationCache.get(itemId);
    }

    setCachedValidation(itemId, result) {
        this.validationCache.set(itemId, {
            ...result,
            cachedAt: new Date().toISOString()
        });
        
        // Limit cache size
        if (this.validationCache.size > 1000) {
            const firstKey = this.validationCache.keys().next().value;
            this.validationCache.delete(firstKey);
        }
    }

    clearValidationCache(itemId = null) {
        if (itemId) {
            this.validationCache.delete(itemId);
        } else {
            this.validationCache.clear();
        }
    }

    // Error Formatting
    formatValidationErrors(errors, format = 'text') {
        switch (format) {
            case 'html':
                return this.formatErrorsAsHtml(errors);
            case 'json':
                return JSON.stringify(errors, null, 2);
            case 'text':
            default:
                return this.formatErrorsAsText(errors);
        }
    }

    formatErrorsAsText(errors) {
        return errors.map(error => 
            `${error.field}: ${error.message} (${error.rule})`
        ).join('\n');
    }

    formatErrorsAsHtml(errors) {
        const errorItems = errors.map(error => 
            `<li class="validation-error ${error.severity}">
                <strong>${error.field}:</strong> ${error.message}
                <span class="error-rule">(${error.rule})</span>
            </li>`
        ).join('');
        
        return `<ul class="validation-errors">${errorItems}</ul>`;
    }

    // Public API
    validate(item, schema = null) {
        return this.validateItem(item, schema);
    }

    validateBatch(items, schema = null) {
        return this.validateMultipleItems(items, schema);
    }

    isValid(item, schema = null) {
        const result = this.validateItem(item, schema);
        return result.isValid;
    }

    getErrors(item, schema = null) {
        const result = this.validateItem(item, schema);
        return result.errors || [];
    }

    getWarnings(item, schema = null) {
        const result = this.validateItem(item, schema);
        return result.warnings || [];
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemValidator;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ItemValidator = ItemValidator;
}