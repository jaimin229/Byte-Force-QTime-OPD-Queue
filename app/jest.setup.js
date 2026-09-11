/* eslint-env jest */
const mockStorage = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k, v) => {
    mockStorage[k] = v;
    return Promise.resolve(null);
  }),
  getItem: jest.fn(k => Promise.resolve(mockStorage[k] || null)),
  removeItem: jest.fn(k => {
    delete mockStorage[k];
    return Promise.resolve(null);
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    return Promise.resolve(null);
  }),
}));

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  displayNotification: jest.fn(),
  getNotificationSettings: jest.fn().mockResolvedValue({authorizationStatus: 1}),
  AndroidImportance: {HIGH: 4},
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');
