/**
 * Input Validation and Data Integrity Module
 * Provides comprehensive validation for all application data and user inputs
 */

class ValidationSystem {
    constructor() {
        this.rules = new Map();
        this.customValidators = new Map();
        this.errorMessages = new Map();
        
        // Initialize default validation rules
        this.initializeDefaultRules();
        this.initializeErrorMessages();
    }
    
    /**
     * Initialize default validation rules
     */
    initializeDefaultRules() {
        // Basic data type validators
        this.addRule('required', (value) => {
            return value !== null && value !== undefined && value !== '';
        });
        
        this.addRule('string', (value) => {
            return typeof value === 'string';
        });
        
        this.addRule('number', (value) => {
            return typeof value === 'number' && !isNaN(value);
        });
        
        this.addRule('boolean', (value) => {
            return typeof value === 'boolean';
        });
        
        this.addRule('array', (value) => {
            return Array.isArray(value);
        });
        
        this.addRule('object', (value) => {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        });
        
        // String validators
        this.addRule('minLength', (value, min) => {
            return typeof value === 'string' && value.length >= min;
        });
        
        this.addRule('maxLength', (value, max) => {
            return typeof value === 'string' && value.length <= max;
        });
        
        this.addRule('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return typeof value === 'string' && emailRegex.test(value);
        });
        
        this.addRule('url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });
        
        // Number validators
        this.addRule('min', (value, min) => {
            return typeof value === 'number' && value >= min;
        });
        
        this.addRule('max', (value, max) => {
            return typeof value === 'number' && value <= max;
        });
        
        this.addRule('integer', (value) => {
            return typeof value === 'number' && Number.isInteger(value);
        });
        
        this.addRule('positive', (value) => {
            return typeof value === 'number' && value > 0;
        });
        
        this.addRule('percentage', (value) => {
            return typeof value === 'number' && value >= 0 && value <= 100;
        });
        
        // Array validators
        this.addRule('minItems', (value, min) => {
            return Array.isArray(value) && value.length >= min;
        });
        
        this.addRule('maxItems', (value, max) => {
            return Array.isArray(value) && value.length <= max;
        });
        
        // Compliance-specific validators
        this.addRule('complianceId', (value) => {
            return typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
        });
        
        this.addRule('riskLevel', (value) => {
            const validLevels = ['low', 'medium', 'high', 'critical'];
            return validLevels.includes(value);
        });
        
        this.addRule('priority', (value) => {
            const validPriorities = ['low', 'medium', 'high'];
            return validPriorities.includes(value);
        });
        
        this.addRule('completionStatus', (value) => {
            return typeof value === 'boolean';
        });
    }
    
    /**
     * Initialize default error messages
     */
    initializeErrorMessages() {
        this.errorMessages.set('required', 'This field is required');
        this.errorMessages.set('string', 'Must be a valid string');
        this.errorMessages.set('number', 'Must be a valid number');
        this.errorMessages.set('boolean', 'Must be true or false');
        this.errorMessages.set('array', 'Must be an array');
        this.errorMessages.set('object', 'Must be an object');
        this.errorMessages.set('minLength', 'Must be at least {param} characters long');
        this.errorMessages.set('maxLength', 'Must be no more than {param} characters long');
        this.errorMessages.set('email', 'Must be a valid email address');
        this.errorMessages.set('url', 'Must be a valid URL');
        this.errorMessages.set('min', 'Must be at least {param}');
        this.errorMessages.set('max', 'Must be no more than {param}');
        this.errorMessages.set('integer', 'Must be a whole number');
        this.errorMessages.set('positive', 'Must be a positive number');
        this.errorMessages.set('percentage', 'Must be between 0 and 100');
        this.errorMessages.set('minItems', 'Must have at least {param} items');
        this.errorMessages.set('maxItems', 'Must have no more than {param} items');
        this.errorMessages.set('complianceId', 'Must be a valid compliance ID (lowercase letters, numbers, and hyphens only)');
        this.errorMessages.set('riskLevel', 'Must be one of: low, medium, high, critical');
        this.errorMessages.set('priority', 'Must be one of: low, medium, high');
        this.errorMessages.set('completionStatus', 'Must be completed (true) or incomplete (false)');
    }
    
    /**
     * Add a custom validation rule
     * @param {string} name - Rule name
     * @param {Function} validator - Validation function
     * @param {string} errorMessage - Error message template
     */
    addRule(name, validator, errorMessage = null) {
        this.rules.set(name, validator);
        if (errorMessage) {
            this.errorMessages.set(name, errorMessage);
        }
    }
    
