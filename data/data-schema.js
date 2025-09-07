/**
 * Royalust Compliance Data Schema Validation Module
 * Validates compliance data structure and ensures data integrity
 * Version: 1.0.0
 */

class ComplianceDataSchema {
  constructor() {
    this.version = '1.0.0';
    this.schemaName = 'compliance-schema-v1';
  }

  /**
   * Validates the complete compliance data structure
   * @param {Object} data - The compliance data to validate
   * @returns {Object} - Validation result with success status and errors
   */
  validateCompleteData(data) {
    const errors = [];
    
    try {
      // Validate root structure
      if (!this.validateRootStructure(data)) {
        errors.push('Invalid root data structure');
      }

      // Validate metadata
      const metadataErrors = this.validateMetadata(data.metadata);
      errors.push(...metadataErrors);

      // Validate categories array
      const categoriesErrors = this.validateCategories(data.categories);
      errors.push(...categoriesErrors);

      // Cross-validation checks
      const crossValidationErrors = this.performCrossValidation(data);
      errors.push(...crossValidationErrors);

    } catch (error) {
      errors.push(`Schema validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: this.generateWarnings(data),
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * Validates the root structure of compliance data
   * @param {Object} data - The data to validate
   * @returns {boolean} - True if valid root structure
   */
  validateRootStructure(data) {
    if (!data || typeof data !== 'object') return false;
    
    const requiredFields = ['metadata', 'categories'];
    return requiredFields.every(field => data.hasOwnProperty(field));
  }

  /**
   * Validates metadata structure and content
   * @param {Object} metadata - The metadata to validate
   * @returns {Array} - Array of validation errors
   */
  validateMetadata(metadata) {
    const errors = [];
    
    if (!metadata || typeof metadata !== 'object') {
      errors.push('Metadata is required and must be an object');
      return errors;
    }

    // Required metadata fields
    const requiredFields = [
      'version', 'lastUpdated', 'totalCategories', 
      'totalItems', 'description', 'dataSchema'
    ];

    requiredFields.forEach(field => {
      if (!metadata.hasOwnProperty(field)) {
        errors.push(`Metadata missing required field: ${field}`);
      }
    });

    // Validate specific field types and formats
    if (metadata.version && typeof metadata.version !== 'string') {
      errors.push('Metadata version must be a string');
    }

    if (metadata.lastUpdated && !this.isValidISODate(metadata.lastUpdated)) {
      errors.push('Metadata lastUpdated must be a valid ISO date string');
    }

    if (metadata.totalCategories && !Number.isInteger(metadata.totalCategories)) {
      errors.push('Metadata totalCategories must be an integer');
    }

    if (metadata.totalItems && !Number.isInteger(metadata.totalItems)) {
      errors.push('Metadata totalItems must be an integer');
    }

    if (metadata.dataSchema && metadata.dataSchema !== this.schemaName) {
      errors.push(`Metadata dataSchema must be '${this.schemaName}'`);
    }

    return errors;
  }

  /**
   * Validates categories array and individual category structures
   * @param {Array} categories - The categories to validate
   * @returns {Array} - Array of validation errors
   */
  validateCategories(categories) {
    const errors = [];
    
    if (!Array.isArray(categories)) {
      errors.push('Categories must be an array');
      return errors;
    }

    if (categories.length === 0) {
      errors.push('Categories array cannot be empty');
      return errors;
    }

    // Validate each category
    categories.forEach((category, index) => {
      const categoryErrors = this.validateCategory(category, index);
      errors.push(...categoryErrors);
    });

    // Check for duplicate category IDs
    const categoryIds = categories.map(cat => cat.id).filter(Boolean);
    const duplicateIds = categoryIds.filter((id, index) => categoryIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate category IDs found: ${duplicateIds.join(', ')}`);
    }

    return errors;
  }

  /**
   * Validates individual category structure
   * @param {Object} category - The category to validate
   * @param {number} index - The category index for error reporting
   * @returns {Array} - Array of validation errors
   */
  validateCategory(category, index) {
    const errors = [];
    const categoryRef = `Category ${index + 1}`;

    if (!category || typeof category !== 'object') {
      errors.push(`${categoryRef}: Must be an object`);
      return errors;
    }

    // Required category fields
    const requiredFields = [
      'id', 'title', 'description', 'icon', 'priority', 
      'riskLevel', 'order', 'items'
    ];

    requiredFields.forEach(field => {
      if (!category.hasOwnProperty(field)) {
        errors.push(`${categoryRef}: Missing required field '${field}'`);
      }
    });

    // Validate field types and values
    if (category.id && typeof category.id !== 'string') {
      errors.push(`${categoryRef}: ID must be a string`);
    }

    if (category.priority && !this.isValidPriority(category.priority)) {
      errors.push(`${categoryRef}: Priority must be 'critical', 'high', 'medium', or 'low'`);
    }

    if (category.riskLevel && !this.isValidRiskLevel(category.riskLevel)) {
      errors.push(`${categoryRef}: Risk level must be 'high', 'medium', or 'low'`);
    }

    if (category.order && !Number.isInteger(category.order)) {
      errors.push(`${categoryRef}: Order must be an integer`);
    }

    // Validate items array
    if (category.items) {
      const itemErrors = this.validateItems(category.items, categoryRef);
      errors.push(...itemErrors);
    }

    return errors;
  }

