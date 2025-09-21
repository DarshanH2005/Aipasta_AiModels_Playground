/**
 * Export Verification Script
 * Tests if all component exports are working correctly
 */

// Test shared components
console.log('Testing shared component exports...');

try {
  const { 
    ErrorBoundary, 
    ToastProvider, 
    SettingsModal, 
    Sidebar, 
    SidebarFooter,
    SidebarHistory,
    SidebarSettings 
  } = require('./src/shared');
  
  console.log('✅ Shared components exports working:');
  console.log('  - ErrorBoundary:', typeof ErrorBoundary);
  console.log('  - ToastProvider:', typeof ToastProvider);
  console.log('  - SettingsModal:', typeof SettingsModal);
  console.log('  - Sidebar:', typeof Sidebar);
  console.log('  - SidebarFooter:', typeof SidebarFooter);
  console.log('  - SidebarHistory:', typeof SidebarHistory);
  console.log('  - SidebarSettings:', typeof SidebarSettings);
} catch (error) {
  console.log('❌ Shared components export error:', error.message);
}

// Test feature components
console.log('\nTesting feature component exports...');

try {
  const { 
    AuthModal, 
    MultiResponseContainer,
    PlaceholdersAndVanishInput,
    ModelSelectionModal 
  } = require('./src/features');
  
  console.log('✅ Feature components exports working:');
  console.log('  - AuthModal:', typeof AuthModal);
  console.log('  - MultiResponseContainer:', typeof MultiResponseContainer);
  console.log('  - PlaceholdersAndVanishInput:', typeof PlaceholdersAndVanishInput);
  console.log('  - ModelSelectionModal:', typeof ModelSelectionModal);
} catch (error) {
  console.log('❌ Feature components export error:', error.message);
}

console.log('\n🎉 Export verification completed!');