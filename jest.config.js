module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': [
      'babel-jest',
      {
        plugins: [
          '@babel/plugin-transform-modules-commonjs',
          '@babel/plugin-transform-react-jsx',
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)',
  ],
};
