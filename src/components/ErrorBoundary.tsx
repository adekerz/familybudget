import { Component, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import i18n from '../i18n';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-6">
          <div className="bg-card border border-danger/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <div className="w-12 h-12 bg-danger-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WarningCircle size={22} className="text-danger" strokeWidth={2} />
            </div>
            <h2 className="text-ink font-bold mb-2">{i18n.t('error_boundary_title')}</h2>
            <p className="text-muted text-sm mb-4">{this.state.error?.message || i18n.t('error_boundary_desc')}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent text-white rounded-[22px] px-6 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              {i18n.t('reload')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
