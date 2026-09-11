import React, {Component, ErrorInfo, ReactNode} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {THEME} from '../theme';
import {t} from '../i18n';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {hasError: true, error};
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QTime caught runtime error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({hasError: false, error: null});
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>!</Text>
            </View>
            <Text style={styles.title}>
              {this.props.fallbackTitle || t('error')}
            </Text>
            <Text style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred in the queue display.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              activeOpacity={0.8}>
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.xl,
    borderRadius: THEME.radii.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    maxWidth: 400,
    width: '100%',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.urgentBg,
    borderWidth: 1,
    borderColor: THEME.colors.urgentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  badgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.urgent,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: THEME.colors.teal,
    minHeight: 48,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
    width: '100%',
  },
  retryText: {
    color: THEME.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