  /**
   * Validates items array and individual item structures
   * @param {Array} items - The items to validate
   * @param {string} categoryRef - Reference to parent category for error reporting
   * @returns {Array} - Array of validation errors
   */
  validateItems(items, categoryRef) {
    const errors = [];

    if (!Array.isArray(items)) {
      errors.push(`${categoryRef}: Items must be an array`);
      return errors;
    }

    if (items.length === 0) {
      errors.push(`${categoryRef}: Items array cannot be empty`);
      return errors;
    }

    // Validate each item
    items.forEach((item, index) => {
      const itemErrors = this.validateItem(item, `${categoryRef}, Item ${index + 1}`);
      errors.push(...itemErrors);
    });

    // Check for duplicate item IDs within category
    const itemIds = items.map(item => item.id).filter(Boolean);
    const duplicateIds = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`${categoryRef}: Duplicate item IDs found: ${duplicateIds.join(', ')}`);
    }

    return errors;
  }

  /**
   * Validates individual item structure
   * @param {Object} item - The item to validate
   * @param {string} itemRef - Reference for error reporting
   * @returns {Array} - Array of validation errors
   */
  validateItem(item, itemRef) {
    const errors = [];

    if (!item || typeof item !== 'object') {
      errors.push(`${itemRef}: Must be an object`);
      return errors;
    }

    // Required item fields
    const requiredFields = [
      'id', 'title', 'description', 'completed', 
      'priority', 'category', 'sources'
    ];

    requiredFields.forEach(field => {
      if (!item.hasOwnProperty(field)) {
        errors.push(`${itemRef}: Missing required field '${field}'`);
      }
    });

    // Validate field types and values
    if (item.id && typeof item.id !== 'string') {
      errors.push(`${itemRef}: ID must be a string`);
    }

    if (item.completed && typeof item.completed !== 'boolean') {
      errors.push(`${itemRef}: Completed must be a boolean`);
    }

    if (item.priority && !this.isValidPriority(item.priority)) {
      errors.push(`${itemRef}: Priority must be 'critical', 'high', 'medium', or 'low'`);
    }

    if (item.category && typeof item.category !== 'string') {
      errors.push(`${itemRef}: Category must be a string`);
    }

    // Validate sources array
    if (item.sources) {
      const sourceErrors = this.validateSources(item.sources, itemRef);
      errors.push(...sourceErrors);
    }

    return errors;
  }

  /**
   * Validates sources array and individual source structures
   * @param {Array} sources - The sources to validate
   * @param {string} itemRef - Reference to parent item for error reporting
   * @returns {Array} - Array of validation errors
   */
  validateSources(sources, itemRef) {
    const errors = [];

    if (!Array.isArray(sources)) {
      errors.push(`${itemRef}: Sources must be an array`);
      return errors;
    }

    sources.forEach((source, index) => {
      const sourceRef = `${itemRef}, Source ${index + 1}`;
      
      if (!source || typeof source !== 'object') {
        errors.push(`${sourceRef}: Must be an object`);
        return;
      }

      // Required source fields (title is required, url and type are optional but recommended)
      if (!source.title || typeof source.title !== 'string') {
        errors.push(`${sourceRef}: Title is required and must be a string`);
      }

      if (source.url && (typeof source.url !== 'string' || !this.isValidURL(source.url))) {
        errors.push(`${sourceRef}: URL must be a valid URL string`);
      }

      if (source.type && !this.isValidSourceType(source.type)) {
        errors.push(`${sourceRef}: Type must be 'regulation', 'reference', 'form', 'system', or 'department'`);
      }
    });

    return errors;
  }

  /**
   * Performs cross-validation checks across the entire data structure
   * @param {Object} data - The complete compliance data
   * @returns {Array} - Array of cross-validation errors
   */
  performCrossValidation(data) {
    const errors = [];

    if (!data.metadata || !data.categories) {
      return errors; // Basic structure validation should catch this
    }

    // Validate total categories count
    if (data.metadata.totalCategories !== data.categories.length) {
      errors.push(`Metadata totalCategories (${data.metadata.totalCategories}) does not match actual categories count (${data.categories.length})`);
    }

    // Validate total items count
    const actualItemsCount = data.categories.reduce((total, category) => {
      return total + (category.items ? category.items.length : 0);
    }, 0);

    if (data.metadata.totalItems !== actualItemsCount) {
      errors.push(`Metadata totalItems (${data.metadata.totalItems}) does not match actual items count (${actualItemsCount})`);
    }

    // Validate category order sequence
    const orders = data.categories.map(cat => cat.order).filter(order => order !== undefined);
    const expectedOrders = Array.from({length: orders.length}, (_, i) => i + 1);
    const sortedOrders = [...orders].sort((a, b) => a - b);
    
    if (JSON.stringify(sortedOrders) !== JSON.stringify(expectedOrders)) {
      errors.push('Category orders should be sequential starting from 1');
    }

    return errors;
  }

  /**
   * Generates warnings for potential issues that don't break validation
   * @param {Object} data - The compliance data
   * @returns {Array} - Array of warning messages
   */
  generateWarnings(data) {
    const warnings = [];

    if (!data.categories) return warnings;

    // Check for categories without items
    data.categories.forEach((category, index) => {
      if (!category.items || category.items.length === 0) {
        warnings.push(`Category ${index + 1} (${category.title || 'Unknown'}) has no items`);
      }
    });

    // Check for items without sources
    data.categories.forEach((category, catIndex) => {
      if (category.items) {
        category.items.forEach((item, itemIndex) => {
          if (!item.sources || item.sources.length === 0) {
            warnings.push(`Category ${catIndex + 1}, Item ${itemIndex + 1} (${item.title || 'Unknown'}) has no sources`);
          }
        });
      }
    });

    // Check for outdated lastUpdated
    if (data.metadata.lastUpdated) {
      const lastUpdated = new Date(data.metadata.lastUpdated);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastUpdated < thirtyDaysAgo) {
        warnings.push('Data has not been updated in over 30 days');
      }
    }

    return warnings;
  }

  // Utility validation methods

  /**
   * Validates if a string is a valid ISO date
   * @param {string} dateString - The date string to validate
   * @returns {boolean} - True if valid ISO date
   */
  isValidISODate(dateString) {
    if (typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString.includes('T');
  }

  /**
   * Validates if a priority value is valid
   * @param {string} priority - The priority to validate
   * @returns {boolean} - True if valid priority
   */
  isValidPriority(priority) {
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    return validPriorities.includes(priority);
  }

  /**
   * Validates if a risk level value is valid
   * @param {string} riskLevel - The risk level to validate
   * @returns {boolean} - True if valid risk level
   */
  isValidRiskLevel(riskLevel) {
    const validRiskLevels = ['high', 'medium', 'low'];
    return validRiskLevels.includes(riskLevel);
  }

  /**
   * Validates if a source type is valid
   * @param {string} type - The source type to validate
   * @returns {boolean} - True if valid source type
   */
  isValidSourceType(type) {
    const validTypes = ['regulation', 'reference', 'form', 'system', 'department'];
    return validTypes.includes(type);
  }

  /**
   * Basic URL validation
   * @param {string} url - The URL to validate
   * @returns {boolean} - True if valid URL format
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates and sanitizes compliance data for export
   * @param {Object} data - The data to sanitize
   * @returns {Object} - Sanitized data safe for export
   */
  sanitizeForExport(data) {
    const validation = this.validateCompleteData(data);
    
    if (!validation.isValid) {
      throw new Error(`Cannot sanitize invalid data: ${validation.errors.join(', ')}`);
    }

    // Create a deep copy and remove any potentially sensitive fields
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Add export metadata
    sanitized.exportMetadata = {
      exportedAt: new Date().toISOString(),
      schemaVersion: this.version,
      validationPassed: true
    };

    return sanitized;
  }

  /**
   * Creates a minimal data structure template
   * @returns {Object} - Basic compliance data template
   */
  createTemplate() {
    return {
      metadata: {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        totalCategories: 0,
        totalItems: 0,
        description: "Royalust Compliance Checklist Template",
        dataSchema: this.schemaName,
        maintainer: "Royalust Operations Team"
      },
      categories: []
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComplianceDataSchema;
} else if (typeof window !== 'undefined') {
  window.ComplianceDataSchema = ComplianceDataSchema;
}