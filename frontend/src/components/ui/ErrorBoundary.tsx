import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    section?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary — catches runtime errors in any child component tree
 * and renders a fallback UI instead of crashing the whole application.
 *
 * Usage:
 *   <ErrorBoundary section="Dashboard">
 *     <DashboardPage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(
            `[ErrorBoundary${this.props.section ? ` — ${this.props.section}` : ''}]`,
            error,
            info.componentStack
        );
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[24px] bg-white p-8 text-center shadow-sm">
                    <div className="mb-4 text-4xl text-amber-500">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-gray-800">Something went wrong</h2>
                    <p className="mb-6 max-w-sm text-sm text-gray-500">
                        {this.state.error?.message ?? 'An unexpected error occurred in this section.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
