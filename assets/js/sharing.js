/**
 * Sharing - Comprehensive sharing functionality for compliance reports
 * Handles shareable links, social sharing, and collaborative features
 */

class Sharing {
    constructor(dataManager, exportSystem) {
        this.dataManager = dataManager;
        this.exportSystem = exportSystem;
        this.shareableLinks = new Map();
        this.shareHistory = [];
        this.maxHistorySize = 100;
        this.baseUrl = window.location.origin;
        this.shareEndpoint = '/api/share'; // For future backend integration
        
        this.initializeSharingPlatforms();
        this.setupEventListeners();
    }

    /**
     * Initialize supported sharing platforms
     */
    initializeSharingPlatforms() {
        this.platforms = new Map();
        
        this.platforms.set('email', {
            name: 'Email',
            icon: '📧',
            handler: this.shareViaEmail.bind(this),
            requiresData: true
        });
        
        this.platforms.set('linkedin', {
            name: 'LinkedIn',
            icon: '💼',
            handler: this.shareViaLinkedIn.bind(this),
            requiresData: false
        });
        
        this.platforms.set('twitter', {
            name: 'Twitter',
            icon: '🐦',
            handler: this.shareViaTwitter.bind(this),
            requiresData: false
        });
        
        this.platforms.set('copy', {
            name: 'Copy Link',
            icon: '🔗',
            handler: this.copyShareableLink.bind(this),
            requiresData: false
        });
        
        this.platforms.set('qr', {
            name: 'QR Code',
            icon: '📱',
            handler: this.generateQRCode.bind(this),
            requiresData: false
        });
        
        this.platforms.set('embed', {
            name: 'Embed Code',
            icon: '🔧',
            handler: this.generateEmbedCode.bind(this),
            requiresData: false
        });
    }

    /**
     * Setup event listeners for sharing functionality
     */
    setupEventListeners() {
        // Listen for data changes to update shareable content
        this.dataManager.addObserver((event, data) => {
            if (event === 'itemStatusChanged' || event === 'progressSaved') {
                this.invalidateShareableLinks();
            }
        });
        
        // Handle browser share API if available
        if (navigator.share) {
            this.platforms.set('native', {
                name: 'Share',
                icon: '📤',
                handler: this.shareViaNativeAPI.bind(this),
                requiresData: false
            });
        }
    }

    /**
     * Create a shareable link for current compliance status
     * @param {Object} options - Sharing options
     * @returns {Promise<string>} Shareable link
     */
    async createShareableLink(options = {}) {
        try {
            const {
                includeProgress = true,
                includeDetails = false,
                expiresIn = 30, // days
                password = null,
                allowComments = false
            } = options;
            
            // Generate unique share ID
            const shareId = this.generateShareId();
            
            // Prepare share data
            const shareData = await this.prepareShareData({
                includeProgress,
                includeDetails
            });
            
            // Create share configuration
            const shareConfig = {
                id: shareId,
                data: shareData,
                options: {
                    includeProgress,
                    includeDetails,
                    expiresIn,
                    password,
                    allowComments
                },
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString(),
                accessCount: 0,
                lastAccessed: null
            };
            
            // Store share configuration
            this.shareableLinks.set(shareId, shareConfig);
            this.saveShareableLinks();
            
            // Generate shareable URL
            const shareUrl = `${this.baseUrl}?share=${shareId}`;
            
            // Add to history
            this.addToHistory({
                type: 'link_created',
                shareId,
                url: shareUrl,
                options,
                timestamp: new Date().toISOString()
            });
            
            return shareUrl;
        } catch (error) {
            console.error('Failed to create shareable link:', error);
            throw error;
        }
    }

