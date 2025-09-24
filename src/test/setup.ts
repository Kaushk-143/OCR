import '@testing-library/jest-dom';

// Mock PDF.js worker
global.URL = global.URL || {};
global.URL.createObjectURL = vi.fn(() => 'mock-url');

// Mock OpenAI API
global.fetch = vi.fn();

// Mock environment variables
process.env.VITE_OPENAI_API_KEY = 'test-key';