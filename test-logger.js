import { apiLogger, analyticsLogger, uiLogger, eventLogger } from './app/services/loggerService.js';

// Test different logger types
console.log('\n--- Testing component loggers ---');
apiLogger.info('API logger test info message');
apiLogger.warn('API logger test warning message');
apiLogger.error('API logger test error message');

analyticsLogger.info('Analytics logger test info message');
uiLogger.debug('UI logger test debug message');

// Test event logger
console.log('\n--- Testing event logger ---');
eventLogger.trackAPICall('/api/test', 150, 200, { test: 'metadata' });
eventLogger.trackExport('csv', 1024, 300, { filename: 'test.csv' });
eventLogger.trackFeatureUsage('test-feature', 'session-123');

// Test error tracking
console.log('\n--- Testing error tracking ---');
const testError = new Error('Test error');
testError.stack = 'Simulated stack trace';
eventLogger.trackError(testError, 'test-context', { extra: 'metadata' });
