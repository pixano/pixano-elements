module.exports = {
    preset: 'ts-jest',
    globals: {
      'ts-jest': {
        tsConfig: 'tsconfig.json'
      }
    },
    moduleNameMapper: {
      '^@pixano/core(.*)$': '<rootDir>/../packages/core/lib$1',
      '^@pixano/graphics-3d(.*)$': '<rootDir>/../packages/graphics-3d/lib$1'
    }
  };
