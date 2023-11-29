import { Contest } from "@prisma/client";
import invariant from "tiny-invariant";

import { prisma } from "~/db.server";
import { range } from "~/utils";

import { getContest } from "./contest.server";

export class Submissions {
  _contest: Contest;
  _submissionsByTeamAndProblem: Record<number, Record<number, Submission[]>>;

  constructor(contest: Contest, submissions: Submission[]) {
    this._contest = contest;
    this._submissionsByTeamAndProblem = this.prepareTeamProblemMatrix(() => []);

    submissions.forEach((submission) =>
      this._submissionsByTeamAndProblem[submission.teamId][
        submission.problemId
      ].push(submission),
    );
  }

  getContest(): Contest {
    return this._contest;
  }

  teamsRange(): number[] {
    return range(1, this._contest.numTeams);
  }

  teamsProblemsRange(): [number, number][] {
    const teams = this.teamsRange();
    const problems = this.problemsRange();

    return teams.flatMap((team) =>
      problems.map((problem) => [team, problem] as [number, number]),
    );
  }

  problemsRange(): number[] {
    return range(1, this._contest.numProblems);
  }

  getSubmissions(
    team: number | undefined,
    problem: number | undefined,
  ): Submission[] {
    if (!team) {
      assert(!problem);
      return Object.values(this._submissionsByTeamAndProblem)
        .flatMap((x) => Object.values(x))
        .flat();
    } else if (!problem) {
      return Object.values(this._submissionsByTeamAndProblem[team]).flat();
    }
    return this._submissionsByTeamAndProblem[team][problem];
  }

  getSuccessfulSubmissions(team: number, problem: number): Submission[] {
    return this.getSubmissions(team, problem).filter(
      (sub) => sub.state == "success",
    );
  }

  getSubmissionBestTime(team: number, problem: number): Submission | null {
    return this.getSuccessfulSubmissions(team, problem)
      .filter((sub) => sub.scoreMs != null)
      .reduce(
        (a, b) => (a == null || b.scoreMs! < a.scoreMs! ? b : a),
        null as Submission | null,
      );
  }

  getSubmissionBestEnergy(team: number, problem: number): Submission | null {
    return this.getSuccessfulSubmissions(team, problem)
      .filter((sub) => sub.scoreJ != null)
      .reduce(
        (a, b) => (a == null || b.scoreJ! < a.scoreJ! ? b : a),
        null as Submission | null,
      );
  }

  getScoreTable(): Record<
    number,
    Record<number, { scoreMs: number | null; scoreJ: number | null }>
  > {
    const scoreTable = this.prepareTeamProblemMatrix(
      () =>
        ({ scoreMs: null, scoreJ: null }) as {
          scoreMs: number | null;
          scoreJ: number | null;
        },
    );

    this.teamsProblemsRange().forEach(
      ([team, problem]) =>
        (scoreTable[team][problem] = {
          scoreJ: this.getSubmissionBestEnergy(team, problem)?.scoreJ ?? null,
          scoreMs: this.getSubmissionBestTime(team, problem)?.scoreMs ?? null,
        }),
    );

    return scoreTable;
  }

  prepareTeamProblemMatrix<T>(
    initial: () => T,
  ): Record<number, Record<number, T>> {
    const matrix: Record<number, Record<number, T>> = {};

    this.teamsProblemsRange().forEach(([team, problem]) => {
      matrix[team] = matrix[team] ?? {};
      matrix[team][problem] = matrix[team][problem] ?? initial();
    });

    return matrix;
  }
}

const SelectSubmissionDefaultFields = {
  id: true,
  state: true,
  submittedAt: true,
  scoreMs: true,
  scoreJ: true,
  teamId: true,
  problemId: true,
  lang: true,
  submissionData: false,
};
export async function getSubmissions(
  team: number | undefined = undefined,
): Promise<Submissions | null> {
  const contest = await getContest();
  if (!contest) {
    return null;
  }

  const submissions = await prisma.submission
    .findMany({
      select: SelectSubmissionDefaultFields,
      where: {
        teamId: team,
      },
    })
    .then((submissions) => submissions.map(mapDefaultSubmission));

  return new Submissions(contest, submissions);
}

