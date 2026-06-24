import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    // Attempt clear storage or refresh
    try {
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0F0F0F',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <img 
              src="/logo.jpg" 
              alt="GARDO Logo" 
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                marginBottom: '24px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)'
              }}
            />
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              marginBottom: '12px',
              letterSpacing: '0.05em'
            }}>
              Something went wrong.
            </h1>
            <p style={{
              fontSize: '0.95rem',
              color: '#888888',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              An unexpected error occurred. Don't worry, your digital wardrobe is safe.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'rgba(255, 0, 0, 0.05)',
                border: '1px solid rgba(255, 0, 0, 0.15)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.8rem',
                color: '#FF6B6B',
                textAlign: 'left',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                marginBottom: '24px',
                maxHeight: '120px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReset}
                style={{
                  background: '#D4AF37',
                  border: 'none',
                  color: '#0F0F0F',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                Reset & Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
