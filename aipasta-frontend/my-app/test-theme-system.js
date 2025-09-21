// Theme System Test Script
// Run this in the browser console to verify theme functionality

console.log('🎨 Testing Theme System...');

// Test 1: Check if ThemeContext is available
try {
  const themeProviderElement = document.querySelector('html');
  console.log('✅ HTML element found:', themeProviderElement);
  console.log('📝 Current classes:', themeProviderElement.className);
} catch (error) {
  console.error('❌ HTML element check failed:', error);
}

// Test 2: Check if CSS variables are set
try {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  
  console.log('🎯 CSS Variables:');
  console.log('  --background:', styles.getPropertyValue('--background'));
  console.log('  --foreground:', styles.getPropertyValue('--foreground'));
  console.log('  --sidebar:', styles.getPropertyValue('--sidebar'));
} catch (error) {
  console.error('❌ CSS variables check failed:', error);
}

// Test 3: Check localStorage theme persistence
try {
  const savedTheme = localStorage.getItem('aipasta-theme');
  console.log('💾 Saved theme in localStorage:', savedTheme);
} catch (error) {
  console.error('❌ localStorage check failed:', error);
}

// Test 4: Look for theme toggle button
try {
  const themeToggle = document.querySelector('button[title*="Switch to"]');
  console.log('🔘 Theme toggle button found:', !!themeToggle);
  if (themeToggle) {
    console.log('  Button title:', themeToggle.title);
  }
} catch (error) {
  console.error('❌ Theme toggle check failed:', error);
}

// Test 5: Check if dark mode classes are present
try {
  const darkElements = document.querySelectorAll('.dark\\:bg-neutral-900, .dark\\:text-neutral-100');
  console.log('🌙 Dark mode styled elements found:', darkElements.length);
} catch (error) {
  console.error('❌ Dark mode elements check failed:', error);
}

console.log('🎨 Theme System Test Complete!');
console.log('To manually test: Look for the theme toggle button in the sidebar and click it to switch themes.');