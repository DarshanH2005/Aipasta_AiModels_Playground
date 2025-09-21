import "@/styles/globals.css";
import AuthProvider from '../contexts/AuthContext';
import { ToastProvider } from '../components/ui/toast-notifications';
import ErrorBoundary from '../components/ui/ErrorBoundary';

export default function App({ Component, pageProps }) {
  // Dev-only guard: ensure Next dev HMR client can safely read `window.next.router.components`
  // Avoid overwriting existing getters on `window.next` which can throw (observed in some Next dev overlays).
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      // Helper to check if a property is writable on an object
      const isWritable = (obj, prop) => {
        try {
          const desc = Object.getOwnPropertyDescriptor(obj, prop);
          // If descriptor is undefined, assume writable (common for normal properties)
          if (!desc) return true;
          return !!desc.writable;
        } catch (e) {
          return false;
        }
      };

      // If `window.next` doesn't exist, try to create it (most envs allow this)
      if (typeof window.next === 'undefined') {
        try {
          window.next = { router: { components: {} } };
        } catch (e) {
          // Quietly ignore if we cannot define it in this environment
        }
      } else {
        // If window.next exists, only attempt property writes if the target property is writable
        try {
          if (typeof window.next.router === 'undefined') {
            if (isWritable(window, 'next')) {
              try {
                window.next.router = { components: {} };
              } catch (e) {
                // ignore
              }
            }
          } else {
            // router exists — only set components if writable or undefined
            try {
              if (typeof window.next.router.components === 'undefined') {
                if (isWritable(window.next, 'router')) {
                  try {
                    window.next.router.components = {};
                  } catch (e) {
                    // ignore
                  }
                }
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore any errors — dev guard must be non-fatal and silent
        }
      }
    } catch (e) {
      // ignore — keep dev guard silent to avoid noisy logs
    }
  }
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
