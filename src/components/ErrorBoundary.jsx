/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree and displays fallback UI
 */

import React, { Component } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { logger } from '../utils/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    logger.app.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({ errorInfo });

    // You could also send this to an error reporting service
    // errorReportingService.log(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear any error-causing state and go to home
    try {
      // Clear potentially corrupted localStorage
      const keysToPreserve = ['deadblock_settings'];
      const preserved = {};
      keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) preserved[key] = value;
      });
      
      // Clear all and restore preserved
      localStorage.clear();
      Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    } catch (e) {
      // Ignore localStorage errors
    }
    
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'page' } = this.props;
      
      // Minimal error display for component-level boundaries
      if (level === 'component') {
        return (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle size={16} />
              <span>Something went wrong</span>
              <button
                onClick={this.handleReset}
                className="ml-auto text-cyan-400 hover:text-cyan-300 text-xs underline"
              >
                Try again
              </button>
            </div>
          </div>
        );
      }

      // Full page error display
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          {/* Background effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(239,68,68,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(239,68,68,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-orange-500/15 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-md w-full">
            {/* Error card */}
            <div className="bg-slate-900/90 border border-red-500/40 rounded-2xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.2)]">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                  <AlertTriangle size={40} className="text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black text-center text-white mb-2 font-['Orbitron']">
                SYSTEM ERROR
              </h1>
              <p className="text-slate-400 text-center mb-6">
                Something unexpected happened. Don't worry, your data is safe.
              </p>

              {/* Error details (collapsed in production) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6 bg-slate-800/50 rounded-lg p-3 text-xs">
                  <summary className="text-red-400 cursor-pointer font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-slate-400 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-[0.98]"
                >
                  <RefreshCw size={20} />
                  Reload App
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-slate-800 border border-slate-600 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  <Home size={20} />
                  Go to Menu
                </button>
              </div>

              {/* Help text */}
              <p className="mt-6 text-xs text-slate-500 text-center">
                If this keeps happening, try clearing your browser cache or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary(WrappedComponent, options = {}) {
  const { fallback, level = 'component' } = options;
  
  return function WithErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary fallback={fallback} level={level}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
