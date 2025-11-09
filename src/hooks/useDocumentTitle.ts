import { useEffect, useRef } from 'react';

/**
 * Custom hook to manage document title with cleanup.
 * Updates the browser tab title when the component mounts or when the title changes.
 * Restores the default title on unmount.
 *
 * @param title - The title to set for the document
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   useDocumentTitle('Dashboard - CO-SAFE Connect');
 *   return <div>Dashboard content</div>;
 * }
 * ```
 */
export function useDocumentTitle(title: string): void {
  // Store the original title to restore on unmount
  const defaultTitle = useRef<string>();

  useEffect(() => {
    // SSR safety check
    if (typeof document === 'undefined') {
      return;
    }

    // Capture the default title on first mount
    if (defaultTitle.current === undefined) {
      defaultTitle.current = document.title || 'CO-SAFE Connect';
    }

    // Update the document title
    document.title = title;

    // Cleanup: restore default title on unmount
    return () => {
      if (defaultTitle.current) {
        document.title = defaultTitle.current;
      }
    };
  }, [title]);
}
