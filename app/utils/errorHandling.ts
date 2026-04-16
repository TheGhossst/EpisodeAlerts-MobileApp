import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

export type AppErrorKind =
  | 'network'
  | 'api'
  | 'firebase'
  | 'permission'
  | 'storage'
  | 'validation'
  | 'unknown';

interface ErrorMapping {
  kind: AppErrorKind;
  message: string;
  isRetryable: boolean;
}

const DEFAULT_FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_FALLBACK_MESSAGE =
  'Network connection issue. Check your internet and try again.';

const FIREBASE_ERROR_MAP: Record<string, ErrorMapping> = {
  'auth/email-already-in-use': {
    kind: 'firebase',
    message: 'This email is already in use. Try signing in instead.',
    isRetryable: false,
  },
  'auth/invalid-email': {
    kind: 'validation',
    message: 'Enter a valid email address and try again.',
    isRetryable: false,
  },
  'auth/weak-password': {
    kind: 'validation',
    message: 'Use a stronger password with at least 6 characters.',
    isRetryable: false,
  },
  'auth/user-not-found': {
    kind: 'firebase',
    message: 'No account was found for this email.',
    isRetryable: false,
  },
  'auth/wrong-password': {
    kind: 'firebase',
    message: 'Incorrect password. Please try again.',
    isRetryable: true,
  },
  'auth/invalid-credential': {
    kind: 'firebase',
    message: 'Invalid email or password. Please try again.',
    isRetryable: true,
  },
  'auth/invalid-login-credentials': {
    kind: 'firebase',
    message: 'Invalid email or password. Please try again.',
    isRetryable: true,
  },
  'auth/user-disabled': {
    kind: 'firebase',
    message: 'This account has been disabled. Contact support if needed.',
    isRetryable: false,
  },
  'auth/too-many-requests': {
    kind: 'firebase',
    message: 'Too many attempts. Please wait and try again shortly.',
    isRetryable: true,
  },
  'auth/network-request-failed': {
    kind: 'network',
    message: NETWORK_FALLBACK_MESSAGE,
    isRetryable: true,
  },
  'auth/operation-not-allowed': {
    kind: 'firebase',
    message: 'This sign-in method is not enabled for the project.',
    isRetryable: false,
  },
  'permission-denied': {
    kind: 'permission',
    message: 'You do not have permission to perform this action.',
    isRetryable: false,
  },
  unavailable: {
    kind: 'network',
    message: NETWORK_FALLBACK_MESSAGE,
    isRetryable: true,
  },
  'failed-precondition': {
    kind: 'firebase',
    message: 'Service is not ready right now. Please try again.',
    isRetryable: true,
  },
};

const HTTP_STATUS_MAP: Record<number, ErrorMapping> = {
  400: {
    kind: 'api',
    message: 'Invalid request. Please check your input and try again.',
    isRetryable: false,
  },
  401: {
    kind: 'permission',
    message: 'Your session is not authorized. Please sign in again.',
    isRetryable: false,
  },
  403: {
    kind: 'permission',
    message: 'Access denied for this action.',
    isRetryable: false,
  },
  404: {
    kind: 'api',
    message: 'Requested data was not found.',
    isRetryable: false,
  },
  408: {
    kind: 'network',
    message: NETWORK_FALLBACK_MESSAGE,
    isRetryable: true,
  },
  409: {
    kind: 'api',
    message: 'Request conflict detected. Please retry.',
    isRetryable: true,
  },
  422: {
    kind: 'validation',
    message: 'Submitted data is invalid. Please review and try again.',
    isRetryable: false,
  },
  429: {
    kind: 'api',
    message: 'Too many requests. Please wait a bit and retry.',
    isRetryable: true,
  },
  500: {
    kind: 'api',
    message: 'Server error. Please try again shortly.',
    isRetryable: true,
  },
  502: {
    kind: 'api',
    message: 'Server is temporarily unavailable. Please retry soon.',
    isRetryable: true,
  },
  503: {
    kind: 'api',
    message: 'Service is unavailable right now. Please retry shortly.',
    isRetryable: true,
  },
  504: {
    kind: 'api',
    message: 'Server timed out. Please retry.',
    isRetryable: true,
  },
};

