import '@testing-library/jest-dom';

// Mock window.location methods
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    origin: 'http://localhost:3000',
    replace: jest.fn(),
    assign: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
});

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    go: jest.fn(),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock crypto for generateState function
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      digest: jest.fn().mockImplementation(() => {
        return Promise.resolve(new ArrayBuffer(32));
      })
    }
  },
});

// Mock TextEncoder/TextDecoder for Node environment
import { TextEncoder, TextDecoder } from 'util';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock btoa/atob for Node environment
global.btoa = jest.fn().mockImplementation((str: string) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn().mockImplementation((str: string) => Buffer.from(str, 'base64').toString('binary'));

// Mock URLSearchParams
const mockURLSearchParams = jest.fn().mockImplementation(() => ({
  get: jest.fn(),
  has: jest.fn(),
  append: jest.fn(),
  toString: jest.fn().mockReturnValue('')
}));

(global as any).URLSearchParams = mockURLSearchParams;

// Mock setInterval/clearInterval
global.setInterval = jest.fn();
global.clearInterval = jest.fn();

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});
