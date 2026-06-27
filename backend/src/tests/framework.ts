export interface TestCase {
    name: string;
    run: () => void | Promise<void>;
}

export interface TestSuite {
    name: string;
    tests: TestCase[];
}

export const createSuite = (name: string, tests: TestCase[]): TestSuite => ({
    name,
    tests,
});
