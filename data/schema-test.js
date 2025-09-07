/**
 * Simple test script to demonstrate compliance data schema validation
 * Run with: node data/schema-test.js
 */

const ComplianceDataSchema = require('./data-schema.js');
const fs = require('fs');

console.log('🛡 Royalust Compliance Data Schema Test 🛡\n');

try {
    // Initialize schema validator
    const schema = new ComplianceDataSchema();
    console.log(`✅ Schema validator initialized (version ${schema.version})\n`);

    // Load compliance data
    const data = JSON.parse(fs.readFileSync('./data/compliance.json', 'utf8'));
    console.log(`📊 Loaded compliance data with ${data.categories.length} categories\n`);

    // Validate the data
    console.log('🔍 Running validation...\n');
    const validation = schema.validateCompleteData(data);

    // Display results
    console.log('📋 VALIDATION RESULTS:');
    console.log('='.repeat(50));
    console.log(`Status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Errors: ${validation.errors.length}`);
    console.log(`Warnings: ${validation.warnings.length}`);
    console.log(`Validated at: ${validation.validatedAt}\n`);

    if (validation.errors.length > 0) {
        console.log('❌ ERRORS:');
        validation.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
        console.log();
    }

    if (validation.warnings.length > 0) {
        console.log('⚠️  WARNINGS (first 5):');
        validation.warnings.slice(0, 5).forEach((warning, index) => {
            console.log(`  ${index + 1}. ${warning}`);
        });
        if (validation.warnings.length > 5) {
            console.log(`  ... and ${validation.warnings.length - 5} more warnings`);
        }
        console.log();
    }

    // Test sanitization for export
    console.log('🧹 Testing data sanitization for export...');
    const sanitized = schema.sanitizeForExport(data);
    console.log(`✅ Data sanitized successfully with export metadata\n`);

    // Display summary statistics
    console.log('📈 DATA SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total Categories: ${data.metadata.totalCategories}`);
    console.log(`Total Items: ${data.metadata.totalItems}`);
    console.log(`Data Version: ${data.metadata.version}`);
    console.log(`Last Updated: ${data.metadata.lastUpdated}`);
    console.log(`Schema: ${data.metadata.dataSchema}\n`);

    // Category breakdown
    console.log('📂 CATEGORY BREAKDOWN:');
    console.log('='.repeat(50));
    data.categories.forEach((category, index) => {
        const itemCount = category.items ? category.items.length : 0;
        const riskIcon = category.riskLevel === 'high' ? '🔴' :
            category.riskLevel === 'medium' ? '🟡' : '🟢';
        console.log(`${index + 1}. ${category.icon} ${category.title}`);
        console.log(`   Items: ${itemCount} | Risk: ${riskIcon} ${category.riskLevel} | Priority: ${category.priority}`);
    });

    console.log('\n🎉 Schema validation test completed successfully!');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}