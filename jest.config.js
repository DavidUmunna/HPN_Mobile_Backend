module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  transform: {},
  reporters:[
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }],
    ['jest-html-reporter', {
      pageTitle: 'Test Report',
      outputPath: 'test-results/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true,
    }],
  ]
};
