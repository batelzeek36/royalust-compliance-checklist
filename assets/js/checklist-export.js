/**
 * Checklist Export Module
 * Handles exporting individual checklists and compliance reports
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ChecklistExporter {
    constructor(options = {}) {
        this.options = {
            defaultFormat: 'pdf',
            includeMetadata: true,
            includeTimestamps: true,
            includeSourceLinks: true,
            compressImages: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            ...options
        };
        
        this.exportFormats = new Map();
        this.exportTemplates = new Map();
        this.exportHistory = [];
        this.currentExport = null;
        
        this.init();
    }

    init() {
        this.registerExportFormats();
        this.registerExportTemplates();
        this.loadExportHistory();
    }

    // Export Format Registration
    registerExportFormats() {
        // PDF Export
        this.exportFormats.set('pdf', {
            name: 'PDF Document',
            extension: 'pdf',
            mimeType: 'application/pdf',
            description: 'Portable Document Format for professional reports',
            supportsImages: true,
            supportsFormatting: true,
            exporter: this.exportToPDF.bind(this)
        });

        // JSON Export
        this.exportFormats.set('json', {
            name: 'JSON Data',
            extension: 'json',
            mimeType: 'application/json',
            description: 'Machine-readable data format',
            supportsImages: false,
            supportsFormatting: false,
            exporter: this.exportToJSON.bind(this)
        });

        // CSV Export
        this.exportFormats.set('csv', {
            name: 'CSV Spreadsheet',
            extension: 'csv',
            mimeType: 'text/csv',
            description: 'Comma-separated values for spreadsheet applications',
            supportsImages: false,
            supportsFormatting: false,
            exporter: this.exportToCSV.bind(this)
        });

        // HTML Export
        this.exportFormats.set('html', {
            name: 'HTML Report',
            extension: 'html',
            mimeType: 'text/html',
            description: 'Web page format with interactive elements',
            supportsImages: true,
            supportsFormatting: true,
            exporter: this.exportToHTML.bind(this)
        });

        // Excel Export
        this.exportFormats.set('xlsx', {
            name: 'Excel Workbook',
            extension: 'xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            description: 'Microsoft Excel format with multiple sheets',
            supportsImages: false,
            supportsFormatting: true,
            exporter: this.exportToExcel.bind(this)
        });

        // Markdown Export
        this.exportFormats.set('md', {
            name: 'Markdown Document',
            extension: 'md',
            mimeType: 'text/markdown',
            description: 'Lightweight markup format',
            supportsImages: true,
            supportsFormatting: true,
            exporter: this.exportToMarkdown.bind(this)
        });
    }

    // Export Templates
    registerExportTemplates() {
        // Compliance Report Template
        this.exportTemplates.set('compliance-report', {
            name: 'Compliance Report',
            description: 'Comprehensive compliance status report',
            sections: [
                'executive-summary',
                'overall-progress',
                'category-breakdown',
                'detailed-items',
                'risk-assessment',
                'source-references',
                'recommendations'
            ],
            includeCharts: true,
            includeTimeline: true
        });

        // Category Summary Template
        this.exportTemplates.set('category-summary', {
            name: 'Category Summary',
            description: 'Summary report for a specific category',
            sections: [
                'category-overview',
                'progress-summary',
                'item-list',
                'source-links'
            ],
            includeCharts: false,
            includeTimeline: false
        });

        // Action Items Template
        this.exportTemplates.set('action-items', {
            name: 'Action Items',
            description: 'List of incomplete items requiring attention',
            sections: [
                'pending-items',
                'overdue-items',
                'high-priority-items',
                'upcoming-deadlines'
            ],
            includeCharts: false,
            includeTimeline: true
        });

        // Audit Trail Template
        this.exportTemplates.set('audit-trail', {
            name: 'Audit Trail',
            description: 'Complete history of changes and completions',
            sections: [
                'change-history',
                'completion-timeline',
                'user-activity',
                'data-integrity'
            ],
            includeCharts: true,
            includeTimeline: true
        });
    }

    // Main Export Method
    async exportChecklist(data, options = {}) {
        const exportOptions = {
            format: this.options.defaultFormat,
            template: 'compliance-report',
            filename: null,
            includeMetadata: this.options.includeMetadata,
            includeTimestamps: this.options.includeTimestamps,
            includeSourceLinks: this.options.includeSourceLinks,
            ...options
        };

        try {
            // Validate export data
            this.validateExportData(data);

            // Prepare export data
            const processedData = await this.prepareExportData(data, exportOptions);

            // Get exporter function
            const format = this.exportFormats.get(exportOptions.format);
            if (!format) {
                throw new Error(`Unsupported export format: ${exportOptions.format}`);
            }

            // Start export process
            this.currentExport = {
                id: this.generateExportId(),
                format: exportOptions.format,
                template: exportOptions.template,
                startTime: new Date(),
                status: 'processing'
            };

            // Perform export
            const result = await format.exporter(processedData, exportOptions);

            // Finalize export
            this.currentExport.status = 'completed';
            this.currentExport.endTime = new Date();
            this.currentExport.fileSize = result.size;
            this.currentExport.filename = result.filename;

            // Add to history
            this.addToExportHistory(this.currentExport);

            return {
                success: true,
                data: result.data,
                filename: result.filename,
                mimeType: format.mimeType,
                size: result.size,
                exportId: this.currentExport.id
            };

        } catch (error) {
            if (this.currentExport) {
                this.currentExport.status = 'failed';
                this.currentExport.error = error.message;
                this.addToExportHistory(this.currentExport);
            }

            throw new Error(`Export failed: ${error.message}`);
        } finally {
            this.currentExport = null;
        }
    }

    // Data Preparation
    async prepareExportData(rawData, options) {
        const data = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportFormat: options.format,
                exportTemplate: options.template,
                generatedBy: 'Royalust Compliance Dashboard',
                version: '1.0'
            },
            summary: this.generateSummary(rawData),
            categories: this.processCategories(rawData.categories || []),
            items: this.processItems(rawData.items || []),
            progress: this.calculateProgress(rawData),
            riskAssessment: this.assessRisks(rawData),
            timeline: this.generateTimeline(rawData),
            sources: this.compileSources(rawData)
        };

        // Apply template-specific processing
        const template = this.exportTemplates.get(options.template);
        if (template) {
            data.template = template;
            data.sections = await this.generateSections(data, template.sections);
        }

        return data;
    }

    generateSummary(data) {
        const totalItems = data.items ? data.items.length : 0;
        const completedItems = data.items ? data.items.filter(item => item.completed).length : 0;
        const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        return {
            totalItems,
            completedItems,
            pendingItems: totalItems - completedItems,
            overallProgress: Math.round(overallProgress * 100) / 100,
            lastUpdated: new Date().toISOString(),
            categories: data.categories ? data.categories.length : 0,
            highPriorityItems: data.items ? data.items.filter(item => item.priority === 'high' || item.priority === 'critical').length : 0,
            overdueItems: this.countOverdueItems(data.items || [])
        };
    }

    processCategories(categories) {
        return categories.map(category => ({
            ...category,
            progress: this.calculateCategoryProgress(category),
            riskLevel: this.assessCategoryRisk(category),
            itemCount: category.items ? category.items.length : 0,
            completedCount: category.items ? category.items.filter(item => item.completed).length : 0
        }));
    }

    processItems(items) {
        return items.map(item => ({
            ...item,
            formattedDeadline: item.deadline ? this.formatDate(item.deadline) : null,
            isOverdue: item.deadline ? new Date(item.deadline) < new Date() : false,
            daysSinceModified: item.lastModified ? this.daysSince(item.lastModified) : null,
            sourceCount: item.sources ? item.sources.length : 0,
            dependencyCount: item.dependencies ? item.dependencies.length : 0
        }));
    }

    // Format-Specific Exporters
    async exportToPDF(data, options) {
        // This would integrate with a PDF library like jsPDF or PDFKit
        // For now, we'll create a basic HTML-to-PDF conversion
        
        const htmlContent = await this.generateHTMLReport(data, options);
        
        // In a real implementation, you would use a library like:
        // - jsPDF for client-side PDF generation
        // - Puppeteer for server-side HTML-to-PDF conversion
        // - PDFKit for programmatic PDF creation
        
        const filename = this.generateFilename(data, 'pdf', options);
        
        // Placeholder for actual PDF generation
        const pdfBlob = new Blob([htmlContent], { type: 'application/pdf' });
        
        return {
            data: pdfBlob,
            filename,
            size: pdfBlob.size
        };
    }

    async exportToJSON(data, options) {
        const jsonData = {
            ...data,
            exportOptions: options
        };

        // Remove circular references and clean data
        const cleanData = JSON.parse(JSON.stringify(jsonData));
        const jsonString = JSON.stringify(cleanData, null, 2);
        
        const filename = this.generateFilename(data, 'json', options);
        const blob = new Blob([jsonString], { type: 'application/json' });

        return {
            data: blob,
            filename,
            size: blob.size
        };
    }

    async exportToCSV(data, options) {
        const csvRows = [];
        
        // Header row
        const headers = [
            'Category',
            'Item ID',
            'Title',
            'Description',
            'Priority',
            'Risk Level',
            'Completed',
            'Deadline',
            'Last Modified',
            'Source Count'
        ];
        csvRows.push(headers.join(','));

        // Data rows
        data.items.forEach(item => {
            const row = [
                this.escapeCsvValue(item.categoryId || ''),
                this.escapeCsvValue(item.id || ''),
                this.escapeCsvValue(item.title || ''),
                this.escapeCsvValue(item.description || ''),
                this.escapeCsvValue(item.priority || ''),
                this.escapeCsvValue(item.riskLevel || ''),
                item.completed ? 'Yes' : 'No',
                this.escapeCsvValue(item.formattedDeadline || ''),
                this.escapeCsvValue(item.lastModified || ''),
                item.sourceCount || 0
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const filename = this.generateFilename(data, 'csv', options);
        const blob = new Blob([csvContent], { type: 'text/csv' });

        return {
            data: blob,
            filename,
            size: blob.size
        };
    }

    async exportToHTML(data, options) {
        const htmlContent = await this.generateHTMLReport(data, options);
        const filename = this.generateFilename(data, 'html', options);
        const blob = new Blob([htmlContent], { type: 'text/html' });

        return {
            data: blob,
            filename,
            size: blob.size
        };
    }

    async exportToExcel(data, options) {
        // This would integrate with a library like SheetJS or ExcelJS
        // For now, we'll create a basic CSV-like structure
        
        const workbookData = {
            sheets: {
                'Summary': this.generateSummarySheet(data),
                'Items': this.generateItemsSheet(data),
                'Categories': this.generateCategoriesSheet(data)
            }
        };

        // Placeholder for actual Excel generation
        const filename = this.generateFilename(data, 'xlsx', options);
        const blob = new Blob([JSON.stringify(workbookData)], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });

        return {
            data: blob,
            filename,
            size: blob.size
        };
    }

    async exportToMarkdown(data, options) {
        const markdown = this.generateMarkdownReport(data, options);
        const filename = this.generateFilename(data, 'md', options);
        const blob = new Blob([markdown], { type: 'text/markdown' });

        return {
            data: blob,
            filename,
            size: blob.size
        };
    }

    // Report Generation
    async generateHTMLReport(data, options) {
        const template = data.template || this.exportTemplates.get('compliance-report');
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royalust Compliance Report</title>
    <style>
        ${this.getReportCSS()}
    </style>
</head>
<body>
    <div class="report-container">
        ${this.generateReportHeader(data)}
        ${this.generateExecutiveSummary(data)}
        ${this.generateProgressSection(data)}
        ${this.generateCategoriesSection(data)}
        ${this.generateItemsSection(data)}
        ${this.generateRiskAssessment(data)}
        ${this.generateSourcesSection(data)}
        ${this.generateReportFooter(data)}
    </div>
</body>
</html>
        `;
    }

    generateMarkdownReport(data, options) {
        const sections = [];
        
        sections.push('# Royalust Compliance Report');
        sections.push('');
        sections.push(`Generated on: ${this.formatDate(new Date())}`);
        sections.push('');
        
        // Executive Summary
        sections.push('## Executive Summary');
        sections.push('');
        sections.push(`- **Total Items**: ${data.summary.totalItems}`);
        sections.push(`- **Completed**: ${data.summary.completedItems} (${data.summary.overallProgress}%)`);
        sections.push(`- **Pending**: ${data.summary.pendingItems}`);
        sections.push(`- **High Priority**: ${data.summary.highPriorityItems}`);
        sections.push(`- **Overdue**: ${data.summary.overdueItems}`);
        sections.push('');

        // Categories
        sections.push('## Categories');
        sections.push('');
        data.categories.forEach(category => {
            sections.push(`### ${category.title}`);
            sections.push('');
            sections.push(`- **Progress**: ${category.progress}%`);
            sections.push(`- **Items**: ${category.itemCount}`);
            sections.push(`- **Risk Level**: ${category.riskLevel}`);
            sections.push('');
        });

        // Items
        sections.push('## Checklist Items');
        sections.push('');
        data.items.forEach(item => {
            const status = item.completed ? '✅' : '⏳';
            const priority = item.priority ? ` (${item.priority})` : '';
            sections.push(`${status} **${item.title}**${priority}`);
            if (item.description) {
                sections.push(`   ${item.description}`);
            }
            sections.push('');
        });

        return sections.join('\n');
    }

    // Report Sections
    generateReportHeader(data) {
        return `
            <header class="report-header">
                <div class="header-content">
                    <h1 class="report-title">Royalust Compliance Report</h1>
                    <div class="header-meta">
                        <p class="report-date">Generated: ${this.formatDate(new Date())}</p>
                        <p class="report-version">Version: ${data.metadata.version}</p>
                    </div>
                </div>
            </header>
        `;
    }

    generateExecutiveSummary(data) {
        return `
            <section class="executive-summary">
                <h2>Executive Summary</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Overall Progress</h3>
                        <div class="progress-circle">
                            <span class="progress-value">${data.summary.overallProgress}%</span>
                        </div>
                    </div>
                    <div class="summary-card">
                        <h3>Total Items</h3>
                        <span class="metric-value">${data.summary.totalItems}</span>
                    </div>
                    <div class="summary-card">
                        <h3>Completed</h3>
                        <span class="metric-value">${data.summary.completedItems}</span>
                    </div>
                    <div class="summary-card">
                        <h3>Pending</h3>
                        <span class="metric-value">${data.summary.pendingItems}</span>
                    </div>
                </div>
            </section>
        `;
    }

    generateProgressSection(data) {
        const categoryProgress = data.categories.map(cat => `
            <div class="category-progress">
                <span class="category-name">${cat.title}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${cat.progress}%"></div>
                </div>
                <span class="progress-text">${cat.progress}%</span>
            </div>
        `).join('');

        return `
            <section class="progress-section">
                <h2>Progress by Category</h2>
                <div class="progress-list">
                    ${categoryProgress}
                </div>
            </section>
        `;
    }

    // Utility Methods
    validateExportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Export data must be a valid object');
        }

        if (!data.items && !data.categories) {
            throw new Error('Export data must contain items or categories');
        }
    }

    generateFilename(data, extension, options) {
        if (options.filename) {
            return options.filename.endsWith(`.${extension}`) ? 
                options.filename : `${options.filename}.${extension}`;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const template = options.template || 'report';
        
        return `royalust-compliance-${template}-${timestamp}.${extension}`;
    }

    generateExportId() {
        return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    escapeCsvValue(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    daysSince(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    countOverdueItems(items) {
        const now = new Date();
        return items.filter(item => 
            item.deadline && new Date(item.deadline) < now && !item.completed
        ).length;
    }

    calculateCategoryProgress(category) {
        if (!category.items || category.items.length === 0) return 0;
        const completed = category.items.filter(item => item.completed).length;
        return Math.round((completed / category.items.length) * 100);
    }

    assessCategoryRisk(category) {
        // Simple risk assessment based on completion and priority
        const progress = this.calculateCategoryProgress(category);
        const highPriorityItems = category.items ? 
            category.items.filter(item => item.priority === 'high' || item.priority === 'critical').length : 0;
        
        if (progress < 50 && highPriorityItems > 0) return 'high';
        if (progress < 75) return 'medium';
        return 'low';
    }

    calculateProgress(data) {
        // Implementation for overall progress calculation
        return data.summary || {};
    }

    assessRisks(data) {
        // Implementation for risk assessment
        return {
            overallRisk: 'medium',
            riskFactors: []
        };
    }

    generateTimeline(data) {
        // Implementation for timeline generation
        return [];
    }

    compileSources(data) {
        // Implementation for source compilation
        const sources = new Set();
        
        if (data.items) {
            data.items.forEach(item => {
                if (item.sources) {
                    item.sources.forEach(source => sources.add(source));
                }
            });
        }
        
        return Array.from(sources);
    }

    generateSections(data, sectionNames) {
        // Implementation for section generation
        return {};
    }

    getReportCSS() {
        return `
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .report-container { max-width: 1200px; margin: 0 auto; }
            .report-header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .report-title { color: #333; margin: 0; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .summary-card { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
            .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
            .progress-fill { background: #4caf50; height: 100%; transition: width 0.3s ease; }
        `;
    }

    // Export History Management
    addToExportHistory(exportRecord) {
        this.exportHistory.unshift(exportRecord);
        
        // Keep only last 50 exports
        if (this.exportHistory.length > 50) {
            this.exportHistory = this.exportHistory.slice(0, 50);
        }
        
        this.saveExportHistory();
    }

    getExportHistory() {
        return [...this.exportHistory];
    }

    saveExportHistory() {
        localStorage.setItem('checklist-export-history', JSON.stringify(this.exportHistory));
    }

    loadExportHistory() {
        const stored = localStorage.getItem('checklist-export-history');
        if (stored) {
            try {
                this.exportHistory = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to load export history:', e);
                this.exportHistory = [];
            }
        }
    }

    // Public API
    export(data, options = {}) {
        return this.exportChecklist(data, options);
    }

    getFormats() {
        return Array.from(this.exportFormats.entries()).map(([key, format]) => ({
            key,
            ...format
        }));
    }

    getTemplates() {
        return Array.from(this.exportTemplates.entries()).map(([key, template]) => ({
            key,
            ...template
        }));
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChecklistExporter;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ChecklistExporter = ChecklistExporter;
}