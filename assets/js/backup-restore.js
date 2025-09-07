/**
 * BackupRestore - Comprehensive backup and restore functionality
 * Handles data backup, restore operations, version control, and data recovery
 */

class BackupRestore {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.backups = new Map();
        this.autoBackupInterval = null;
        this.maxBackups = 50;
        this.backupFrequency = 5 * 60 * 1000; // 5 minutes
        this.compressionEnabled = true;
        this.encryptionEnabled = false;
        
        this.initializeBackupSystem();
    }

    /**
     * Initialize the backup system
     */
    initializeBackupSystem() {
        this.loadExistingBackups();
        this.setupAutoBackup();
        this.setupDataObserver();
    }

    /**
     * Setup automatic backup functionality
     */
    setupAutoBackup() {
        // Auto-backup every 5 minutes if data has changed
        this.autoBackupInterval = setInterval(async () => {
            if (this.dataManager.isDirty) {
                try {
                    await this.createAutoBackup();
                } catch (error) {
                    console.error('Auto-backup failed:', error);
                }
            }
        }, this.backupFrequency);
    }

    /**
     * Setup data observer to track changes
     */
    setupDataObserver() {
        this.dataManager.addObserver((event, data) => {
            if (event === 'itemStatusChanged' || event === 'progressSaved') {
                this.scheduleBackup();
            }
        });
    }

    /**
     * Create a manual backup
     * @param {Object} options - Backup options
     * @returns {Promise<string>} Backup ID
     */
    async createBackup(options = {}) {
        try {
            const {
                name = null,
                description = '',
                includeMetadata = true,
                compress = this.compressionEnabled,
                encrypt = this.encryptionEnabled
            } = options;
            
            const backupId = this.generateBackupId();
            const timestamp = new Date().toISOString();
            
            // Gather backup data
            const backupData = await this.gatherBackupData(includeMetadata);
            
            // Process data (compression, encryption)
            const processedData = await this.processBackupData(backupData, {
                compress,
                encrypt
            });
            
            // Create backup record
            const backup = {
                id: backupId,
                name: name || `Backup ${new Date().toLocaleString()}`,
                description,
                timestamp,
                type: 'manual',
                size: this.calculateDataSize(processedData),
                compressed: compress,
                encrypted: encrypt,
                data: processedData,
                metadata: {
                    version: this.dataManager.dataVersion,
                    totalItems: backupData.progress?.total || 0,
                    completedItems: backupData.progress?.completed || 0,
                    categories: backupData.categories?.length || 0
                }
            };
            
            // Store backup
            this.backups.set(backupId, backup);
            this.saveBackupsToStorage();
            this.cleanupOldBackups();
            
            console.log(`Backup created: ${backupId}`);
            return backupId;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    /**
     * Create an automatic backup
     * @returns {Promise<string>} Backup ID
     */
    async createAutoBackup() {
        const backupId = this.generateBackupId();
        const timestamp = new Date().toISOString();
        
        try {
            const backupData = await this.gatherBackupData(true);
            const processedData = await this.processBackupData(backupData, {
                compress: true,
                encrypt: false
            });
            
            const backup = {
                id: backupId,
                name: `Auto-backup ${new Date().toLocaleString()}`,
                description: 'Automatic backup',
                timestamp,
                type: 'auto',
                size: this.calculateDataSize(processedData),
                compressed: true,
                encrypted: false,
                data: processedData,
                metadata: {
                    version: this.dataManager.dataVersion,
                    totalItems: backupData.progress?.total || 0,
                    completedItems: backupData.progress?.completed || 0,
                    categories: backupData.categories?.length || 0
                }
            };
            
            this.backups.set(backupId, backup);
            this.saveBackupsToStorage();
            this.cleanupOldBackups();
            
            return backupId;
        } catch (error) {
            console.error('Auto-backup failed:', error);
            throw error;
        }
    }

    /**
     * Restore data from a backup
     * @param {string} backupId - Backup ID to restore
     * @param {Object} options - Restore options
     * @returns {Promise<boolean>} Success status
     */
    async restoreFromBackup(backupId, options = {}) {
        try {
            const {
                confirmRestore = true,
                createBackupBeforeRestore = true,
                restoreProgress = true,
                restoreSettings = true
            } = options;
            
            const backup = this.backups.get(backupId);
            if (!backup) {
                throw new Error(`Backup not found: ${backupId}`);
            }
            
            // Confirm restore operation
            if (confirmRestore) {
                const confirmed = await this.confirmRestoreOperation(backup);
                if (!confirmed) {
                    return false;
                }
            }
            
            // Create backup before restore
            if (createBackupBeforeRestore) {
                await this.createBackup({
                    name: `Pre-restore backup ${new Date().toLocaleString()}`,
                    description: `Backup created before restoring ${backupId}`
                });
            }
            
            // Process backup data
            const restoredData = await this.processRestoreData(backup.data, {
                compressed: backup.compressed,
                encrypted: backup.encrypted
            });
            
            // Restore progress data
            if (restoreProgress && restoredData.userProgress) {
                this.dataManager.userProgress.clear();
                Object.entries(restoredData.userProgress).forEach(([itemId, status]) => {
                    this.dataManager.userProgress.set(itemId, status);
                });
                this.dataManager.isDirty = true;
            }
            
            // Save restored data
            await this.dataManager.saveUserProgress(true);
            
            // Notify observers
            this.dataManager.notifyObservers('dataRestored', {
                backupId,
                timestamp: backup.timestamp,
                restoredItems: Object.keys(restoredData.userProgress || {}).length
            });
            
            console.log(`Data restored from backup: ${backupId}`);
            return true;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            throw error;
        }
    }

    /**
     * Export backup to file
     * @param {string} backupId - Backup ID to export
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Backup file blob
     */
    async exportBackup(backupId, options = {}) {
        try {
            const { format = 'json', includeMetadata = true } = options;
            
            const backup = this.backups.get(backupId);
            if (!backup) {
                throw new Error(`Backup not found: ${backupId}`);
            }
            
            let exportData;
            
            if (includeMetadata) {
                exportData = {
                    backup: {
                        id: backup.id,
                        name: backup.name,
                        description: backup.description,
                        timestamp: backup.timestamp,
                        type: backup.type,
                        metadata: backup.metadata
                    },
                    data: backup.data
                };
            } else {
                exportData = backup.data;
            }
            
            const jsonString = JSON.stringify(exportData, null, 2);
            return new Blob([jsonString], { type: 'application/json' });
        } catch (error) {
            console.error('Failed to export backup:', error);
            throw error;
        }
    }

    /**
     * Import backup from file
     * @param {File} file - Backup file
     * @param {Object} options - Import options
     * @returns {Promise<string>} Imported backup ID
     */
    async importBackup(file, options = {}) {
        try {
            const { validateData = true, autoRestore = false } = options;
            
            const fileContent = await this.readFileContent(file);
            const importedData = JSON.parse(fileContent);
            
            // Validate imported data
            if (validateData) {
                const validation = this.validateBackupData(importedData);
                if (!validation.isValid) {
                    throw new Error(`Invalid backup data: ${validation.errors.join(', ')}`);
                }
            }
            
            // Generate new backup ID for imported data
            const backupId = this.generateBackupId();
            const timestamp = new Date().toISOString();
            
            // Create backup record
            const backup = {
                id: backupId,
                name: importedData.backup?.name || `Imported backup ${new Date().toLocaleString()}`,
                description: importedData.backup?.description || 'Imported from file',
                timestamp,
                type: 'imported',
                size: this.calculateDataSize(importedData.data || importedData),
                compressed: false,
                encrypted: false,
                data: importedData.data || importedData,
                metadata: importedData.backup?.metadata || {
                    version: 'unknown',
                    importedAt: timestamp
                }
            };
            
            // Store imported backup
            this.backups.set(backupId, backup);
            this.saveBackupsToStorage();
            
            // Auto-restore if requested
            if (autoRestore) {
                await this.restoreFromBackup(backupId, { confirmRestore: false });
            }
            
            console.log(`Backup imported: ${backupId}`);
            return backupId;
        } catch (error) {
            console.error('Failed to import backup:', error);
            throw error;
        }
    }

    /**
     * Delete a backup
     * @param {string} backupId - Backup ID to delete
     * @returns {boolean} Success status
     */
    deleteBackup(backupId) {
        try {
            const backup = this.backups.get(backupId);
            if (!backup) {
                return false;
            }
            
            this.backups.delete(backupId);
            this.saveBackupsToStorage();
            
            console.log(`Backup deleted: ${backupId}`);
            return true;
        } catch (error) {
            console.error('Failed to delete backup:', error);
            return false;
        }
    }

    /**
     * Get all backups
     * @returns {Array} List of backups
     */
    getAllBackups() {
        return Array.from(this.backups.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Get backup by ID
     * @param {string} backupId - Backup ID
     * @returns {Object|null} Backup data
     */
    getBackup(backupId) {
        return this.backups.get(backupId) || null;
    }

    /**
     * Gather data for backup
     * @param {boolean} includeMetadata - Include metadata
     * @returns {Object} Backup data
     */
    async gatherBackupData(includeMetadata = true) {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: this.dataManager.dataVersion
        };
        
        // Include user progress
        backupData.userProgress = this.dataManager.getAllStatuses();
        
        // Include progress calculations
        backupData.progress = this.dataManager.calculateProgress();
        backupData.categoryProgress = this.dataManager.getCategoryProgress();
        
        // Include compliance data structure (for reference)
        if (this.dataManager.complianceData && includeMetadata) {
            backupData.complianceStructure = {
                categories: this.dataManager.complianceData.categories.map(cat => ({
                    id: cat.id,
                    title: cat.title,
                    itemCount: cat.items?.length || 0
                })),
                metadata: this.dataManager.complianceData.metadata
            };
        }
        
        return backupData;
    }

    /**
     * Process backup data (compression, encryption)
     * @param {Object} data - Raw backup data
     * @param {Object} options - Processing options
     * @returns {Object} Processed data
     */
    async processBackupData(data, options = {}) {
        let processedData = { ...data };
        
        if (options.compress) {
            // Simple compression simulation (in production, use proper compression)
            processedData = {
                compressed: true,
                data: JSON.stringify(data)
            };
        }
        
        if (options.encrypt) {
            // Encryption placeholder (implement proper encryption in production)
            processedData = {
                encrypted: true,
                data: btoa(JSON.stringify(processedData))
            };
        }
        
        return processedData;
    }

    /**
     * Process restore data (decompression, decryption)
     * @param {Object} data - Processed backup data
     * @param {Object} options - Processing options
     * @returns {Object} Restored data
     */
    async processRestoreData(data, options = {}) {
        let restoredData = data;
        
        if (options.encrypted) {
            // Decryption placeholder
            const decryptedString = atob(data.data);
            restoredData = JSON.parse(decryptedString);
        }
        
        if (options.compressed) {
            // Decompression
            if (restoredData.compressed && restoredData.data) {
                restoredData = JSON.parse(restoredData.data);
            }
        }
        
        return restoredData;
    }

    /**
     * Validate backup data structure
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result
     */
    validateBackupData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Backup data must be an object');
            return { isValid: false, errors };
        }
        
        // Check for required fields
        const actualData = data.data || data;
        
        if (!actualData.userProgress || typeof actualData.userProgress !== 'object') {
            errors.push('Missing or invalid userProgress data');
        }
        
        if (!actualData.timestamp || typeof actualData.timestamp !== 'string') {
            errors.push('Missing or invalid timestamp');
        }
        
        if (!actualData.version || typeof actualData.version !== 'string') {
            errors.push('Missing or invalid version');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Confirm restore operation with user
     * @param {Object} backup - Backup to restore
     * @returns {Promise<boolean>} User confirmation
     */
    async confirmRestoreOperation(backup) {
        // In a real application, show a proper confirmation dialog
        const message = `Are you sure you want to restore from backup "${backup.name}"?\n\nThis will replace your current progress with data from ${new Date(backup.timestamp).toLocaleString()}.\n\nCurrent progress will be backed up before restore.`;
        
        return confirm(message);
    }

    /**
     * Read file content
     * @param {File} file - File to read
     * @returns {Promise<string>} File content
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Calculate data size
     * @param {Object} data - Data to measure
     * @returns {number} Size in bytes
     */
    calculateDataSize(data) {
        return new Blob([JSON.stringify(data)]).size;
    }

    /**
     * Generate unique backup ID
     * @returns {string} Backup ID
     */
    generateBackupId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `backup-${timestamp}-${random}`;
    }

    /**
     * Schedule a backup (debounced)
     */
    scheduleBackup() {
        if (this.backupTimeout) {
            clearTimeout(this.backupTimeout);
        }
        
        this.backupTimeout = setTimeout(async () => {
            try {
                await this.createAutoBackup();
            } catch (error) {
                console.error('Scheduled backup failed:', error);
            }
        }, 30000); // 30 seconds delay
    }

    /**
     * Load existing backups from storage
     */
    loadExistingBackups() {
        try {
            const stored = localStorage.getItem('royalust_backups');
            if (stored) {
                const backupsData = JSON.parse(stored);
                this.backups = new Map(Object.entries(backupsData.backups || {}));
                
                // Clean up old backups
                this.cleanupOldBackups();
            }
        } catch (error) {
            console.error('Failed to load existing backups:', error);
            this.backups = new Map();
        }
    }

    /**
     * Save backups to localStorage
     */
    saveBackupsToStorage() {
        try {
            const backupsData = {
                backups: Object.fromEntries(this.backups),
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('royalust_backups', JSON.stringify(backupsData));
        } catch (error) {
            console.error('Failed to save backups to storage:', error);
        }
    }

    /**
     * Clean up old backups to maintain storage limits
     */
    cleanupOldBackups() {
        const backupArray = Array.from(this.backups.entries())
            .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Keep only the most recent backups
        if (backupArray.length > this.maxBackups) {
            const toDelete = backupArray.slice(this.maxBackups);
            toDelete.forEach(([id]) => {
                this.backups.delete(id);
            });
        }
        
        // Remove backups older than 30 days (except manual backups)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const expiredIds = [];
        
        this.backups.forEach((backup, id) => {
            if (backup.type === 'auto' && new Date(backup.timestamp) < thirtyDaysAgo) {
                expiredIds.push(id);
            }
        });
        
        expiredIds.forEach(id => {
            this.backups.delete(id);
        });
    }

    /**
     * Get backup statistics
     * @returns {Object} Backup statistics
     */
    getBackupStats() {
        const backups = Array.from(this.backups.values());
        
        return {
            totalBackups: backups.length,
            manualBackups: backups.filter(b => b.type === 'manual').length,
            autoBackups: backups.filter(b => b.type === 'auto').length,
            importedBackups: backups.filter(b => b.type === 'imported').length,
            totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
            oldestBackup: backups.length > 0 ? 
                Math.min(...backups.map(b => new Date(b.timestamp).getTime())) : null,
            newestBackup: backups.length > 0 ? 
                Math.max(...backups.map(b => new Date(b.timestamp).getTime())) : null
        };
    }

    /**
     * Enable or disable auto-backup
     * @param {boolean} enabled - Enable auto-backup
     */
    setAutoBackupEnabled(enabled) {
        if (enabled && !this.autoBackupInterval) {
            this.setupAutoBackup();
        } else if (!enabled && this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
            this.autoBackupInterval = null;
        }
    }

    /**
     * Set backup frequency
     * @param {number} frequency - Frequency in milliseconds
     */
    setBackupFrequency(frequency) {
        this.backupFrequency = frequency;
        
        if (this.autoBackupInterval) {
            this.setAutoBackupEnabled(false);
            this.setAutoBackupEnabled(true);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }
        
        if (this.backupTimeout) {
            clearTimeout(this.backupTimeout);
        }
        
        this.backups.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupRestore;
}