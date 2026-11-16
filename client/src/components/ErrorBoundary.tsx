import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence for rendering bugs. React unmounts the whole tree on an uncaught render
 * error, which leaves a blank page; this keeps a readable message and a way out instead.
 * (Data-fetching errors never get here — they are values on the query and have their own UI.)
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In a real deployment this would be reported to an error tracker (Sentry, etc.).
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p className="text-base font-semibold text-ink">Something went wrong</p>
        <p className="max-w-md text-sm text-muted">
          The page hit an unexpected error. Reloading usually fixes it; your filters are kept in the
          address bar.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 rounded-card border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunk"
        >
          Reload
        </button>
      </div>
    );
  }
}
