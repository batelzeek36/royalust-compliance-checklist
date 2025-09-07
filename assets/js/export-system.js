/**
 * ExportSystem - Comprehensive export functionality for compliance reports
 * Handles PDF generation, JSON exports, and formatted report creation
 */

class ExportSystem {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.exportFormats = new Map();
        this.templates = new Map();
        this.exportHistory = [];
        this.maxHistorySize = 50;
        
        this.initializeFormats();
        this.initializeTemplates();
    }

    /**
     * Initialize supported export formats
     */
    initializeFormats() {
        this.exportFormats.set('json', {
            name: 'JSON Data Export',
            extension: 'json',
            mimeType: 'application/json',
            handler: this.exportJSON.bind(this)
        });
        
        this.exportFormats.set('pdf', {
            name: 'PDF Report',
            extension: 'pdf',
            mimeType: 'application/pdf',
            handler: this.exportPDF.bind(this)
        });
        
        this.exportFormats.set('csv', {
            name: 'CSV Spreadsheet',
            extension: 'csv',
            mimeType: 'text/csv',
            handler: this.exportCSV.bind(this)
        });
        
        this.exportFormats.set('html', {
            name: 'HTML Report',
            extension: 'html',
            mimeType: 'text/html',
            handler: this.exportHTML.bind(this)
        });
    }

    /**
     * Initialize report templates
     */
    initializeTemplates() {
        this.templates.set('summary', {
            name: 'Executive Summary',
            description: 'High-level compliance overview',
            sections: ['overview', 'progress', 'risks', 'recommendations']
        });
        
        this.templates.set('detailed', {
            name: 'Detailed Report',
            description: 'Complete compliance breakdown',
            sections: ['overview', 'categories', 'items', 'sources', 'timeline']
        });
        
        this.templates.set('investor', {
            name: 'Investor Report',
            description: 'Investor-focused compliance status',
            sections: ['overview', 'progress', 'risks', 'assurance']
        });
        
        this.templates.set('audit', {
            name: 'Audit Trail',
            description: 'Complete audit documentation',
            sections: ['overview', 'categories', 'items', 'sources', 'changes', 'verification']
        });
    }

    /**
     * Export data in specified format
     * @param {string} format - Export format (json, pdf, csv, html)
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Exported data blob
     */
    async exportData(format, options = {}) {
        try {
            const formatConfig = this.exportFormats.get(format);
            if (!formatConfig) {
                throw new Error(`Unsupported export format: ${format}`);
            }
            
            const exportData = await this.prepareExportData(options);
            const result = await formatConfig.handler(exportData, options);
            
            // Track export in history
            this.addToHistory({
                format,
                timestamp: new Date().toISOString(),
                options,
                success: true
            });
            
            return result;
        } catch (error) {
            console.error(`Export failed for format ${format}:`, error);
            
            this.addToHistory({
                format,
                timestamp: new Date().toISOString(),
                options,
                success: false,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Prepare data for export
     * @param {Object} options - Export options
     * @returns {Object} Prepared export data
     */
    async prepareExportData(options = {}) {
        const {
            includeProgress = true,
            includeCategories = true,
            includeItems = true,
            includeSources = true,
            includeMetadata = true,
            categoryFilter = null,
            statusFilter = null
        } = options;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            version: this.dataManager.dataVersion
        };
        
        if (includeProgress) {
            exportData.progress = this.dataManager.calculateProgress();
            exportData.categoryProgress = this.dataManager.getCategoryProgress();
        }
        
        if (includeCategories && this.dataManager.complianceData) {
            exportData.categories = this.dataManager.complianceData.categories
                .filter(category => !categoryFilter || categoryFilter.includes(category.id))
                .map(category => ({
                    ...category,
                    items: includeItems ? category.items
                        .filter(item => !statusFilter || this.dataManager.getItemStatus(item.id) === statusFilter)
                        .map(item => ({
                            ...item,
                            completed: this.dataManager.getItemStatus(item.id),
                            sources: includeSources ? item.sources : undefined
                        })) : undefined
                }));
        }
        
        if (includeMetadata && this.dataManager.complianceData) {
            exportData.metadata = {
                ...this.dataManager.complianceData.metadata,
                exportTimestamp: new Date().toISOString(),
                lastSync: this.dataManager.lastSyncTime
            };
        }
        
        return exportData;
    }

    /**
     * Export as JSON
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Blob} JSON blob
     */
    async exportJSON(data, options = {}) {
        const { pretty = true } = options;
        const jsonString = pretty 
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data);
        
        return new Blob([jsonString], { type: 'application/json' });
    }

    /**
     * Export as CSV
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Blob} CSV blob
     */
    async exportCSV(data, options = {}) {
        const { includeHeaders = true } = options;
        const csvRows = [];
        
        // Headers
        if (includeHeaders) {
            csvRows.push([
                'Category',
                'Item ID',
                'Item Title',
                'Description',
                'Completed',
                'Priority',
                'Risk Level',
                'Sources'
            ]);
        }
        
        // Data rows
        if (data.categories) {
            data.categories.forEach(category => {
                if (category.items) {
                    category.items.forEach(item => {
                        const sources = item.sources 
                            ? item.sources.map(s => s.title).join('; ')
                            : '';
                        
                        csvRows.push([
                            this.escapeCsvValue(category.title),
                            this.escapeCsvValue(item.id),
                            this.escapeCsvValue(item.title),
                            this.escapeCsvValue(item.description || ''),
                            item.completed ? 'Yes' : 'No',
                            this.escapeCsvValue(category.priority || ''),
                            this.escapeCsvValue(category.riskLevel || ''),
                            this.escapeCsvValue(sources)
                        ]);
                    });
                }
            });
        }
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        return new Blob([csvContent], { type: 'text/csv' });
    }

    /**
     * Export as HTML report
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Blob} HTML blob
     */
    async exportHTML(data, options = {}) {
        const { template = 'detailed', includeStyles = true } = options;
        const templateConfig = this.templates.get(template);
        
        if (!templateConfig) {
            throw new Error(`Unknown template: ${template}`);
        }
        
        const html = this.generateHTMLReport(data, templateConfig, includeStyles);
        return new Blob([html], { type: 'text/html' });
    }

    /**
     * Export as PDF (using HTML to PDF conversion)
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Blob} PDF blob
     */
    async exportPDF(data, options = {}) {
        // For browser environments, we'll generate HTML and let the user print to PDF
        // In a Node.js environment, you could use libraries like puppeteer or jsPDF
        
        const htmlBlob = await this.exportHTML(data, { ...options, includeStyles: true });
        const htmlText = await htmlBlob.text();
        
        // Create a printable HTML version
        const printableHTML = this.createPrintableHTML(htmlText);
        
        // For now, return HTML blob with PDF-optimized styles
        // In production, integrate with a PDF generation library
        return new Blob([printableHTML], { type: 'text/html' });
    }

    /**
     * Generate HTML report
     * @param {Object} data - Report data
     * @param {Object} template - Template configuration
     * @param {boolean} includeStyles - Include CSS styles
     * @returns {string} HTML content
     */
    generateHTMLReport(data, template, includeStyles = true) {
        const styles = includeStyles ? this.getReportStyles() : '';
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royalust Compliance Report - ${template.name}</title>
    ${styles}
</head>
<body>
    <div class="report-container">
        ${this.generateReportHeader(data)}
        ${this.generateReportContent(data, template)}
        ${this.generateReportFooter(data)}
    </div>
</body>
</html>`;
        
        return html;
    }

    /**
     * Generate report header
     * @param {Object} data - Report data
     * @returns {string} Header HTML
     */
    generateReportHeader(data) {
        return `
        <header class="report-header">
            <div class="brand-section">
                <h1 class="royalust-title">ROYALUST</h1>
                <p class="tagline">Big Island Retreat Compliance Dashboard</p>
            </div>
            <div class="report-meta">
                <p><strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                <p><strong>Overall Progress:</strong> ${data.progress?.overall || 0}%</p>
                <p><strong>Version:</strong> ${data.version}</p>
            </div>
        </header>`;
    }

    /**
     * Generate report content based on template
     * @param {Object} data - Report data
     * @param {Object} template - Template configuration
     * @returns {string} Content HTML
     */
    generateReportContent(data, template) {
        let content = '<main class="report-content">';
        
        template.sections.forEach(section => {
            switch (section) {
                case 'overview':
                    content += this.generateOverviewSection(data);
                    break;
                case 'progress':
                    content += this.generateProgressSection(data);
                    break;
                case 'categories':
                    content += this.generateCategoriesSection(data);
                    break;
                case 'items':
                    content += this.generateItemsSection(data);
                    break;
                case 'sources':
                    content += this.generateSourcesSection(data);
                    break;
                case 'risks':
                    content += this.generateRisksSection(data);
                    break;
                case 'recommendations':
                    content += this.generateRecommendationsSection(data);
                    break;
                case 'assurance':
                    content += this.generateAssuranceSection(data);
                    break;
            }
        });
        
        content += '</main>';
        return content;
    }

    /**
     * Generate overview section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateOverviewSection(data) {
        const progress = data.progress || {};
        return `
        <section class="report-section overview">
            <h2>Executive Overview</h2>
            <div class="overview-grid">
                <div class="stat-card">
                    <h3>Overall Compliance</h3>
                    <div class="stat-value">${progress.overall || 0}%</div>
                </div>
                <div class="stat-card">
                    <h3>Completed Items</h3>
                    <div class="stat-value">${progress.completed || 0}/${progress.total || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Categories</h3>
                    <div class="stat-value">${data.categories?.length || 0}</div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate progress section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateProgressSection(data) {
        let html = `
        <section class="report-section progress">
            <h2>Progress by Category</h2>
            <div class="progress-list">`;
        
        if (data.categoryProgress) {
            Object.entries(data.categoryProgress).forEach(([categoryId, progress]) => {
                html += `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="category-title">${progress.title}</span>
                        <span class="progress-percentage">${progress.overall}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress.overall}%"></div>
                    </div>
                    <div class="progress-details">
                        <span>Completed: ${progress.completed}/${progress.total}</span>
                        <span class="risk-level risk-${progress.riskLevel}">${progress.riskLevel.toUpperCase()}</span>
                    </div>
                </div>`;
            });
        }
        
        html += `
            </div>
        </section>`;
        
        return html;
    }

    /**
     * Generate categories section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateCategoriesSection(data) {
        let html = `
        <section class="report-section categories">
            <h2>Compliance Categories</h2>`;
        
        if (data.categories) {
            data.categories.forEach(category => {
                const categoryProgress = data.categoryProgress?.[category.id] || {};
                html += `
                <div class="category-section">
                    <h3>${category.title}</h3>
                    <p class="category-description">${category.description || ''}</p>
                    <div class="category-meta">
                        <span class="priority priority-${category.priority}">${category.priority?.toUpperCase() || 'NORMAL'}</span>
                        <span class="risk-level risk-${categoryProgress.riskLevel}">${categoryProgress.riskLevel?.toUpperCase() || 'UNKNOWN'}</span>
                        <span class="progress">${categoryProgress.overall || 0}% Complete</span>
                    </div>
                </div>`;
            });
        }
        
        html += '</section>';
        return html;
    }

    /**
     * Generate items section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateItemsSection(data) {
        let html = `
        <section class="report-section items">
            <h2>Compliance Items</h2>`;
        
        if (data.categories) {
            data.categories.forEach(category => {
                if (category.items && category.items.length > 0) {
                    html += `
                    <div class="category-items">
                        <h3>${category.title}</h3>
                        <div class="items-list">`;
                    
                    category.items.forEach(item => {
                        const statusClass = item.completed ? 'completed' : 'pending';
                        const statusText = item.completed ? '✓ Completed' : '○ Pending';
                        
                        html += `
                        <div class="item ${statusClass}">
                            <div class="item-header">
                                <span class="item-status">${statusText}</span>
                                <span class="item-title">${item.title}</span>
                            </div>
                            <p class="item-description">${item.description || ''}</p>
                        </div>`;
                    });
                    
                    html += `
                        </div>
                    </div>`;
                }
            });
        }
        
        html += '</section>';
        return html;
    }

    /**
     * Generate sources section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateSourcesSection(data) {
        const sources = new Set();
        
        if (data.categories) {
            data.categories.forEach(category => {
                if (category.items) {
                    category.items.forEach(item => {
                        if (item.sources) {
                            item.sources.forEach(source => {
                                sources.add(JSON.stringify(source));
                            });
                        }
                    });
                }
            });
        }
        
        let html = `
        <section class="report-section sources">
            <h2>Reference Sources</h2>
            <div class="sources-list">`;
        
        Array.from(sources).forEach(sourceStr => {
            const source = JSON.parse(sourceStr);
            html += `
            <div class="source-item">
                <a href="${source.url}" target="_blank" class="source-link">
                    ${source.title}
                </a>
            </div>`;
        });
        
        html += `
            </div>
        </section>`;
        
        return html;
    }

    /**
     * Generate risks section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateRisksSection(data) {
        const risks = [];
        
        if (data.categoryProgress) {
            Object.entries(data.categoryProgress).forEach(([categoryId, progress]) => {
                if (progress.riskLevel === 'high' || progress.riskLevel === 'critical') {
                    risks.push({
                        category: progress.title,
                        level: progress.riskLevel,
                        completion: progress.overall
                    });
                }
            });
        }
        
        let html = `
        <section class="report-section risks">
            <h2>Risk Assessment</h2>`;
        
        if (risks.length > 0) {
            html += '<div class="risks-list">';
            risks.forEach(risk => {
                html += `
                <div class="risk-item risk-${risk.level}">
                    <div class="risk-header">
                        <span class="risk-category">${risk.category}</span>
                        <span class="risk-level">${risk.level.toUpperCase()}</span>
                    </div>
                    <div class="risk-details">
                        <span>Completion: ${risk.completion}%</span>
                    </div>
                </div>`;
            });
            html += '</div>';
        } else {
            html += '<p class="no-risks">No high-risk categories identified.</p>';
        }
        
        html += '</section>';
        return html;
    }

    /**
     * Generate recommendations section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateRecommendationsSection(data) {
        return `
        <section class="report-section recommendations">
            <h2>Recommendations</h2>
            <div class="recommendations-list">
                <div class="recommendation">
                    <h4>Priority Focus Areas</h4>
                    <p>Focus on completing high-priority categories with low completion rates to reduce overall risk.</p>
                </div>
                <div class="recommendation">
                    <h4>Documentation Review</h4>
                    <p>Ensure all source documentation is current and accessible for regulatory review.</p>
                </div>
                <div class="recommendation">
                    <h4>Regular Updates</h4>
                    <p>Maintain regular updates to compliance status to ensure investor confidence.</p>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate assurance section
     * @param {Object} data - Report data
     * @returns {string} Section HTML
     */
    generateAssuranceSection(data) {
        return `
        <section class="report-section assurance">
            <h2>Investor Assurance</h2>
            <div class="assurance-content">
                <p>Royalust is committed to maintaining full regulatory compliance while permit applications are pending. This report demonstrates our proactive approach to safety, legal compliance, and stakeholder transparency.</p>
                <div class="assurance-metrics">
                    <div class="metric">
                        <strong>Overall Compliance:</strong> ${data.progress?.overall || 0}%
                    </div>
                    <div class="metric">
                        <strong>Last Updated:</strong> ${new Date(data.timestamp).toLocaleDateString()}
                    </div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate report footer
     * @param {Object} data - Report data
     * @returns {string} Footer HTML
     */
    generateReportFooter(data) {
        return `
        <footer class="report-footer">
            <p>Generated by Royalust Compliance Dashboard on ${new Date(data.timestamp).toLocaleString()}</p>
            <p>This report reflects the current compliance status and is updated regularly.</p>
        </footer>`;
    }

    /**
     * Get report CSS styles
     * @returns {string} CSS styles
     */
    getReportStyles() {
        return `
        <style>
            body {
                font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
            }
            
            .report-container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .report-header {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: #f7e7ce;
                padding: 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .royalust-title {
                font-family: 'Cinzel', serif;
                font-size: 2.5rem;
                font-weight: 600;
                letter-spacing: 0.15em;
                color: #d4af37;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            .tagline {
                font-family: 'Cormorant Garamond', serif;
                font-style: italic;
                margin: 0.5rem 0 0 0;
                opacity: 0.9;
            }
            
            .report-meta {
                text-align: right;
            }
            
            .report-content {
                padding: 2rem;
            }
            
            .report-section {
                margin-bottom: 3rem;
            }
            
            .report-section h2 {
                color: #1a1a2e;
                border-bottom: 2px solid #d4af37;
                padding-bottom: 0.5rem;
                margin-bottom: 1.5rem;
            }
            
            .overview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .stat-card {
                background: #f8f9fa;
                padding: 1.5rem;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #e9ecef;
            }
            
            .stat-value {
                font-size: 2rem;
                font-weight: bold;
                color: #d4af37;
                margin-top: 0.5rem;
            }
            
            .progress-item {
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .progress-bar {
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #d4af37, #cd7f32);
                transition: width 0.3s ease;
            }
            
            .progress-details {
                display: flex;
                justify-content: space-between;
                font-size: 0.9rem;
                color: #666;
            }
            
            .risk-level {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: bold;
            }
            
            .risk-low { background: #d4edda; color: #155724; }
            .risk-medium { background: #fff3cd; color: #856404; }
            .risk-high { background: #f8d7da; color: #721c24; }
            .risk-critical { background: #f5c6cb; color: #721c24; }
            
            .priority {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: bold;
            }
            
            .priority-high { background: #f8d7da; color: #721c24; }
            .priority-medium { background: #fff3cd; color: #856404; }
            .priority-low { background: #d4edda; color: #155724; }
            
            .item {
                padding: 1rem;
                margin-bottom: 0.5rem;
                border-radius: 6px;
                border-left: 4px solid #e9ecef;
            }
            
            .item.completed {
                background: #d4edda;
                border-left-color: #28a745;
            }
            
            .item.pending {
                background: #fff3cd;
                border-left-color: #ffc107;
            }
            
            .item-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 0.5rem;
            }
            
            .item-status {
                font-weight: bold;
                font-size: 0.9rem;
            }
            
            .source-item {
                margin-bottom: 0.5rem;
            }
            
            .source-link {
                color: #d4af37;
                text-decoration: none;
            }
            
            .source-link:hover {
                text-decoration: underline;
            }
            
            .report-footer {
                background: #f8f9fa;
                padding: 1.5rem 2rem;
                text-align: center;
                color: #666;
                font-size: 0.9rem;
                border-top: 1px solid #e9ecef;
            }
            
            @media print {
                body { background: white; }
                .report-container { box-shadow: none; }
                .report-section { page-break-inside: avoid; }
            }
        </style>`;
    }

    /**
     * Create printable HTML version
     * @param {string} html - Original HTML
     * @returns {string} Print-optimized HTML
     */
    createPrintableHTML(html) {
        return html.replace(
            '</head>',
            `<style>
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .report-section { page-break-inside: avoid; }
                    .progress-bar { border: 1px solid #ccc; }
                }
            </style></head>`
        );
    }

    /**
     * Escape CSV values
     * @param {string} value - Value to escape
     * @returns {string} Escaped value
     */
    escapeCsvValue(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
    }

    /**
     * Add export to history
     * @param {Object} exportRecord - Export record
     */
    addToHistory(exportRecord) {
        this.exportHistory.unshift(exportRecord);
        
        if (this.exportHistory.length > this.maxHistorySize) {
            this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Get export history
     * @returns {Array} Export history
     */
    getExportHistory() {
        return [...this.exportHistory];
    }

    /**
     * Download exported data
     * @param {Blob} blob - Data blob
     * @param {string} filename - Download filename
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get available export formats
     * @returns {Array} Available formats
     */
    getAvailableFormats() {
        return Array.from(this.exportFormats.entries()).map(([key, config]) => ({
            key,
            name: config.name,
            extension: config.extension
        }));
    }

    /**
     * Get available templates
     * @returns {Array} Available templates
     */
    getAvailableTemplates() {
        return Array.from(this.templates.entries()).map(([key, config]) => ({
            key,
            name: config.name,
            description: config.description
        }));
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportSystem;
}