module.exports = {
    testEnvironment: 'node', 
    setupFilesAfterEnv: ['./jest.setup.js'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
};
  