    /**
     * Add a custom validator for complex validation logic
     * @param {string} name - Validator name
     * @param {Function} validator - Validation function
     */
    addCustomValidator(name, validator) {
        this.customValidators.set(name, validator);
    }
    
    /**
     * Validate a single value against rules
     * @param {*} value - Value to validate
     * @param {Array|Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    validate(value, rules) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Handle array of rule names
        if (Array.isArray(rules)) {
            rules.forEach(rule => {
                const ruleResult = this.validateRule(value, rule);
                if (!ruleResult.isValid) {
                    result.isValid = false;
                    result.errors.push(ruleResult.error);
                }
            });
        }
        // Handle object with rule configurations
        else if (typeof rules === 'object') {
            Object.entries(rules).forEach(([ruleName, ruleConfig]) => {
                const ruleResult = this.validateRule(value, ruleName, ruleConfig);
                if (!ruleResult.isValid) {
                    result.isValid = false;
                    result.errors.push(ruleResult.error);
                }
            });
        }
        
        return result;
    }
    
    /**
     * Validate a single rule
     * @param {*} value - Value to validate
     * @param {string} ruleName - Rule name
     * @param {*} ruleConfig - Rule configuration
     * @returns {Object} Rule validation result
     */
    validateRule(value, ruleName, ruleConfig = null) {
        const result = {
            isValid: true,
            error: null
        };
        
        const validator = this.rules.get(ruleName);
        if (!validator) {
            result.isValid = false;
            result.error = `Unknown validation rule: ${ruleName}`;
            return result;
        }
        
        try {
            let isValid;
            if (ruleConfig !== null) {
                isValid = validator(value, ruleConfig);
            } else {
                isValid = validator(value);
            }
            
            if (!isValid) {
                result.isValid = false;
                result.error = this.getErrorMessage(ruleName, ruleConfig);
            }
        } catch (error) {
            result.isValid = false;
            result.error = `Validation error: ${error.message}`;
        }
        
        return result;
    }
    
    /**
     * Get formatted error message for a rule
     * @param {string} ruleName - Rule name
     * @param {*} param - Rule parameter
     * @returns {string} Formatted error message
     */
    getErrorMessage(ruleName, param = null) {
        const template = this.errorMessages.get(ruleName) || `Validation failed for rule: ${ruleName}`;
        return param !== null ? template.replace('{param}', param) : template;
    }
    
    /**
     * Validate compliance data structure
     * @param {Object} data - Compliance data to validate
     * @returns {Object} Validation result
     */
    validateComplianceData(data) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Validate root structure
        if (!this.validate(data, ['required', 'object']).isValid) {
            result.isValid = false;
            result.errors.push('Compliance data must be a valid object');
            return result;
        }
        
        // Validate categories array
        if (!data.categories) {
            result.isValid = false;
            result.errors.push('Categories array is required');
        } else {
            const categoriesResult = this.validateCategories(data.categories);
            if (!categoriesResult.isValid) {
                result.isValid = false;
                result.errors.push(...categoriesResult.errors);
            }
        }
        
        // Validate metadata
        if (data.metadata) {
            const metadataResult = this.validateMetadata(data.metadata);
            if (!metadataResult.isValid) {
                result.isValid = false;
                result.errors.push(...metadataResult.errors);
            }
        }
        
