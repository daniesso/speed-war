import { exec } from "child_process";

import invariant from "tiny-invariant";

import { SubmissionLang } from "~/models/submission.server";

export class SpeedWarCLIWrapper {
  cliBasePath: string;
  energyMeasurementWsURL: string | null;

  constructor(cliBasePath: string, energyMeasurementWsURL: string | null) {
    this.cliBasePath = cliBasePath;
    this.energyMeasurementWsURL = energyMeasurementWsURL;
  }

  async run(lang: SubmissionLang, contextDir: string): Promise<CLIOutput> {
    const wsUrlEnvVar = this.energyMeasurementWsURL
      ? `ENERGY_MONITOR_WS_URL=${this.energyMeasurementWsURL}`
      : "";
    const cmd = `cd ${this.cliBasePath} && ${
      wsUrlEnvVar + " "
    }./SpeedWarCLI ${lang} ${contextDir}`;

    return new Promise((resolve, reject) =>
      exec(cmd, (error, stdout, stderr) => {
        if (stderr) {
          console.error(stderr);
        }
        if (error) {
          reject(error);
        } else {
          try {
            const parsed = JSON.parse(stdout);

            invariant(isCLIOutput(parsed), "Unrecognized CLI output");

            resolve(parsed);
          } catch (error) {
            reject(
              `An unhandled error occured while trying to parse json from CLI: ${error}. Output was: ${stdout}`,
            );
          }
        }
      }),
    );
  }
}

interface CLITestRunResultCorrect {
  Correct: {
    stats: {
      time_elapsed_ms: number;
      energy_consumed_j: number | null;
    };
  };
}

interface CLITestRunResultIncorrect {
  Incorrect: Record<string, string>;
}

interface CLITestRunResultError {
  TestError: {
    error: string;
  };
}

export const isCLITestRunResultCorrect = (
  value: CLITestRunResult,
): value is CLITestRunResultCorrect => {
  return "Correct" in value;
};

type CLITestRunResult =
  | CLITestRunResultCorrect
  | CLITestRunResultIncorrect
  | CLITestRunResultError;

interface CLITestResult {
  test_number: number;
  run_result: CLITestRunResult;
}

interface CLIInternalError {
  InternalError: {
    error: string;
  };
}

interface CLIBuildError {
  BuildError: {
    error: string;
  };
}

interface CLIBuildTimeout {
  BuildTimeout: {
    error: string;
  };
}

interface CLITestTimeout {
  TestTimeout: {
    error: string;
  };
}

export interface CLITestResults {
  TestResults: {
    verdict: "Accepted" | "Rejected";
    tests: CLITestResult[];
  };
}

export type CLIOutput =
  | CLIBuildError
  | CLIBuildTimeout
  | CLITestTimeout
  | CLITestResults;

export const isTestResults = (value: unknown): value is CLITestResults => {
  return !!value && typeof value == "object" && "TestResults" in value;
};

export const isTestTimeout = (value: unknown): value is CLITestTimeout => {
  return !!value && typeof value == "object" && "TestTimeout" in value;
};

export const isBuildTimeout = (value: unknown): value is CLIBuildTimeout => {
  return !!value && typeof value == "object" && "BuildTimeout" in value;
};

export const isBuildError = (value: unknown): value is CLIBuildError => {
  return !!value && typeof value == "object" && "BuildError" in value;
};

export const isInternalError = (value: unknown): value is CLIInternalError => {
  return !!value && typeof value == "object" && "InternalError" in value;
};

export const isCLIOutput = (value: unknown): value is CLIOutput => {
  return (
    isTestResults(value) ||
    isTestTimeout(value) ||
    isBuildTimeout(value) ||
    isBuildError(value) ||
    isInternalError(value)
  );
};
