import { TestExecutor } from "./testexecutor.server";
import { TestScheduler } from "./testscheduler.server";

const basePath = "/Users/danielsolberg/projects/bekk/lowlevel/speed-war";

const testExecutor = new TestExecutor(basePath);

export const TestRunner = new TestScheduler(testExecutor);
