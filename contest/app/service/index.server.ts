import invariant from "tiny-invariant";

import { TestExecutor } from "./testexecutor.server";
import { TestScheduler } from "./testscheduler.server";

const basePath = process.env.REPO_BASE_PATH;
const energyMeasurementWsURL = process.env.ENERGY_MONITOR_WS_URL ?? null;

invariant(basePath, "REPO_BASE_PATH environment variable must be set");

const testExecutor = new TestExecutor(basePath, energyMeasurementWsURL);

export const TestRunner = new TestScheduler(testExecutor);
