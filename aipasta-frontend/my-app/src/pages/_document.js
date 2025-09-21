import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('aipasta-theme') || 'dark';
                  
                  // Remove any existing theme classes first
                  document.documentElement.classList.remove('light', 'dark');
                  document.body.classList.remove('light', 'dark');
                  
                  // Apply the theme
                  document.documentElement.classList.add(theme);
                  document.body.classList.add(theme);
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.style.colorScheme = theme;
                  
                  // Set CSS custom properties for dark mode
                  if (theme === 'dark') {
                    document.documentElement.style.setProperty('--bg-primary', '#1a1a1a');
                    document.documentElement.style.setProperty('--text-primary', '#e5e5e5');
                    document.documentElement.style.setProperty('--bg-secondary', '#2a2a2a');
                    document.documentElement.style.setProperty('--text-secondary', '#b5b5b5');
                    document.body.style.backgroundColor = '#1a1a1a';
                    document.body.style.color = '#e5e5e5';
                  } else {
                    document.documentElement.style.setProperty('--bg-primary', '#ffffff');
                    document.documentElement.style.setProperty('--text-primary', '#1e293b');
                    document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
                    document.documentElement.style.setProperty('--text-secondary', '#64748b');
                    document.body.style.backgroundColor = '#ffffff';
                    document.body.style.color = '#1e293b';
                  }
                  
                  // Save the theme back to localStorage to ensure it persists
                  localStorage.setItem('aipasta-theme', theme);
                } catch (e) {
                  // Fallback to dark mode if localStorage fails
                  document.documentElement.classList.remove('light', 'dark');
                  document.body.classList.remove('light', 'dark');
                  document.documentElement.classList.add('dark');
                  document.body.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                  document.body.style.backgroundColor = '#1a1a1a';
                  document.body.style.color = '#e5e5e5';
                }
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
