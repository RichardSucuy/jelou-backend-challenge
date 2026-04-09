module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'], // 👈 SOLO archivos .test.js
};