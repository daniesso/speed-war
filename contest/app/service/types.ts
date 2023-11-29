import { SubmissionLang } from "~/models/submission.server";

export type TestResultType =
  | "success"
  | "build_error"
  | "prelim_tests_incorrect"
  | "prelim_tests_error"
  | "speed_tests_incorrect"
  | "speed_tests_error"
  | "internal_server_error";

interface ITestResult {
  type: TestResultType;
}

export interface TestResultSuccess extends ITestResult {
  type: "success";
  scoreMs: number | null;
  scoreJ: number | null;
}

export interface TestResultPrelimTestsIncorrect extends ITestResult {
  type: "prelim_tests_incorrect";
}

export interface TestResultPrelimTestsError extends ITestResult {
  type: "prelim_tests_error";
  error: string;
}

export interface TestResultBuildError extends ITestResult {
  type: "build_error";
  error: string;
}

export interface TestResultSpeedTestsIncorrect extends ITestResult {
  type: "speed_tests_incorrect";
}

export interface TestResultSpeedTestsError extends ITestResult {
  type: "speed_tests_error";
  error: string;
}

export interface TestResultServerError extends ITestResult {
  type: "internal_server_error";
  error: string;
}

export type TestResult =
  | TestResultSuccess
  | TestResultBuildError
  | TestResultPrelimTestsIncorrect
  | TestResultPrelimTestsError
  | TestResultSpeedTestsIncorrect
  | TestResultSpeedTestsError
  | TestResultServerError;

export interface ITestExecutor {
  runTests(
    problem: number,
    lang: SubmissionLang,
    submissionData: Buffer,
  ): Promise<TestResult>;
}
