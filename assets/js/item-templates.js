/**
 * Item Templates Module
 * Provides different item types and layouts for checklist items
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ItemTemplateManager {
    constructor(options = {}) {
        this.options = {
            defaultTemplate: 'standard',
            enableCustomTemplates: true,
            validateTemplates: true,
            cacheTemplates: true,
            ...options
        };
        
        this.templates = new Map();
        this.templateCache = new Map();
        this.customTemplates = new Map();
        this.templateVariables = new Map();
        
        this.init();
    }

    init() {
        this.registerDefaultTemplates();
        this.setupTemplateVariables();
        this.loadCustomTemplates();
    }

    // Template Registration
    registerDefaultTemplates() {
        // Standard checklist item template
        this.templates.set('standard', {
            name: 'Standard Item',
            description: 'Default checklist item layout',
            category: 'basic',
            template: `
                <div class="checklist-item standard-item" data-template="standard">
                    <div class="item-header">
                        <button class="completion-toggle" data-action="toggle-completion">
                            <span class="completion-icon">{{completionIcon}}</span>
                        </button>
                        <div class="item-content">
                            <h4 class="item-title">{{title}}</h4>
                            {{#if description}}
                            <p class="item-description">{{description}}</p>
                            {{/if}}
                        </div>
                        <div class="item-badges">
                            {{#if priority}}
                            <span class="priority-badge priority-{{priority}}">{{priorityIcon}}</span>
                            {{/if}}
                            {{#if riskLevel}}
                            <span class="risk-badge risk-{{riskLevel}}">{{riskIcon}}</span>
                            {{/if}}
                        </div>
                    </div>
                    {{#if hasDetails}}
                    <div class="item-details collapsed">
                        {{> itemDetails}}
                    </div>
                    {{/if}}
                </div>
            `,
            partials: {
                itemDetails: `
                    {{#if sources}}
                    <div class="sources-section">
                        <h5>Reference Sources</h5>
                        {{#each sources}}
                        <a href="{{url}}" target="_blank" class="source-link">{{title}}</a>
                        {{/each}}
                    </div>
                    {{/if}}
                `
            },
            variables: ['title', 'description', 'priority', 'riskLevel', 'sources', 'completed']
        });

        // Compact item template
        this.templates.set('compact', {
            name: 'Compact Item',
            description: 'Minimal layout for dense lists',
            category: 'basic',
            template: `
                <div class="checklist-item compact-item" data-template="compact">
                    <button class="completion-toggle" data-action="toggle-completion">
                        <span class="completion-icon">{{completionIcon}}</span>
                    </button>
                    <span class="item-title">{{title}}</span>
                    {{#if priority}}
                    <span class="priority-indicator priority-{{priority}}">{{priorityIcon}}</span>
                    {{/if}}
                </div>
            `,
            variables: ['title', 'priority', 'completed']
        });

        // Detailed item template
        this.templates.set('detailed', {
            name: 'Detailed Item',
            description: 'Comprehensive layout with all information visible',
            category: 'advanced',
            template: `
                <div class="checklist-item detailed-item" data-template="detailed">
                    <div class="item-header">
                        <button class="completion-toggle" data-action="toggle-completion">
                            <span class="completion-icon">{{completionIcon}}</span>
                        </button>
                        <div class="item-content">
                            <h4 class="item-title">{{title}}</h4>
                            {{#if description}}
                            <p class="item-description">{{description}}</p>
                            {{/if}}
                            {{#if notes}}
                            <div class="item-notes">
                                {{#each notes}}
                                <div class="note">{{this}}</div>
                                {{/each}}
                            </div>
                            {{/if}}
                        </div>
                        <div class="item-metadata">
                            {{#if priority}}
                            <div class="metadata-item">
                                <span class="label">Priority:</span>
                                <span class="priority-badge priority-{{priority}}">{{priority}}</span>
                            </div>
                            {{/if}}
                            {{#if riskLevel}}
                            <div class="metadata-item">
                                <span class="label">Risk:</span>
                                <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}}</span>
                            </div>
                            {{/if}}
                            {{#if deadline}}
                            <div class="metadata-item">
                                <span class="label">Deadline:</span>
                                <span class="deadline {{deadlineClass}}">{{formattedDeadline}}</span>
                            </div>
                            {{/if}}
                        </div>
                    </div>
                    <div class="item-details expanded">
                        {{> detailedSources}}
                        {{> detailedDependencies}}
                        {{> detailedHistory}}
                    </div>
                </div>
            `,
            partials: {
                detailedSources: `
                    {{#if sources}}
                    <div class="sources-section">
                        <h5>Reference Sources</h5>
                        <div class="sources-grid">
                            {{#each sources}}
                            <div class="source-item">
                                <a href="{{url}}" target="_blank" class="source-link">
                                    <span class="source-icon">{{icon}}</span>
                                    <span class="source-title">{{title}}</span>
                                    {{#if description}}
                                    <span class="source-description">{{description}}</span>
                                    {{/if}}
                                </a>
                            </div>
                            {{/each}}
                        </div>
                    </div>
                    {{/if}}
                `,
                detailedDependencies: `
                    {{#if dependencies}}
                    <div class="dependencies-section">
                        <h5>Dependencies</h5>
                        <div class="dependencies-list">
                            {{#each dependencies}}
                            <span class="dependency-item" data-dependency="{{this}}">{{this}}</span>
                            {{/each}}
                        </div>
                    </div>
                    {{/if}}
                `,
                detailedHistory: `
                    {{#if history}}
                    <div class="history-section">
                        <h5>Recent Activity</h5>
                        <div class="history-timeline">
                            {{#each history}}
                            <div class="history-entry">
                                <span class="history-action {{action}}">{{actionIcon}}</span>
                                <span class="history-date">{{formattedDate}}</span>
                                <span class="history-description">{{description}}</span>
                            </div>
                            {{/each}}
                        </div>
                    </div>
                    {{/if}}
                `
            },
            variables: ['title', 'description', 'notes', 'priority', 'riskLevel', 'deadline', 'sources', 'dependencies', 'history', 'completed']
        });

        // Card-style template
        this.templates.set('card', {
            name: 'Card Layout',
            description: 'Card-based layout with visual emphasis',
            category: 'visual',
            template: `
                <div class="checklist-item card-item {{priorityClass}} {{completionClass}}" data-template="card">
                    <div class="card-header">
                        <div class="card-badges">
                            {{#if priority}}
                            <span class="priority-badge priority-{{priority}}">{{priority}}</span>
                            {{/if}}
                            {{#if riskLevel}}
                            <span class="risk-badge risk-{{riskLevel}}">{{riskLevel}}</span>
                            {{/if}}
                        </div>
                        <button class="completion-toggle" data-action="toggle-completion">
                            <span class="completion-icon">{{completionIcon}}</span>
                        </button>
                    </div>
                    <div class="card-body">
                        <h4 class="card-title">{{title}}</h4>
                        {{#if description}}
                        <p class="card-description">{{description}}</p>
                        {{/if}}
                        {{#if progress}}
                        <div class="progress-section">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: {{progress}}%"></div>
                            </div>
                            <span class="progress-text">{{progress}}% Complete</span>
                        </div>
                        {{/if}}
                    </div>
                    {{#if hasFooter}}
                    <div class="card-footer">
                        {{#if sources}}
                        <span class="footer-item">
                            <span class="icon">🔗</span>
                            <span class="text">{{sources.length}} sources</span>
                        </span>
                        {{/if}}
                        {{#if deadline}}
                        <span class="footer-item deadline-item {{deadlineClass}}">
                            <span class="icon">📅</span>
                            <span class="text">{{formattedDeadline}}</span>
                        </span>
                        {{/if}}
                    </div>
                    {{/if}}
                </div>
            `,
            variables: ['title', 'description', 'priority', 'riskLevel', 'progress', 'sources', 'deadline', 'completed']
        });

        // Regulatory compliance template
        this.templates.set('regulatory', {
            name: 'Regulatory Compliance',
            description: 'Specialized template for regulatory requirements',
            category: 'compliance',
            template: `
                <div class="checklist-item regulatory-item" data-template="regulatory">
                    <div class="regulatory-header">
                        <div class="compliance-status">
                            <button class="completion-toggle" data-action="toggle-completion">
                                <span class="completion-icon">{{completionIcon}}</span>
                            </button>
                            <span class="status-text">{{statusText}}</span>
                        </div>
                        <div class="regulatory-info">
                            <h4 class="requirement-title">{{title}}</h4>
                            {{#if regulationCode}}
                            <span class="regulation-code">{{regulationCode}}</span>
                            {{/if}}
                            {{#if authority}}
                            <span class="regulatory-authority">{{authority}}</span>
                            {{/if}}
                        </div>
                        <div class="compliance-indicators">
                            {{#if riskLevel}}
                            <span class="risk-indicator risk-{{riskLevel}}" title="Risk Level: {{riskLevel}}">
                                {{riskIcon}}
                            </span>
                            {{/if}}
                            {{#if deadline}}
                            <span class="deadline-indicator {{deadlineClass}}" title="Deadline: {{formattedDeadline}}">
                                📅
                            </span>
                            {{/if}}
                        </div>
                    </div>
                    <div class="regulatory-content">
                        {{#if description}}
                        <div class="requirement-description">{{description}}</div>
                        {{/if}}
                        {{#if complianceNotes}}
                        <div class="compliance-notes">
                            <h6>Compliance Notes:</h6>
                            {{#each complianceNotes}}
                            <div class="compliance-note">{{this}}</div>
                            {{/each}}
                        </div>
                        {{/if}}
                        {{#if sources}}
                        <div class="regulatory-sources">
                            <h6>Legal References:</h6>
                            <div class="sources-list">
                                {{#each sources}}
                                <a href="{{url}}" target="_blank" class="regulatory-source">
                                    <span class="source-type">{{type}}</span>
                                    <span class="source-title">{{title}}</span>
                                    <span class="external-link">↗</span>
                                </a>
                                {{/each}}
                            </div>
                        </div>
                        {{/if}}
                    </div>
                </div>
            `,
            variables: ['title', 'description', 'regulationCode', 'authority', 'riskLevel', 'deadline', 'complianceNotes', 'sources', 'completed']
        });

        // Milestone template
        this.templates.set('milestone', {
            name: 'Milestone',
            description: 'Template for major milestones and achievements',
            category: 'project',
            template: `
                <div class="checklist-item milestone-item {{completionClass}}" data-template="milestone">
                    <div class="milestone-marker">
                        <div class="milestone-icon">
                            {{#if completed}}🏆{{else}}🎯{{/if}}
                        </div>
                        <div class="milestone-line"></div>
                    </div>
                    <div class="milestone-content">
                        <div class="milestone-header">
                            <h4 class="milestone-title">{{title}}</h4>
                            <button class="completion-toggle" data-action="toggle-completion">
                                <span class="completion-text">{{#if completed}}Completed{{else}}Mark Complete{{/if}}</span>
                            </button>
                        </div>
                        {{#if description}}
                        <p class="milestone-description">{{description}}</p>
                        {{/if}}
                        {{#if subItems}}
                        <div class="milestone-subitems">
                            <div class="subitems-progress">
                                <span class="progress-text">{{completedSubItems}}/{{totalSubItems}} tasks completed</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: {{subItemsProgress}}%"></div>
                                </div>
                            </div>
                            <div class="subitems-list">
                                {{#each subItems}}
                                <div class="subitem {{#if completed}}completed{{/if}}">
                                    <span class="subitem-icon">{{#if completed}}✓{{else}}○{{/if}}</span>
                                    <span class="subitem-title">{{title}}</span>
                                </div>
                                {{/each}}
                            </div>
                        </div>
                        {{/if}}
                        {{#if deadline}}
                        <div class="milestone-deadline {{deadlineClass}}">
                            <span class="deadline-icon">📅</span>
                            <span class="deadline-text">Target: {{formattedDeadline}}</span>
                        </div>
                        {{/if}}
                    </div>
                </div>
            `,
            variables: ['title', 'description', 'deadline', 'subItems', 'completed']
        });
    }

    // Template Variables Setup
    setupTemplateVariables() {
        // Icon mappings
        this.templateVariables.set('completionIcon', (completed) => completed ? '✓' : '○');
        this.templateVariables.set('priorityIcon', (priority) => {
            const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
            return icons[priority] || '⚪';
        });
        this.templateVariables.set('riskIcon', (riskLevel) => {
            const icons = { high: '⚠️', medium: '⚡', low: '✅' };
            return icons[riskLevel] || '❓';
        });
        this.templateVariables.set('actionIcon', (action) => {
            const icons = { completed: '✓', uncompleted: '○', updated: '📝', created: '➕' };
            return icons[action] || '📋';
        });

        // Class mappings
        this.templateVariables.set('priorityClass', (priority) => priority ? `priority-${priority}` : '');
        this.templateVariables.set('completionClass', (completed) => completed ? 'completed' : 'incomplete');
        this.templateVariables.set('deadlineClass', (deadline) => {
            if (!deadline) return '';
            const date = new Date(deadline);
            const now = new Date();
            const daysUntil = (date - now) / (1000 * 60 * 60 * 24);
            
            if (daysUntil < 0) return 'overdue';
            if (daysUntil <= 3) return 'urgent';
            if (daysUntil <= 7) return 'approaching';
            return 'future';
        });

        // Text formatters
        this.templateVariables.set('formattedDeadline', (deadline) => {
            if (!deadline) return '';
            const date = new Date(deadline);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        });
        this.templateVariables.set('formattedDate', (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        });
        this.templateVariables.set('statusText', (completed) => completed ? 'Compliant' : 'Pending');

        // Computed properties
        this.templateVariables.set('hasDetails', (item) => {
            return !!(item.sources?.length || item.dependencies?.length || item.notes?.length || item.history?.length);
        });
        this.templateVariables.set('hasFooter', (item) => {
            return !!(item.sources?.length || item.deadline);
        });
        this.templateVariables.set('subItemsProgress', (subItems) => {
            if (!subItems || subItems.length === 0) return 0;
            const completed = subItems.filter(item => item.completed).length;
            return Math.round((completed / subItems.length) * 100);
        });
        this.templateVariables.set('completedSubItems', (subItems) => {
            if (!subItems) return 0;
            return subItems.filter(item => item.completed).length;
        });
        this.templateVariables.set('totalSubItems', (subItems) => {
            return subItems ? subItems.length : 0;
        });
    }

    // Template Rendering
    renderItem(itemData, templateName = null) {
        const template = this.getTemplate(templateName || this.options.defaultTemplate);
        if (!template) {
            throw new Error(`Template not found: ${templateName || this.options.defaultTemplate}`);
        }

        // Prepare template data
        const templateData = this.prepareTemplateData(itemData, template);

        // Render template
        const rendered = this.processTemplate(template.template, templateData, template.partials);

        return {
            html: rendered,
            templateName: templateName || this.options.defaultTemplate,
            data: templateData
        };
    }

    prepareTemplateData(itemData, template) {
        const data = { ...itemData };

        // Apply template variables
        template.variables.forEach(varName => {
            const processor = this.templateVariables.get(varName);
            if (processor && typeof processor === 'function') {
                data[varName] = processor(itemData[varName], itemData);
            }
        });

        // Add computed properties
        this.templateVariables.forEach((processor, varName) => {
            if (typeof processor === 'function' && !template.variables.includes(varName)) {
                data[varName] = processor(itemData, itemData);
            }
        });

        return data;
    }

    processTemplate(templateString, data, partials = {}) {
        let processed = templateString;

        // Process partials first
        Object.entries(partials).forEach(([partialName, partialTemplate]) => {
            const partialRegex = new RegExp(`{{>\\s*${partialName}\\s*}}`, 'g');
            const renderedPartial = this.processTemplate(partialTemplate, data);
            processed = processed.replace(partialRegex, renderedPartial);
        });

        // Process conditionals
        processed = this.processConditionals(processed, data);

        // Process loops
        processed = this.processLoops(processed, data);

        // Process variables
        processed = this.processVariables(processed, data);

        return processed;
    }

    processConditionals(template, data) {
        // Handle {{#if condition}} blocks
        const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        return template.replace(ifRegex, (match, condition, content) => {
            const value = this.getNestedProperty(data, condition);
            return value ? content : '';
        });
    }

    processLoops(template, data) {
        // Handle {{#each array}} blocks
        const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
        return template.replace(eachRegex, (match, arrayName, content) => {
            const array = this.getNestedProperty(data, arrayName);
            if (!Array.isArray(array)) return '';

            return array.map(item => {
                let itemContent = content;
                // Replace {{this}} with current item
                itemContent = itemContent.replace(/{{this}}/g, item);
                
                // Replace {{property}} with item.property
                if (typeof item === 'object') {
                    Object.keys(item).forEach(key => {
                        const regex = new RegExp(`{{${key}}}`, 'g');
                        itemContent = itemContent.replace(regex, item[key] || '');
                    });
                }
                
                return itemContent;
            }).join('');
        });
    }

    processVariables(template, data) {
        // Handle {{variable}} replacements
        const varRegex = /{{(\w+(?:\.\w+)*)}}/g;
        return template.replace(varRegex, (match, varPath) => {
            const value = this.getNestedProperty(data, varPath);
            return value !== undefined && value !== null ? value : '';
        });
    }

    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // Template Management
    getTemplate(templateName) {
        // Check cache first
        if (this.options.cacheTemplates && this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }

        // Check built-in templates
        if (this.templates.has(templateName)) {
            const template = this.templates.get(templateName);
            if (this.options.cacheTemplates) {
                this.templateCache.set(templateName, template);
            }
            return template;
        }

        // Check custom templates
        if (this.customTemplates.has(templateName)) {
            const template = this.customTemplates.get(templateName);
            if (this.options.cacheTemplates) {
                this.templateCache.set(templateName, template);
            }
            return template;
        }

        return null;
    }

    registerTemplate(name, templateDefinition) {
        if (this.options.validateTemplates) {
            this.validateTemplate(templateDefinition);
        }

        this.customTemplates.set(name, {
            name: templateDefinition.name || name,
            description: templateDefinition.description || '',
            category: templateDefinition.category || 'custom',
            template: templateDefinition.template,
            partials: templateDefinition.partials || {},
            variables: templateDefinition.variables || [],
            isCustom: true
        });

        // Clear cache for this template
        this.templateCache.delete(name);

        return true;
    }

    validateTemplate(templateDefinition) {
        if (!templateDefinition.template || typeof templateDefinition.template !== 'string') {
            throw new Error('Template must have a template string');
        }

        if (!Array.isArray(templateDefinition.variables)) {
            throw new Error('Template variables must be an array');
        }

        // Basic syntax validation
        const template = templateDefinition.template;
        const openBraces = (template.match(/{{/g) || []).length;
        const closeBraces = (template.match(/}}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            throw new Error('Template has mismatched braces');
        }
    }

    // Template Discovery
    getAvailableTemplates() {
        const templates = [];

        // Built-in templates
        this.templates.forEach((template, name) => {
            templates.push({
                name,
                ...template,
                isBuiltIn: true,
                isCustom: false
            });
        });

        // Custom templates
        this.customTemplates.forEach((template, name) => {
            templates.push({
                name,
                ...template,
                isBuiltIn: false,
                isCustom: true
            });
        });

        return templates;
    }

    getTemplatesByCategory(category) {
        return this.getAvailableTemplates().filter(template => 
            template.category === category
        );
    }

    // Template Utilities
    previewTemplate(templateName, sampleData = null) {
        const template = this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }

        const data = sampleData || this.generateSampleData(template);
        return this.renderItem(data, templateName);
    }

    generateSampleData(template) {
        const sampleData = {
            id: 'sample-item',
            title: 'Sample Checklist Item',
            description: 'This is a sample description for the checklist item.',
            priority: 'high',
            riskLevel: 'medium',
            completed: false,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            sources: [
                {
                    title: 'Sample Regulation',
                    url: 'https://example.com/regulation',
                    type: 'legal'
                }
            ],
            dependencies: ['dependency-1', 'dependency-2'],
            notes: ['Sample compliance note'],
            history: [
                {
                    action: 'created',
                    timestamp: new Date().toISOString(),
                    description: 'Item created'
                }
            ]
        };

        return sampleData;
    }

    // Custom Template Variables
    addTemplateVariable(name, processor) {
        if (typeof processor !== 'function') {
            throw new Error('Template variable processor must be a function');
        }

        this.templateVariables.set(name, processor);
    }

    removeTemplateVariable(name) {
        return this.templateVariables.delete(name);
    }

    // Persistence
    loadCustomTemplates() {
        const stored = localStorage.getItem('checklist-custom-templates');
        if (stored) {
            try {
                const templates = JSON.parse(stored);
                Object.entries(templates).forEach(([name, template]) => {
                    this.customTemplates.set(name, template);
                });
            } catch (e) {
                console.warn('Failed to load custom templates:', e);
            }
        }
    }

    saveCustomTemplates() {
        const templates = {};
        this.customTemplates.forEach((template, name) => {
            templates[name] = template;
        });

        localStorage.setItem('checklist-custom-templates', JSON.stringify(templates));
    }

    // Public API
    render(itemData, templateName = null) {
        return this.renderItem(itemData, templateName);
    }

    getTemplates() {
        return this.getAvailableTemplates();
    }

    addTemplate(name, definition) {
        const result = this.registerTemplate(name, definition);
        if (result) {
            this.saveCustomTemplates();
        }
        return result;
    }

    removeTemplate(name) {
        const removed = this.customTemplates.delete(name);
        if (removed) {
            this.templateCache.delete(name);
            this.saveCustomTemplates();
        }
        return removed;
    }

    clearCache() {
        this.templateCache.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemTemplateManager;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ItemTemplateManager = ItemTemplateManager;
}