    /**
     * Prepare data for sharing
     * @param {Object} options - Data preparation options
     * @returns {Object} Prepared share data
     */
    async prepareShareData(options = {}) {
        const { includeProgress = true, includeDetails = false } = options;
        
        const shareData = {
            timestamp: new Date().toISOString(),
            version: this.dataManager.dataVersion
        };
        
        if (includeProgress) {
            shareData.progress = this.dataManager.calculateProgress();
            shareData.categoryProgress = this.dataManager.getCategoryProgress();
        }
        
        if (includeDetails && this.dataManager.complianceData) {
            shareData.summary = {
                totalCategories: this.dataManager.complianceData.categories.length,
                completedCategories: Object.values(shareData.categoryProgress || {})
                    .filter(cat => cat.overall >= 100).length,
                highRiskCategories: Object.values(shareData.categoryProgress || {})
                    .filter(cat => cat.riskLevel === 'high' || cat.riskLevel === 'critical').length
            };
        }
        
        return shareData;
    }

    /**
     * Share via email
     * @param {Object} options - Email sharing options
     */
    async shareViaEmail(options = {}) {
        try {
            const {
                recipients = [],
                subject = 'Royalust Compliance Dashboard Update',
                includeAttachment = false,
                template = 'summary'
            } = options;
            
            const shareUrl = await this.createShareableLink({
                includeProgress: true,
                includeDetails: true
            });
            
            const progress = this.dataManager.calculateProgress();
            const emailBody = this.generateEmailBody(shareUrl, progress, template);
            
            let mailtoUrl = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
            
            // Handle attachment if requested
            if (includeAttachment) {
                try {
                    const exportBlob = await this.exportSystem.exportData('pdf', {
                        template: 'investor'
                    });
                    
                    // Note: Email attachments via mailto are not supported
                    // In production, integrate with email service API
                    console.log('Attachment prepared but mailto does not support attachments');
                } catch (error) {
                    console.warn('Failed to prepare email attachment:', error);
                }
            }
            
            window.location.href = mailtoUrl;
            
            this.addToHistory({
                type: 'email_share',
                recipients: recipients.length,
                shareUrl,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Email sharing failed:', error);
            throw error;
        }
    }

    /**
     * Share via LinkedIn
     * @param {Object} options - LinkedIn sharing options
     */
    async shareViaLinkedIn(options = {}) {
        try {
            const shareUrl = await this.createShareableLink();
            const progress = this.dataManager.calculateProgress();
            
            const text = `Royalust Big Island Retreat - Compliance Update: ${progress.overall}% complete. Maintaining full regulatory compliance while permits are pending. #Compliance #RealEstate #Hawaii`;
            
            const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Royalust Compliance Dashboard')}&summary=${encodeURIComponent(text)}`;
            
            window.open(linkedinUrl, '_blank', 'width=600,height=400');
            
            this.addToHistory({
                type: 'linkedin_share',
                shareUrl,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('LinkedIn sharing failed:', error);
            throw error;
        }
    }

    /**
     * Share via Twitter
     * @param {Object} options - Twitter sharing options
     */
    async shareViaTwitter(options = {}) {
        try {
            const shareUrl = await this.createShareableLink();
            const progress = this.dataManager.calculateProgress();
            
            const text = `🏝️ Royalust Big Island Retreat Compliance: ${progress.overall}% complete. Transparent regulatory compliance tracking. #Compliance #Hawaii #RealEstate`;
            
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
            
            window.open(twitterUrl, '_blank', 'width=600,height=400');
            
            this.addToHistory({
                type: 'twitter_share',
                shareUrl,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Twitter sharing failed:', error);
            throw error;
        }
    }

    /**
     * Copy shareable link to clipboard
     * @param {Object} options - Copy options
     */
    async copyShareableLink(options = {}) {
        try {
            const shareUrl = await this.createShareableLink(options);
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            this.addToHistory({
                type: 'link_copied',
                shareUrl,
                timestamp: new Date().toISOString()
            });
            
            return shareUrl;
        } catch (error) {
            console.error('Failed to copy link:', error);
            throw error;
        }
    }

    /**
     * Share via native browser API
     * @param {Object} options - Native sharing options
     */
    async shareViaNativeAPI(options = {}) {
        if (!navigator.share) {
            throw new Error('Native sharing not supported');
        }
        
        try {
            const shareUrl = await this.createShareableLink();
            const progress = this.dataManager.calculateProgress();
            
            await navigator.share({
                title: 'Royalust Compliance Dashboard',
                text: `Compliance Status: ${progress.overall}% complete`,
                url: shareUrl
            });
            
            this.addToHistory({
                type: 'native_share',
                shareUrl,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Native sharing failed:', error);
                throw error;
            }
        }
    }

    /**
     * Generate QR code for sharing
     * @param {Object} options - QR code options
     * @returns {Promise<string>} QR code data URL
     */
    async generateQRCode(options = {}) {
        try {
            const shareUrl = await this.createShareableLink();
            
            // Simple QR code generation (in production, use a proper QR library)
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
            
            this.addToHistory({
                type: 'qr_generated',
                shareUrl,
                timestamp: new Date().toISOString()
            });
            
            return qrApiUrl;
        } catch (error) {
            console.error('QR code generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate embed code for sharing
     * @param {Object} options - Embed options
     * @returns {Promise<string>} Embed HTML code
     */
    async generateEmbedCode(options = {}) {
        try {
            const {
                width = 800,
                height = 600,
                showHeader = true,
                showFooter = false
            } = options;
            
            const shareUrl = await this.createShareableLink({
                includeProgress: true,
                includeDetails: false
            });
            
            const embedCode = `<iframe 
    src="${shareUrl}&embed=true&header=${showHeader}&footer=${showFooter}" 
    width="${width}" 
    height="${height}" 
    frameborder="0" 
    style="border: 1px solid #ccc; border-radius: 8px;">
</iframe>`;
            
            this.addToHistory({
                type: 'embed_generated',
                shareUrl,
                options,
                timestamp: new Date().toISOString()
            });
            
            return embedCode;
        } catch (error) {
            console.error('Embed code generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate email body content
     * @param {string} shareUrl - Shareable URL
     * @param {Object} progress - Progress data
     * @param {string} template - Email template
     * @returns {string} Email body
     */
    generateEmailBody(shareUrl, progress, template = 'summary') {
        const templates = {
            summary: `
Royalust Big Island Retreat - Compliance Dashboard Update

Current Status:
• Overall Compliance: ${progress.overall}%
• Completed Items: ${progress.completed}/${progress.total}
• Last Updated: ${new Date().toLocaleDateString()}

View the full compliance dashboard: ${shareUrl}

This dashboard provides real-time tracking of our regulatory compliance while permit applications are pending. All requirements are being met to ensure safe and legal operations.

Best regards,
Royalust Team`,
            
            detailed: `
Royalust Big Island Retreat - Detailed Compliance Report

Executive Summary:
We are pleased to share our current compliance status for the Big Island retreat operations. Our comprehensive tracking system ensures full regulatory compliance while permit applications are in process.

Key Metrics:
• Overall Compliance: ${progress.overall}%
• Items Completed: ${progress.completed} of ${progress.total}
• Remaining Items: ${progress.remaining}
• Report Generated: ${new Date().toLocaleString()}

Access the interactive dashboard: ${shareUrl}

The dashboard includes:
- Real-time progress tracking
- Category-specific compliance status
- Source documentation links
- Risk assessment indicators

For questions or additional information, please contact our compliance team.

Royalust Management`,
            
            investor: `
Dear Investor,

Royalust Big Island Retreat - Compliance Status Update

We are committed to maintaining transparent communication regarding our regulatory compliance status. Please find our current compliance dashboard below:

Compliance Overview: ${progress.overall}% Complete
Interactive Dashboard: ${shareUrl}

Our proactive compliance approach ensures:
✓ Full regulatory adherence during permit processing
✓ Transparent tracking and reporting
✓ Risk mitigation and safety protocols
✓ Investor confidence and protection

The dashboard is updated regularly and provides detailed insights into our compliance efforts across all regulatory categories.

Thank you for your continued trust and investment.

Sincerely,
Royalust Investment Relations`
        };
        
        return templates[template] || templates.summary;
    }

    /**
     * Load shared data from URL parameters
     * @returns {Object|null} Shared data if available
     */
    loadSharedData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const shareId = urlParams.get('share');
            
            if (!shareId) {
                return null;
            }
            
            const shareConfig = this.shareableLinks.get(shareId);
            if (!shareConfig) {
                console.warn('Share link not found or expired');
                return null;
            }
            
            // Check expiration
            if (new Date() > new Date(shareConfig.expiresAt)) {
                console.warn('Share link has expired');
                this.shareableLinks.delete(shareId);
                this.saveShareableLinks();
                return null;
            }
            
            // Update access tracking
            shareConfig.accessCount++;
            shareConfig.lastAccessed = new Date().toISOString();
            this.saveShareableLinks();
            
            return shareConfig.data;
        } catch (error) {
            console.error('Failed to load shared data:', error);
            return null;
        }
    }

    /**
     * Generate unique share ID
     * @returns {string} Unique share ID
     */
    generateShareId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${timestamp}-${random}`;
    }

    /**
     * Invalidate existing shareable links
     */
    invalidateShareableLinks() {
        // Mark links as potentially outdated
        this.shareableLinks.forEach(config => {
            config.dataVersion = this.dataManager.dataVersion;
            config.lastDataUpdate = new Date().toISOString();
        });
    }

    /**
     * Save shareable links to localStorage
     */
    saveShareableLinks() {
        try {
            const linksData = {
                links: Object.fromEntries(this.shareableLinks),
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('royalust_shareable_links', JSON.stringify(linksData));
        } catch (error) {
            console.error('Failed to save shareable links:', error);
        }
    }

    /**
     * Load shareable links from localStorage
     */
    loadShareableLinks() {
        try {
            const stored = localStorage.getItem('royalust_shareable_links');
            if (stored) {
                const linksData = JSON.parse(stored);
                this.shareableLinks = new Map(Object.entries(linksData.links || {}));
                
                // Clean up expired links
                this.cleanupExpiredLinks();
            }
        } catch (error) {
            console.error('Failed to load shareable links:', error);
            this.shareableLinks = new Map();
        }
    }

    /**
     * Clean up expired shareable links
     */
    cleanupExpiredLinks() {
        const now = new Date();
        const expiredIds = [];
        
        this.shareableLinks.forEach((config, id) => {
            if (new Date(config.expiresAt) < now) {
                expiredIds.push(id);
            }
        });
        
        expiredIds.forEach(id => {
            this.shareableLinks.delete(id);
        });
        
        if (expiredIds.length > 0) {
            this.saveShareableLinks();
        }
    }

    /**
     * Add sharing action to history
     * @param {Object} action - Sharing action record
     */
    addToHistory(action) {
        this.shareHistory.unshift({
            ...action,
            id: this.generateShareId()
        });
        
        if (this.shareHistory.length > this.maxHistorySize) {
            this.shareHistory = this.shareHistory.slice(0, this.maxHistorySize);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('royalust_share_history', JSON.stringify(this.shareHistory));
        } catch (error) {
            console.error('Failed to save share history:', error);
        }
    }

    /**
     * Get sharing history
     * @returns {Array} Sharing history
     */
    getShareHistory() {
        return [...this.shareHistory];
    }

    /**
     * Get available sharing platforms
     * @returns {Array} Available platforms
     */
    getAvailablePlatforms() {
        return Array.from(this.platforms.entries()).map(([key, config]) => ({
            key,
            name: config.name,
            icon: config.icon,
            requiresData: config.requiresData
        }));
    }

    /**
     * Get sharing statistics
     * @returns {Object} Sharing statistics
     */
    getSharingStats() {
        const stats = {
            totalShares: this.shareHistory.length,
            activeLinks: this.shareableLinks.size,
            sharesByType: {},
            recentShares: this.shareHistory.slice(0, 10)
        };
        
        this.shareHistory.forEach(action => {
            stats.sharesByType[action.type] = (stats.sharesByType[action.type] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Initialize sharing system
     */
    initialize() {
        this.loadShareableLinks();
        
        // Load share history
        try {
            const stored = localStorage.getItem('royalust_share_history');
            if (stored) {
                this.shareHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load share history:', error);
            this.shareHistory = [];
        }
        
        // Check for shared data in URL
        const sharedData = this.loadSharedData();
        if (sharedData) {
            // Notify that shared data is available
            setTimeout(() => {
                this.dataManager.notifyObservers('sharedDataLoaded', sharedData);
            }, 100);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.shareableLinks.clear();
        this.shareHistory = [];
        this.platforms.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sharing;
}