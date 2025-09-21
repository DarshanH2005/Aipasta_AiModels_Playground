import "@/styles/globals.css";
import AuthProvider from '../contexts/AuthContext';
import { ToastProvider } from '../components/ui/toast-notifications';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import React, { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  // Dev-only guard + extension detection inside a single useEffect so React hooks rules are respected
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

    // Dev-only guard: ensure Next dev HMR client can safely read `window.next.router.components`
    try {
      // Helper to check if a property is writable on an object
      const isWritable = (obj, prop) => {
        try {
          const desc = Object.getOwnPropertyDescriptor(obj, prop);
          if (!desc) return true;
          return !!desc.writable;
        } catch (e) {
          return false;
        }
      };

      if (typeof window.next === 'undefined') {
        try {
          window.next = { router: { components: {} } };
        } catch (e) {
          // ignore
        }
      } else {
        try {
          if (typeof window.next.router === 'undefined') {
            if (isWritable(window, 'next')) {
              try { window.next.router = { components: {} }; } catch (e) { /* ignore */ }
            }
          } else {
            try {
              if (typeof window.next.router.components === 'undefined') {
                if (isWritable(window.next, 'router')) {
                  try { window.next.router.components = {}; } catch (e) { /* ignore */ }
                }
              }
            } catch (e) { /* ignore */ }
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

    // Detect possible extension script injection (Bybit or similar) and show a lightweight banner
    try {
      const scripts = Array.from(document.scripts || []);
      const injector = scripts.find((s) => {
        const src = s.src || '';
        const txt = (s.innerText || '') + (s.textContent || '');
        return /bybit|page provider inject|bybit-extension|bybit-provider/i.test(src + txt);
      });

      if (injector) {
        const id = 'dev-extension-warning-banner';
        if (!document.getElementById(id)) {
          const banner = document.createElement('div');
          banner.id = id;
          banner.style.position = 'fixed';
          banner.style.top = '12px';
          banner.style.left = '50%';
          banner.style.transform = 'translateX(-50%)';
          banner.style.zIndex = '999999';
          banner.style.background = '#fffbeb';
          banner.style.color = '#92400e';
          banner.style.border = '1px solid #f59e0b';
          banner.style.padding = '8px 12px';
          banner.style.borderRadius = '8px';
          banner.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
          banner.style.fontFamily = 'Inter, system-ui, sans-serif';
          banner.style.fontSize = '13px';
          banner.innerText = 'Dev warning: an extension (e.g. Bybit) injected scripts into the page and may break HMR. Disable extensions or test in Incognito.';

          const close = document.createElement('button');
          close.innerText = 'Dismiss';
          close.style.marginLeft = '10px';
          close.style.background = '#f59e0b';
          close.style.color = '#fff';
          close.style.border = 'none';
          close.style.padding = '4px 8px';
          close.style.borderRadius = '6px';
          close.style.cursor = 'pointer';
          close.onclick = () => banner.remove();

          banner.appendChild(close);
          document.body.appendChild(banner);
        }
        console.warn('Dev warning: extension-injected script detected (possible Bybit). Disable extensions or use Incognito to avoid HMR issues.');
      }
    } catch (e) {
      console.debug('Extension detection failed', e);
    }
  }, []);
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
