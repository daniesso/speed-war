import invariant from "tiny-invariant";

import { TestExecutor } from "./testexecutor.server";
import { TestScheduler } from "./testscheduler.server";

const basePath = process.env.REPO_BASE_PATH;

invariant(basePath, "REPO_BASE_PATH environment variable must be set");

const testExecutor = new TestExecutor(basePath);

export const TestRunner = new TestScheduler(testExecutor);
