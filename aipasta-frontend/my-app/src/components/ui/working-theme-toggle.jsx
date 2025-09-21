'use client';

import React, { useState, useEffect } from 'react';

const ThemeToggle = ({ className = '', size = 'md' }) => {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  useEffect(() => {
    // Get initial theme - default to dark mode
    const savedTheme = localStorage.getItem('aipasta-theme') || 'dark';
    
    // Double-check that the document has the correct theme class
    const currentDocumentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    
    // Use the theme that's already applied to the document, or the saved theme
    const finalTheme = currentDocumentTheme === 'dark' || currentDocumentTheme === 'light' ? currentDocumentTheme : savedTheme;
    
    setTheme(finalTheme);
    
    // Only apply theme if it doesn't match what's already on the document
    if (currentDocumentTheme !== finalTheme) {
      applyTheme(finalTheme);
    }
    
    setMounted(true);
  }, []);

  const applyTheme = (newTheme) => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // Remove existing theme classes
    htmlElement.classList.remove('light', 'dark');
    bodyElement.classList.remove('light', 'dark');
    
    // Add new theme class
    htmlElement.classList.add(newTheme);
    bodyElement.classList.add(newTheme);
    
    // Also set data attribute for additional CSS targeting
    htmlElement.setAttribute('data-theme', newTheme);
    
    // Force style recalculation
    htmlElement.style.colorScheme = newTheme;
    
    // Update CSS custom properties directly
    if (newTheme === 'dark') {
      document.documentElement.style.setProperty('--bg-primary', '#1a1a1a');
      document.documentElement.style.setProperty('--text-primary', '#e5e5e5');
      document.documentElement.style.setProperty('--bg-secondary', '#2a2a2a');
      document.documentElement.style.setProperty('--text-secondary', '#b5b5b5');
      
      // Force body styling directly
      bodyElement.style.backgroundColor = '#1a1a1a';
      bodyElement.style.color = '#e5e5e5';
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-primary', '#1e293b');
      document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
      document.documentElement.style.setProperty('--text-secondary', '#64748b');
      
      // Force body styling directly
      bodyElement.style.backgroundColor = '#ffffff';
      bodyElement.style.color = '#1e293b';
    }
    
    // Force a style recalculation
    htmlElement.offsetHeight; // trigger reflow
    
    // Find main containers and apply theme classes
    const mainContainers = document.querySelectorAll('main, .container, [class*="bg-"]');
    mainContainers.forEach(container => {
      container.classList.remove('light', 'dark');
      container.classList.add(newTheme);
    });
    

  };

  const toggleTheme = () => {
    if (!mounted) return; // Prevent theme changes before component is fully mounted
    
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Save to localStorage
    try {
      localStorage.setItem('aipasta-theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        relative rounded-lg
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        group
        ${className}
      `}
      style={{
        backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
        borderWidth: '2px',
        borderStyle: 'solid',
        boxShadow: theme === 'dark' ? '0 0 0 1px #7c3aed' : '0 0 0 1px #f59e0b',
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Sun Icon */}
      <svg
        className={`
          ${iconSizeClasses[size]}
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          transition-all duration-300 ease-in-out
          ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
        `}
        fill="#f59e0b"
        viewBox="0 0 24 24"
      >
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>

      {/* Moon Icon */}
      <svg
        className={`
          ${iconSizeClasses[size]}
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          transition-all duration-300 ease-in-out
          ${theme === 'light' ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
        `}
        fill="#60a5fa"
        viewBox="0 0 24 24"
      >
        <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
      </svg>
    </button>
  );
};

export default ThemeToggle;