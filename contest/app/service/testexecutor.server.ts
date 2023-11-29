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
  isError,
  isInternalError,
  isRunResultError,
  isTestResults,
} from "./speedwarcliwrapper.server";
import { ITestExecutor, TestResult, TestResultServerError } from "./types";

export class TestExecutor implements ITestExecutor {
  basePath: string;
  cli: SpeedWarCLIWrapper;
  constructor(basePath: string, energyMeasurementWsURL: string | null) {
    this.basePath = basePath;
    this.cli = new SpeedWarCLIWrapper(
      path.join(basePath, "cli"),
      energyMeasurementWsURL,
    );
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
    const scoreJ = scores
      .map(({ j }) => j)
      .reduce((a, b) => (a == null || b == null ? null : a + b), 0);

    return {
      scoreMs,
      scoreJ,
    };
  }

  prelimFailure(cliOutput: CLIOutput): TestResult {
    return this.mapFailureResponse(cliOutput, true);
  }

  secretTestsFailure(cliOutput: CLIOutput): TestResult {
    return this.mapFailureResponse(cliOutput, false);
  }

  mapFailureResponse(cliOutput: CLIOutput, isPrelimTests: boolean): TestResult {
    if (isTestResults(cliOutput)) {
      invariant(
        cliOutput.TestResults.verdict == "Rejected",
        "Verdict should be Rejected here",
      );

      const testErrors = cliOutput.TestResults.tests
        .map((test) =>
          isRunResultError(test.run_result) ? test.run_result : null,
        )
        .filter((test) => test != null)
        .map((run_result) => run_result!);

      if (testErrors.length > 0) {
        return {
          type: isPrelimTests ? "prelim_tests_error" : "speed_tests_error",
          error: testErrors[0].TestError.error,
        };
      } else {
        return {
          type: isPrelimTests
            ? "prelim_tests_incorrect"
            : "speed_tests_incorrect",
        };
      }
    } else if (isError(cliOutput)) {
      if (isBuildError(cliOutput.Error.error)) {
        return {
          type: "build_error",
          error: cliOutput.Error.error.BuildError.error,
        };
      } else if (isBuildTimeout(cliOutput.Error.error)) {
        return {
          type: "build_error",
          error: "Build timed out",
        };
      } else if (isInternalError(cliOutput.Error.error)) {
        return {
          type: "internal_server_error",
          error: cliOutput.Error.error.InternalError.error,
        };
      }
    }

    return {
      type: "internal_server_error",
      error: `Unrecognized CLI response: ${cliOutput}`,
    };
  }
}