        return result;
    }
    
    /**
     * Validate categories array
     * @param {Array} categories - Categories to validate
     * @returns {Object} Validation result
     */
    validateCategories(categories) {
        const result = {
            isValid: true,
            errors: []
        };
        
        if (!Array.isArray(categories)) {
            result.isValid = false;
            result.errors.push('Categories must be an array');
            return result;
        }
        
        categories.forEach((category, index) => {
            const categoryResult = this.validateCategory(category, index);
            if (!categoryResult.isValid) {
                result.isValid = false;
                result.errors.push(...categoryResult.errors);
            }
        });
        
        return result;
    }
    
    /**
     * Validate individual category
     * @param {Object} category - Category to validate
     * @param {number} index - Category index
     * @returns {Object} Validation result
     */
    validateCategory(category, index) {
        const result = {
            isValid: true,
            errors: []
        };
        
        const prefix = `Category ${index + 1}`;
        
        // Required fields
        const requiredFields = ['id', 'title', 'items'];
        requiredFields.forEach(field => {
            if (!category[field]) {
                result.isValid = false;
                result.errors.push(`${prefix}: ${field} is required`);
            }
        });
        
        // Validate ID format
        if (category.id && !this.validate(category.id, ['complianceId']).isValid) {
            result.isValid = false;
            result.errors.push(`${prefix}: Invalid ID format`);
        }
        
        // Validate risk level
        if (category.riskLevel && !this.validate(category.riskLevel, ['riskLevel']).isValid) {
            result.isValid = false;
            result.errors.push(`${prefix}: Invalid risk level`);
        }
        
        // Validate priority
        if (category.priority && !this.validate(category.priority, ['priority']).isValid) {
            result.isValid = false;
            result.errors.push(`${prefix}: Invalid priority`);
        }
        
        // Validate items
        if (category.items) {
            const itemsResult = this.validateItems(category.items, category.id);
            if (!itemsResult.isValid) {
                result.isValid = false;
                result.errors.push(...itemsResult.errors);
            }
        }
        
        return result;
    }
    
    /**
     * Validate items array
     * @param {Array} items - Items to validate
     * @param {string} categoryId - Parent category ID
     * @returns {Object} Validation result
     */
    validateItems(items, categoryId) {
        const result = {
            isValid: true,
            errors: []
        };
        
        if (!Array.isArray(items)) {
            result.isValid = false;
            result.errors.push(`Category ${categoryId}: Items must be an array`);
            return result;
        }
        
        items.forEach((item, index) => {
            const itemResult = this.validateItem(item, categoryId, index);
            if (!itemResult.isValid) {
                result.isValid = false;
                result.errors.push(...itemResult.errors);
            }
        });
        
        return result;
    }
    
    /**
     * Validate individual item
     * @param {Object} item - Item to validate
     * @param {string} categoryId - Parent category ID
     * @param {number} index - Item index
     * @returns {Object} Validation result
     */
    validateItem(item, categoryId, index) {
        const result = {
            isValid: true,
            errors: []
        };
        
        const prefix = `Category ${categoryId}, Item ${index + 1}`;
        
        // Required fields
        const requiredFields = ['id', 'title'];
        requiredFields.forEach(field => {
            if (!item[field]) {
                result.isValid = false;
                result.errors.push(`${prefix}: ${field} is required`);
            }
        });
        
        // Validate completion status
        if (item.completed !== undefined && !this.validate(item.completed, ['completionStatus']).isValid) {
            result.isValid = false;
            result.errors.push(`${prefix}: Invalid completion status`);
        }
        
        // Validate sources array
        if (item.sources && !Array.isArray(item.sources)) {
            result.isValid = false;
            result.errors.push(`${prefix}: Sources must be an array`);
        }
        
        return result;
    }
    
    /**
     * Validate metadata object
     * @param {Object} metadata - Metadata to validate
     * @returns {Object} Validation result
     */
    validateMetadata(metadata) {
        const result = {
            isValid: true,
            errors: []
        };
        
        if (!this.validate(metadata, ['object']).isValid) {
            result.isValid = false;
            result.errors.push('Metadata must be an object');
            return result;
        }
        
        // Validate version
        if (metadata.version && !this.validate(metadata.version, ['string']).isValid) {
            result.isValid = false;
            result.errors.push('Metadata version must be a string');
        }
        
        // Validate counts
        if (metadata.totalCategories !== undefined && !this.validate(metadata.totalCategories, ['integer', 'positive']).isValid) {
            result.isValid = false;
            result.errors.push('Total categories must be a positive integer');
        }
        
        if (metadata.totalItems !== undefined && !this.validate(metadata.totalItems, ['integer', 'positive']).isValid) {
            result.isValid = false;
            result.errors.push('Total items must be a positive integer');
        }
        
        return result;
    }
    
    /**
     * Sanitize input data
     * @param {*} data - Data to sanitize
     * @param {Object} options - Sanitization options
     * @returns {*} Sanitized data
     */
    sanitize(data, options = {}) {
        if (typeof data === 'string') {
            return this.sanitizeString(data, options);
        } else if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item, options));
        } else if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            Object.entries(data).forEach(([key, value]) => {
                sanitized[key] = this.sanitize(value, options);
            });
            return sanitized;
        }
        
        return data;
    }
    
    /**
     * Sanitize string input
     * @param {string} str - String to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized string
     */
    sanitizeString(str, options = {}) {
        if (typeof str !== 'string') return str;
        
        let sanitized = str;
        
        // Trim whitespace
        if (options.trim !== false) {
            sanitized = sanitized.trim();
        }
        
        // Remove HTML tags
        if (options.stripHtml) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }
        
        // Escape HTML entities
        if (options.escapeHtml) {
            sanitized = sanitized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        }
        
        return sanitized;
    }
}

// Create singleton instance
const validationSystem = new ValidationSystem();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationSystem;
} else {
    window.ValidationSystem = ValidationSystem;
    window.validationSystem = validationSystem;
}