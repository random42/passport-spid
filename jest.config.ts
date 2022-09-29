import type { Config } from 'jest';

export default async (): Promise<Config> => {
  return {
    testEnvironment: 'node',
    verbose: true,
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
      '^.+\\.(t|j)s$': 'ts-jest',
    },
    // {
    //   '/^@core/(.*)$/': 'core/$1',
    // },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: './coverage',
  };
};
