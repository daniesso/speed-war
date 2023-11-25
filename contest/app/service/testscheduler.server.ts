import { delay } from "~/utils";

import { getContest, updateNextTeamSubmission } from "../models/contest.server";
import {
  Submission,
  getHasMoreEligibleSubmissions,
  getNextEligibleSubmission,
  getSubmissionData,
  updateSubmission,
  updateSubmissionState,
} from "../models/submission.server";

import { ITestExecutor, TestResult, TestResultServerError } from "./types";

const POLL_PERIOD_MS = 2_000;

export class TestScheduler {
  private testExecutor: ITestExecutor;

  constructor(testExecutor: ITestExecutor) {
    this.testExecutor = testExecutor;
  }

  start() {
    console.log("Starting Test Scheduler");
    this.runForever();
  }

  private async runForever(): Promise<void> {
    return this.run_iteration()
      .finally(() => delay(POLL_PERIOD_MS))
      .finally(() => this.runForever());
  }

  private async run_iteration(): Promise<void> {
    const task = await this.getNextSubmission();
    if (!task) {
      console.log("[TestScheduler] No active contest. Skipping.");
      return;
    }
    const [teamNumber, submission] = task;

    if (submission) {
      await updateSubmissionState(submission.id, "running");
      await this.testSubmission(submission);
    } else {
      console.log(`[TestScheduler] skipping team ${teamNumber}`);
    }

    await this.updateNextTeamPointer();

    if (await this.hasMoreWork()) {
      return this.run_iteration();
    } else {
      ("[TestScheduler] nothing to do");
    }
  }

  private async getNextSubmission(): Promise<
    [number, Submission | null] | null
  > {
    const contest = await getContest();

    if (!contest) {
      return null;
    }

    return [
      contest.nextTeamSubmission,
      await getNextEligibleSubmission(contest.nextTeamSubmission),
    ];
  }

  private async hasMoreWork(): Promise<boolean> {
    return getHasMoreEligibleSubmissions();
  }

  private async updateNextTeamPointer(): Promise<void> {
    const contest = await getContest();

    if (!contest) {
      return;
    }

    const updatedNextTeamSubmission =
      (contest.nextTeamSubmission % contest.numTeams) + 1;

    return updateNextTeamSubmission(updatedNextTeamSubmission);
  }

  // No throw!
  private async testSubmission(submission: Submission): Promise<void> {
    try {
      console.log(
        `[TestScheduler] Running tests for submission ${submission.id}`,
      );
      const submissionData = await getSubmissionData(submission.id);

      const result = await this.testExecutor.runTests(
        submission.problemId,
        submission.lang,
        submissionData,
      );

      await this.storeResult(submission.id, result);
    } catch (ex) {
      console.error("Unexpected test executor error", ex);

      await this.storeResult(submission.id, {
        type: "internal_server_error",
        error: `${ex}`,
      } satisfies TestResultServerError);
    }
  }

  async storeResult(
    submissionId: string,
    testResult: TestResult,
  ): Promise<void> {
    if (testResult.type == "success") {
      await updateSubmission({
        submissionId: submissionId,
        state: "success",
        scoreJ: testResult.scoreJ,
        scoreMs: testResult.scoreMs,
      });
    } else {
      await updateSubmission({
        submissionId: submissionId,
        state: "failure",
        scoreJ: null,
        scoreMs: null,
      });
    }
  }
}
