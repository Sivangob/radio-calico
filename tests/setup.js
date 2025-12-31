// Global test setup and configuration

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  generateRandomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  }
};

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Cleanup after all tests
afterAll(async () => {
  // Add any global cleanup here
});
