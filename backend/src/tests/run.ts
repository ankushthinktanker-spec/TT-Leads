import { permissionsSuite } from './permissions.test';
import { queryFiltersSuite } from './queryFilters.test';
import { reportsServiceSuite } from './reports.service.test';
import { runtimeConfigSuite } from './runtime-config.test';
import type { TestSuite } from './framework';

const suites: TestSuite[] = [queryFiltersSuite, permissionsSuite, reportsServiceSuite, runtimeConfigSuite];

const run = async () => {
    let passed = 0;
    let failed = 0;

    for (const suite of suites) {
        console.log(`\n[Suite] ${suite.name}`);

        for (const test of suite.tests) {
            try {
                await test.run();
                passed += 1;
                console.log(`  PASS ${test.name}`);
            } catch (error) {
                failed += 1;
                console.error(`  FAIL ${test.name}`);
                console.error(error);
            }
        }
    }

    console.log(`\nBackend unit tests: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        process.exit(1);
    }
};

void run();