const FIREBASE_CODE_PREFIXES = ['auth/', 'firestore/', 'functions/', 'storage/'];

export class AppError extends Error {
  public readonly kind: AppErrorKind;
  public readonly code: string | null;
  public readonly statusCode: number | null;
  public readonly technicalMessage: string;
  public readonly isRetryable: boolean;
  public readonly source: string;
  public readonly originalError: unknown;

  constructor(params: {
    message: string;
    kind: AppErrorKind;
    source: string;
    technicalMessage: string;
    code?: string | null;
    statusCode?: number | null;
    isRetryable?: boolean;
    originalError?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.kind = params.kind;
    this.source = params.source;
    this.code = params.code ?? null;
    this.statusCode = params.statusCode ?? null;
    this.technicalMessage = params.technicalMessage;
    this.isRetryable = params.isRetryable ?? true;
    this.originalError = params.originalError;
  }
}

function includesAny(value: string, tokens: string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (!error) {
    return 'Unknown error';
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseHttpStatusFromMessage(message: string): number | null {
  const statusMatch = message.match(/status\s*[:=]\s*(\d{3})/i);
  if (!statusMatch) {
    return null;
  }

  const parsed = Number(statusMatch[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHttpStatusCode(error: unknown, technicalMessage: string): number | null {
  if (error && typeof error === 'object') {
    const record = error as { status?: unknown; statusCode?: unknown };
    if (typeof record.status === 'number') {
      return record.status;
    }

    if (typeof record.statusCode === 'number') {
      return record.statusCode;
    }
  }

  return parseHttpStatusFromMessage(technicalMessage);
}

function isFirebaseErrorCode(code: string | null): boolean {
  if (!code) {
    return false;
  }

  if (FIREBASE_ERROR_MAP[code]) {
    return true;
  }

  return FIREBASE_CODE_PREFIXES.some((prefix) => code.startsWith(prefix));
}

function isNetworkError(code: string | null, technicalMessage: string): boolean {
  if (code === 'auth/network-request-failed') {
    return true;
  }

  const message = technicalMessage.toLowerCase();
  return includesAny(message, [
    'network request failed',
    'networkerror',
    'failed to fetch',
    'timeout',
    'timed out',
    'unable to resolve host',
    'socket',
    'offline',
    'internet',
  ]);
}

function isStorageError(technicalMessage: string): boolean {
  const message = technicalMessage.toLowerCase();
  return includesAny(message, [
    'asyncstorage',
    'storage',
    'cache',
    'disk',
    'quota',
  ]);
}

function isPermissionError(technicalMessage: string): boolean {
  const message = technicalMessage.toLowerCase();
  return includesAny(message, [
    'permission',
    'not allowed',
    'denied',
    'unauthorized',
    'forbidden',
  ]);
}

function isValidationError(technicalMessage: string): boolean {
  const message = technicalMessage.toLowerCase();
  return includesAny(message, ['invalid', 'required', 'missing', 'malformed']);
}

export function normalizeAppError(
  error: unknown,
  options?: { source?: string; fallbackMessage?: string },
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const source = options?.source || 'Unknown';
  const fallbackMessage = options?.fallbackMessage || DEFAULT_FALLBACK_MESSAGE;
  const technicalMessage = getErrorMessage(error);
  const code = getErrorCode(error);
  const statusCode = getHttpStatusCode(error, technicalMessage);

  if (code && FIREBASE_ERROR_MAP[code]) {
    const mapped = FIREBASE_ERROR_MAP[code];
    return new AppError({
      message: mapped.message,
      kind: mapped.kind,
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: mapped.isRetryable,
      originalError: error,
    });
  }

  if (code && isFirebaseErrorCode(code)) {
    return new AppError({
      message: fallbackMessage,
      kind: 'firebase',
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: true,
      originalError: error,
    });
  }

  if (statusCode && HTTP_STATUS_MAP[statusCode]) {
    const mapped = HTTP_STATUS_MAP[statusCode];
    return new AppError({
      message: mapped.message,
      kind: mapped.kind,
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: mapped.isRetryable,
      originalError: error,
    });
  }

  if (statusCode && statusCode >= 500) {
    return new AppError({
      message: 'Server error. Please try again shortly.',
      kind: 'api',
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: true,
      originalError: error,
    });
  }

  if (isNetworkError(code, technicalMessage)) {
    return new AppError({
      message: NETWORK_FALLBACK_MESSAGE,
      kind: 'network',
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: true,
      originalError: error,
    });
  }

  if (isStorageError(technicalMessage)) {
    return new AppError({
      message: 'Local storage is temporarily unavailable. Please try again.',
      kind: 'storage',
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: true,
      originalError: error,
    });
  }

  if (isPermissionError(technicalMessage)) {
    return new AppError({
      message: 'Permission denied for this action.',
      kind: 'permission',
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: false,
      originalError: error,
    });
  }

  if (isValidationError(technicalMessage)) {
    return new AppError({
      message: fallbackMessage,
      kind: 'validation',
      source,
      technicalMessage,
      code,
      statusCode,
      isRetryable: false,
      originalError: error,
    });
  }

  return new AppError({
    message: fallbackMessage,
    kind: 'unknown',
    source,
    technicalMessage,
    code,
    statusCode,
    isRetryable: true,
    originalError: error,
  });
}

interface ReportErrorOptions {
  fallbackMessage?: string;
  trackAnalytics?: boolean;
  metadata?: Record<string, unknown>;
}

async function trackError(appError: AppError, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const { default: AnalyticsService } = await import('@/app/services/AnalyticsService');
    await AnalyticsService.trackError(appError.technicalMessage, {
      source: appError.source,
      kind: appError.kind,
      code: appError.code,
      statusCode: appError.statusCode,
      isRetryable: appError.isRetryable,
      ...(metadata || {}),
    });
  } catch {
    // Ignore analytics reporting failures so error handling never fails.
  }
}

export function reportError(
  source: string,
  error: unknown,
  options?: ReportErrorOptions,
): AppError {
  const appError = normalizeAppError(error, {
    source,
    fallbackMessage: options?.fallbackMessage,
  });

  console.error(`[${source}] ${appError.technicalMessage}`, {
    kind: appError.kind,
    code: appError.code,
    statusCode: appError.statusCode,
    isRetryable: appError.isRetryable,
  });

  if (options?.trackAnalytics !== false) {
    void trackError(appError, options?.metadata);
  }

  return appError;
}

interface UserFeedbackOptions extends ReportErrorOptions {
  title?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
  autoHide?: boolean;
}

export function showErrorToast(
  source: string,
  error: unknown,
  options?: UserFeedbackOptions,
): AppError {
  const appError = reportError(source, error, {
    fallbackMessage: options?.fallbackMessage,
    metadata: options?.metadata,
    trackAnalytics: options?.trackAnalytics,
  });

  Toast.show({
    type: 'error',
    text1: options?.title || 'Error',
    text2: appError.message,
    position: options?.position || 'bottom',
    visibilityTime: options?.visibilityTime ?? 3500,
    autoHide: options?.autoHide ?? true,
  });

  return appError;
}

export function showErrorAlert(
  source: string,
  error: unknown,
  options?: UserFeedbackOptions,
): AppError {
  const appError = reportError(source, error, {
    fallbackMessage: options?.fallbackMessage,
    metadata: options?.metadata,
    trackAnalytics: options?.trackAnalytics,
  });

  Alert.alert(options?.title || 'Error', appError.message);
  return appError;
}

export function getUserErrorMessage(
  error: unknown,
  fallbackMessage = DEFAULT_FALLBACK_MESSAGE,
): string {
  return normalizeAppError(error, { fallbackMessage }).message;
}

export function getFirebaseErrorCode(error: unknown): string | null {
  const code = getErrorCode(error);
  if (!code) {
    return null;
  }

  return isFirebaseErrorCode(code) ? code : null;
}
