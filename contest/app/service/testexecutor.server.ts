import fs from "fs/promises";
import path from "node:path";

import decompress from "decompress";
import invariant from "tiny-invariant";
import tmp from "tmp-promise";

import { SubmissionLang } from "~/models/submission.server";

import {
  CLIOutput,
  CLITestResults,
  SpeedWarCLIWrapper,
  isBuildError,
  isBuildTimeout,
  isCLITestRunResultCorrect,
  isTestResults,
  isTestTimeout,
} from "./speedwarcliwrapper.server";
import {
  ITestExecutor,
  TestResult,
  TestResultPrelimTestsError,
  TestResultPrelimTestsIncorrect,
  TestResultServerError,
} from "./types";

export class TestExecutor implements ITestExecutor {
  basePath: string;
  cli: SpeedWarCLIWrapper;
  constructor(basePath: string) {
    this.basePath = basePath;
    this.cli = new SpeedWarCLIWrapper(path.join(basePath, "cli"));
  }

  async runTests(
    problem: number,
    lang: SubmissionLang,
    submissionData: Buffer,
  ): Promise<TestResult> {
    const tmpDir = await tmp.dir();

    try {
      return await this.runTestsInContext(
        problem,
        lang,
        submissionData,
        tmpDir.path,
      );
    } finally {
      await fs.rm(tmpDir.path, {
        force: true,
        recursive: true,
      });
    }
  }

  async runTestsInContext(
    problem: number,
    lang: SubmissionLang,
    submissionData: Buffer,
    contextPath: string,
  ): Promise<TestResult> {
    await this.prepareContext(contextPath, submissionData);

    const prelimResults = await this.runPrelimTests(problem, lang, contextPath);

    if (prelimResults) {
      return prelimResults;
    }

    return this.runSecretTests(problem, lang, contextPath);
  }

  async runPrelimTests(
    problem: number,
    lang: SubmissionLang,
    contextPath: string,
  ): Promise<TestResult | null> {
    return this.doWithTestsInContext(
      contextPath,
      problem,
      "tests",
      async () => {
        try {
          const prelimResult = await this.cli.run(lang, contextPath);

          if (
            isTestResults(prelimResult) &&
            prelimResult.TestResults.verdict == "Accepted"
          ) {
            return null;
          } else {
            return this.prelimFailure(prelimResult);
          }
        } catch (error) {
          const errorMessage = `Executing tests using CLI failed: ${error}`;
          console.error(errorMessage);

          return {
            type: "internal_server_error",
            error: errorMessage,
          } satisfies TestResultServerError;
        }
      },
    );
  }

  async runSecretTests(
    problem: number,
    lang: SubmissionLang,
    contextPath: string,
  ): Promise<TestResult> {
    return this.doWithTestsInContext(
      contextPath,
      problem,
      "secret_tests",
      async () => {
        try {
          const secretTestsCliOutput = await this.cli.run(lang, contextPath);

          if (
            isTestResults(secretTestsCliOutput) &&
            secretTestsCliOutput.TestResults.verdict == "Accepted"
          ) {
            const scores = this.aggregateScores(secretTestsCliOutput);
            return {
              type: "success",
              scoreJ: scores.scoreJ,
              scoreMs: scores.scoreMs,
            };
          } else {
            return this.secretTestsFailure(secretTestsCliOutput);
          }
        } catch (error) {
          const errorMessage = `Executing tests using CLI failed: ${error}`;
          console.error(errorMessage);

          return {
            type: "internal_server_error",
            error: errorMessage,
          } satisfies TestResultServerError;
        }
      },
    );
  }

  async prepareContext(contextPath: string, submissionData: Buffer) {
    const zipPath = path.join(contextPath, "submission.zip");
    await fs.writeFile(zipPath, submissionData);

    await decompress(zipPath, contextPath);

    await fs.rm(zipPath);

    // in case tests were bundled with submission, remove them in order to add our own
    await fs.rm(path.join(contextPath, "tests"), {
      recursive: true,
      force: true,
    });
  }

  async doWithTestsInContext<T>(
    contextPath: string,
    problem: number,
    testsFolderName: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const testsTargetPath = path.join(contextPath, "tests");

    await fs.cp(
      path.join(this.basePath, "problems", problem.toString(), testsFolderName),
      testsTargetPath,
      {
        recursive: true,
      },
    );

    const result = await callback();

    await fs.rm(testsTargetPath, {
      recursive: true,
      force: true,
    });

    return result;
  }

  aggregateScores(testResults: CLITestResults) {
    const scores = testResults.TestResults.tests.map((test) => {
      invariant(
        isCLITestRunResultCorrect(test.run_result),
        "Expected all tests to have passed at this point",
      );

      return {
        ms: test.run_result.Correct.stats.time_elapsed_ms,
        j: test.run_result.Correct.stats.energy_consumed_j,
      };
    });

    const scoreMs = scores.map(({ ms }) => ms).reduce((a, b) => a + b, 0);
    const scoreJ = scores.map(({ j }) => j).reduce((a, b) => a + b, 0);

    return {
      scoreMs,
      scoreJ,
    };
  }

  prelimFailure(cliOutput: CLIOutput): TestResult {
    if (
      isTestResults(cliOutput) &&
      cliOutput.TestResults.verdict == "Rejected"
    ) {
      return {
        type: "prelim_tests_incorrect",
      } satisfies TestResultPrelimTestsIncorrect;
    } else if (isBuildError(cliOutput)) {
      return {
        type: "prelim_tests_error",
        error: "Docker build failed",
      } satisfies TestResultPrelimTestsError;
    } else if (isBuildTimeout(cliOutput)) {
      return {
        type: "prelim_tests_error",
        error: "Tests timed out",
      };
    } else if (isTestTimeout(cliOutput)) {
      return {
        type: "prelim_tests_error",
        error: "Tests timeout out",
      };
    }

    return {
      type: "internal_server_error",
      error: `Unrecognized CLI output: ${cliOutput}`,
    };
  }

  secretTestsFailure(cliOutput: CLIOutput): TestResult {
    if (
      isTestResults(cliOutput) &&
      cliOutput.TestResults.verdict == "Rejected"
    ) {
      return {
        type: "speed_tests_incorrect",
      };
    } else if (isBuildError(cliOutput)) {
      return {
        type: "speed_tests_error",
        error: "Docker build failed",
      };
    } else if (isBuildTimeout(cliOutput)) {
      return {
        type: "speed_tests_error",
        error: "Build timed out",
      };
    } else if (isTestTimeout(cliOutput)) {
      return {
        type: "speed_tests_error",
        error: "Tests timeout out",
      };
    } else {
      return {
        type: "internal_server_error",
        error: `Unrecognized CLI output: ${cliOutput}`,
      };
    }
  }
}
