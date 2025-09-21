/**
 * Shared Components Index
 * Centralized exports for all shared components
 */

// Layout Components
export { SidebarHistory } from './layout/SidebarHistory';
export { SidebarSettings } from './layout/SidebarSettings';
export { SidebarFooter as CustomSidebarFooter } from './layout/SidebarFooter';
export { Sidebar, SidebarBody, SidebarLink, SidebarProvider, SidebarFooter } from './layout/Sidebar';

// UI Components
export { default as ErrorBoundary } from './components/ErrorBoundary';
export { default as ToastNotifications, useToast, ToastProvider } from './components/ToastNotifications';
export { default as MarkdownRenderer } from './components/MarkdownRenderer';
export { default as TokenDisplay } from './components/TokenDisplay';
export { default as WalletDisplay } from './components/WalletDisplay';
export { default as CostEstimation } from './components/CostEstimation';
export { default as PlansModal } from './components/PlansModal';
export { default as SettingsModal } from './components/SettingsModal';