export async function getTeamSubmissionsSortedByRecency(
  team: number,
  problem: number | undefined = undefined,
): Promise<Submission[] | null> {
  const submissions = await getSubmissions(team);

  return (
    submissions
      ?.getSubmissions(team, problem)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()) ?? null
  );
}

export type SubmissionState = "queued" | "success" | "failure" | "running";
export type SubmissionLang = "rust";

const isSubmissionState = (value: unknown): value is SubmissionState => {
  return (
    typeof value == "string" &&
    ["queued", "success", "failure", "running"].includes(value)
  );
};

export const SUBMISSION_LANGUAGES = ["rust"];

export const isSubmissionLang = (value: unknown): value is SubmissionLang =>
  typeof value === "string" && SUBMISSION_LANGUAGES.includes(value);

export interface Submission {
  id: string;
  state: SubmissionState;
  submittedAt: Date;
  scoreMs: number | null;
  scoreJ: number | null;
  teamId: number;
  problemId: number;
  lang: SubmissionLang;
}

function mapDefaultSubmission(
  submission: Omit<Omit<Submission, "state">, "lang"> & {
    state: string;
    lang: string;
  },
): Submission {
  const submissionState = submission.state;
  const lang = submission.lang;
  invariant(
    isSubmissionState(submissionState),
    `invalid submission state ${submissionState}`,
  );

  invariant(isSubmissionLang(lang), `invalid submission language ${lang}`);

  return {
    ...submission,
    state: submissionState,
    lang: lang,
    scoreJ: submission.scoreJ ? Number(submission.scoreJ.toFixed(1)) : null,
  };
}

export async function createSubmission(
  team: number,
  problem: number,
  lang: SubmissionLang,
  submissionData: ArrayBuffer,
): Promise<Submission> {
  const submission = await prisma.submission.create({
    data: {
      state: "queued",
      teamId: team,
      problemId: problem,
      lang: lang,
      submissionData: Buffer.from(submissionData),
      scoreJ: null,
      scoreMs: null,
    },
    select: SelectSubmissionDefaultFields,
  });

  return mapDefaultSubmission(submission);
}

export async function deleteSubmission(submissionId: string) {
  await prisma.submission.delete({
    where: {
      id: submissionId,
    },
  });
}

export async function getNextEligibleSubmission(
  team: number,
): Promise<Submission | null> {
  const nextSubmission = await prisma.submission.findFirst({
    select: SelectSubmissionDefaultFields,
    where: {
      teamId: team,
      state: "queued",
    },
    orderBy: {
      submittedAt: "asc",
    },
  });

  return nextSubmission ? mapDefaultSubmission(nextSubmission) : null;
}

export async function getHasMoreEligibleSubmissions(): Promise<boolean> {
  const nextSubmission = await prisma.submission.findFirst({
    select: { id: true },
    where: {
      state: "queued",
    },
  });

  return !!nextSubmission;
}

export async function getSubmissionData(submissionId: string): Promise<Buffer> {
  const result = await prisma.submission.findFirst({
    select: {
      submissionData: true,
    },
    where: {
      id: submissionId,
    },
  });

  invariant(!!result, "Expected submission to exist here");

  return result?.submissionData;
}

export async function updateSubmission({
  submissionId,
  state,
  scoreJ,
  scoreMs,
}: {
  submissionId: string;
  state: SubmissionState;
  scoreJ: number | null;
  scoreMs: number | null;
}): Promise<Submission> {
  const submission = await prisma.submission.update({
    data: {
      state: state,
      scoreJ: scoreJ,
      scoreMs: scoreMs,
    },
    select: SelectSubmissionDefaultFields,
    where: { id: submissionId },
  });

  return mapDefaultSubmission(submission);
}

export async function updateSubmissionState(
  submissionId: string,
  state: SubmissionState,
): Promise<Submission> {
  const submission = await prisma.submission.update({
    data: {
      state: state,
    },
    select: SelectSubmissionDefaultFields,
    where: { id: submissionId },
  });

  return mapDefaultSubmission(submission);
}

export async function getRunningSubmission(): Promise<Submission | null> {
  const submission = await prisma.submission.findFirst({
    select: SelectSubmissionDefaultFields,
    where: { state: "running" },
  });

  return submission ? mapDefaultSubmission(submission) : null;
}
