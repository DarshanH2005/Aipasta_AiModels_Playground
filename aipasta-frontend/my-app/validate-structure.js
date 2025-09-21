#!/usr/bin/env node
/**
 * Project Structure Validation Script
 * Validates the new feature-based architecture
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = './src';

// Define expected structure
const expectedStructure = {
  'features/': {
    'auth/': {
      'components/': ['AuthModal.jsx', 'UserCreditsDisplay.jsx']
    },
    'chat/': {
      'components/': [
        'ChatHistorySidebar.jsx',
        'MultiResponseContainer.jsx',
        'CollapsibleResponseCard.jsx',
        'ColumnResponseLayout.jsx',
        'StreamingResponseCard.jsx',
        'TabbedResponseLayout.jsx',
        'ModelSelectionModal.jsx',
        'MultiModelSelector.jsx',
        'MultimodalInput.jsx',
        'PlaceholdersAndVanishInput.jsx',
        'SimpleUploadButton.jsx'
      ]
    },
    'index.js': true
  },
  'shared/': {
    'components/': [
      'ErrorBoundary.jsx',
      'ToastNotifications.jsx',
      'MarkdownRenderer.jsx',
      'TokenDisplay.jsx',
      'WalletDisplay.jsx',
      'CostEstimation.jsx',
      'PlansModal.jsx',
      'SettingsModal.jsx'
    ],
    'layout/': [
      'Sidebar.jsx',
      'SidebarHistory.jsx',
      'SidebarSettings.jsx',
      'SidebarFooter.jsx'
    ],
    'index.js': true
  },
  'constants/': {
    'models.js': true
  },
  'utils/': {
    'tokens.js': true
  }
};

function validateStructure(structure, basePath = BASE_DIR) {
  let errors = [];
  let warnings = [];
  
  for (const [item, expected] of Object.entries(structure)) {
    const fullPath = path.join(basePath, item);
    
    if (expected === true) {
      // This is a file
      if (!fs.existsSync(fullPath)) {
        errors.push(`Missing file: ${fullPath}`);
      } else {
        console.log(`✅ Found file: ${fullPath}`);
      }
    } else if (Array.isArray(expected)) {
      // This is a directory with expected files
      if (!fs.existsSync(fullPath)) {
        errors.push(`Missing directory: ${fullPath}`);
      } else {
        const files = fs.readdirSync(fullPath);
        for (const expectedFile of expected) {
          if (!files.includes(expectedFile)) {
            errors.push(`Missing file: ${path.join(fullPath, expectedFile)}`);
          } else {
            console.log(`✅ Found file: ${path.join(fullPath, expectedFile)}`);
          }
        }
        
        // Check for unexpected files
        for (const file of files) {
          if (!expected.includes(file)) {
            warnings.push(`Unexpected file: ${path.join(fullPath, file)}`);
          }
        }
      }
    } else if (typeof expected === 'object') {
      // This is a nested directory structure
      if (!fs.existsSync(fullPath)) {
        errors.push(`Missing directory: ${fullPath}`);
      } else {
        console.log(`✅ Found directory: ${fullPath}`);
        const nestedResults = validateStructure(expected, fullPath);
        errors = errors.concat(nestedResults.errors);
        warnings = warnings.concat(nestedResults.warnings);
      }
    }
  }
  
  return { errors, warnings };
}

function main() {
  console.log('🔍 Validating Project Structure...\n');
  
  const { errors, warnings } = validateStructure(expectedStructure);
  
  console.log('\n📊 Validation Results:');
  console.log(`✅ Structure validation completed`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors found:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (errors.length === 0) {
    console.log('\n🎉 Project structure validation passed!');
    console.log('The new feature-based architecture is properly implemented.');
  } else {
    console.log('\n🚨 Project structure validation failed!');
    console.log('Please fix the errors above before proceeding.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateStructure };