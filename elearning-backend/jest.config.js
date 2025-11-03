export default {
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  setupFiles: ['dotenv/config']
};