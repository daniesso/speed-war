import invariant from "tiny-invariant";

import { prisma } from "~/db.server";
import { TestResult } from "~/service/types";
import { range } from "~/utils";

import { Contest, getContest } from "./contest.server";
import { getContestTeam } from "./team.server";
import { ContestTeam } from "./user.server";

type Team = string;
type Problem = number;

export interface IRanking {
  combined: { team: Team; points: number; rank: number }[];
  speed: Record<Problem | "sum", Record<Team, { points: number }>>;
  energy: Record<Problem | "sum", Record<Team, { points: number }>>;
  correctness: Record<Problem | "sum", Record<Team, { points: number }>>;
}

export class Ranking implements IRanking {
  combined: { team: Team; points: number; rank: number }[];
  speed: Record<Problem | "sum", Record<Team, { points: number }>>;
  energy: Record<Problem | "sum", Record<Team, { points: number }>>;
  correctness: Record<Problem | "sum", Record<Team, { points: number }>>;

  constructor(contest: Contest, scoreTable: ScoreTable) {
    this.speed = this.getSpeedPoints(contest, scoreTable);
    this.energy = this.getEnergyPoints(contest, scoreTable);
    this.correctness = this.getCorrectnessPoints(contest, scoreTable);
    this.combined = this.aggregateCombinedPoints(
      contest,
      this.speed,
      this.energy,
      this.correctness,
    );
  }

  private getCorrectnessPoints(
    contest: Contest,
    scoreTable: ScoreTable,
  ): Record<Problem | "sum", Record<Team, { points: number }>> {
    const problemsPoints: Record<
      Problem,
      Record<Team, { points: number }>
    > = Object.fromEntries(
      range(1, contest.numProblems).map((problem) => {
        const pointsByTeam: Record<Team, { points: number }> =
          Object.fromEntries(
            contest.teams.map(
              (team) =>
                [
                  team.teamName,
                  {
                    points:
                      scoreTable[problem][team.teamName].scoreMs != null
                        ? contest.numTeams - 1
                        : 0,
                  },
                ] satisfies [Team, { points: number }],
            ),
          );

        return [problem, pointsByTeam] satisfies [
          Problem,
          Record<Team, { points: number }>,
        ];
      }),
    );

    const sum: Record<Team, { points: number }> = Object.fromEntries(
      contest.teams.map((team) => [
        team.teamName,
        {
          points: range(1, contest.numProblems)
            .map((problem) => problemsPoints[problem][team.teamName].points)
            .reduce((a, b) => a + b, 0),
        },
      ]),
    );

    return {
      ...problemsPoints,
      sum,
    };
  }

  private getEnergyPoints(
    contest: Contest,
    scoreTable: ScoreTable,
  ): Record<Problem | "sum", Record<Team, { points: number }>> {
    const problemsPoints: Record<
      Problem,
      Record<Team, { points: number }>
    > = Object.fromEntries(
      range(1, contest.numProblems).map((problem) => {
        const teamsEnergyScore = contest.teams.map(
          (team) =>
            ({
              team: team.teamName,
              points:
                scoreTable[problem][team.teamName]?.scoreJ != null
                  ? scoreTable[problem][team.teamName].scoreJ!
                  : Number.MAX_VALUE,
            }) satisfies { team: Team; points: number },
        );

        teamsEnergyScore.sort((a, b) => a.points - b.points);

        const calcPointsByRank = (idx: number): number =>
          idx + 1 < teamsEnergyScore.length &&
          teamsEnergyScore[idx].points == teamsEnergyScore[idx + 1].points
            ? calcPointsByRank(idx + 1)
            : contest.numTeams - 1 - idx;

        const points = Object.fromEntries(
          teamsEnergyScore.map((score, idx) => [
            score.team,
            { points: calcPointsByRank(idx) },
          ]),
        );

        return [problem, points];
      }),
    );

    const sum: Record<Team, { points: number }> = Object.fromEntries(
      contest.teams.map((team) => [
        team.teamName,
        {
          points: range(1, contest.numProblems)
            .map((problem) => problemsPoints[problem][team.teamName].points)
            .reduce((a, b) => a + b, 0),
        },
      ]),
    );

    return {
      ...problemsPoints,
      sum,
    };
  }

  private getSpeedPoints(
    contest: Contest,
    scoreTable: ScoreTable,
  ): Record<Problem | "sum", Record<Team, { points: number }>> {
    const problemsPoints: Record<
      Problem,
      Record<Team, { points: number }>
    > = Object.fromEntries(
      range(1, contest.numProblems).map((problem) => {
        const teamsTimeScore = contest.teams.map(
          (team) =>
            ({
              team: team.teamName,
              points:
                scoreTable[problem][team.teamName]?.scoreMs != null
                  ? scoreTable[problem][team.teamName].scoreMs!
                  : Number.MAX_VALUE,
            }) satisfies { team: Team; points: number },
        );

        teamsTimeScore.sort((a, b) => a.points - b.points);

        const calcPointsByRank = (idx: number): number =>
          idx + 1 < teamsTimeScore.length &&
          teamsTimeScore[idx].points == teamsTimeScore[idx + 1].points
            ? calcPointsByRank(idx + 1)
            : contest.numTeams - 1 - idx;

        const points = Object.fromEntries(
          teamsTimeScore.map((score, idx) => [
            score.team,
            { points: calcPointsByRank(idx) },
          ]),
        );

        return [problem, points];
      }),
    );

    const sum: Record<Team, { points: number }> = Object.fromEntries(
      contest.teams.map((team) => [
        team.teamName,
        {
          points: range(1, contest.numProblems)
            .map((problem) => problemsPoints[problem][team.teamName].points)
            .reduce((a, b) => a + b, 0),
        },
      ]),
    );

    return {
      ...problemsPoints,
      sum,
    };
  }

  private aggregateCombinedPoints(
    contest: Contest,
    speed: Record<Problem | "sum", Record<Team, { points: number }>>,
    energy: Record<Problem | "sum", Record<Team, { points: number }>>,
    correctness: Record<Problem | "sum", Record<Team, { points: number }>>,
  ): { team: Team; points: number; rank: number }[] {
    const combined: { team: Team; points: number }[] = contest.teams.map(
      (team) => ({
        team: team.teamName,
        points:
          speed["sum"][team.teamName].points +
          energy["sum"][team.teamName].points +
          correctness["sum"][team.teamName].points,
      }),
    );

    combined.sort((a, b) => b.points - a.points);

    return combined.map((teamCombined, idx) => ({
      ...teamCombined,
      rank: idx + 1,
    }));
  }
}

export type ScoreTable = Record<
  Problem,
  Record<Team, { scoreMs: number | null; scoreJ: number | null }>
>;

export class Submissions {
  _contest: Contest;
  _submissionsByProblemAndTeam: Record<Problem, Record<Team, Submission[]>>;

  constructor(contest: Contest, submissions: Submission[]) {
    this._contest = contest;
    this._submissionsByProblemAndTeam = this.prepareTeamProblemMatrix(() => []);

    submissions.forEach((submission) =>
      this._submissionsByProblemAndTeam[submission.problemId][
        submission.team.teamName
      ].push(submission),
    );
  }

  getContest(): Contest {
    return this._contest;
  }

  calculateRanking(): Ranking {
    return new Ranking(this._contest, this.getScoreTable());
  }

  problemsTeamsRange(): [Problem, ContestTeam][] {
    const problems = this.problemsRange();

    return problems.flatMap((problem) =>
      this._contest.teams.map(
        (team) => [problem, team] as [number, ContestTeam],
      ),
    );
  }

  problemsRange(): number[] {
    return range(1, this._contest.numProblems);
  }

  getSubmissions(
    problem: number | undefined,
    team: Team | undefined,
  ): Submission[] {
    if (problem) {
      if (team) {
        return this._submissionsByProblemAndTeam[problem][team];
      } else {
        return Object.values(this._submissionsByProblemAndTeam[problem]).flat();
      }
    } else {
      if (team) {
        return Object.values(this._submissionsByProblemAndTeam)
          .flatMap((problem) => problem[team])
          .flat();
      } else {
        return Object.values(this._submissionsByProblemAndTeam)
          .flatMap((x) => Object.values(x))
          .flat();
      }
    }
  }

  getSuccessfulSubmissions(problem: Problem, team: Team): Submission[] {
    return this.getSubmissions(problem, team).filter(
      (sub) => sub.state == "success",
    );
  }

  getSubmissionBestTime(problem: number, team: Team): Submission | null {
    return this.getSuccessfulSubmissions(problem, team)
      .filter((sub) => sub.scoreMs != null)
      .reduce(
        (a, b) => (a == null || b.scoreMs! < a.scoreMs! ? b : a),
        null as Submission | null,
      );
  }

  getSubmissionBestEnergy(problem: Problem, team: Team): Submission | null {
    return this.getSuccessfulSubmissions(problem, team)
      .filter((sub) => sub.scoreJ != null)
      .reduce(
        (a, b) => (a == null || b.scoreJ! < a.scoreJ! ? b : a),
        null as Submission | null,
      );
  }

  getScoreTable(): ScoreTable {
    const scoreTable = this.prepareTeamProblemMatrix(
      () =>
        ({ scoreMs: null, scoreJ: null }) as {
          scoreMs: number | null;
          scoreJ: number | null;
        },
    );

    this.problemsTeamsRange().forEach(
      ([problem, team]) =>
        (scoreTable[problem][team.teamName] = {
          scoreJ:
            this.getSubmissionBestEnergy(problem, team.teamName)?.scoreJ ??
            null,
          scoreMs:
            this.getSubmissionBestTime(problem, team.teamName)?.scoreMs ?? null,
        }),
    );

    return scoreTable;
  }

  prepareTeamProblemMatrix<T>(
    initial: () => T,
  ): Record<Problem, Record<Team, T>> {
    const matrix: Record<Problem, Record<Team, T>> = {};

    this.problemsTeamsRange().forEach(([problem, team]) => {
      matrix[problem] = matrix[problem] ?? {};
      matrix[problem][team.teamName] =
        matrix[problem][team.teamName] ?? initial();
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
  team: true,
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
  teamNumber: number,
  problem: number | undefined = undefined,
): Promise<Submission[] | null> {
  const team = await getContestTeam(teamNumber);
  if (!team) {
    return null;
  }
  const submissions = await getSubmissions(teamNumber);

  return (
    submissions
      ?.getSubmissions(problem, team.teamName)
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

export interface DBSubmission {
  id: string;
  state: string;
  submittedAt: Date;
  scoreMs: number | null;
  scoreJ: number | null;
  team: {
    id: number;
    teamName: string;
    accessKey: string;
  };
  problemId: number;
  lang: string;
}

export interface Submission {
  id: string;
  state: SubmissionState;
  submittedAt: Date;
  scoreMs: number | null;
  scoreJ: number | null;
  team: ContestTeam;
  problemId: number;
  lang: SubmissionLang;
}

function mapDefaultSubmission(submission: DBSubmission): Submission {
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
    team: mapContestTeam(submission.team),
  };
}

export function mapContestTeam(team: DBSubmission["team"]): ContestTeam {
  return {
    userId: team.id.toString(),
    teamNumber: team.id,
    teamName: team.teamName,
    isAdmin: false,
    accessKey: team.accessKey,
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
  testResult,
}: {
  submissionId: string;
  state: SubmissionState;
  scoreJ: number | null;
  scoreMs: number | null;
  testResult: TestResult;
}): Promise<Submission> {
  const submission = await prisma.submission.update({
    data: {
      state: state,
      scoreJ: scoreJ,
      scoreMs: scoreMs,
      submissionResult: Buffer.from(JSON.stringify(testResult)),
      testsCompletedTime: new Date(Date.now()),
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

export async function getMostRecentlySystemUpdatedSubmission(): Promise<
  (Submission & { testsCompletedTime: Date }) | null
> {
  const submission = await prisma.submission.findFirst({
    select: { ...SelectSubmissionDefaultFields, testsCompletedTime: true },
    where: { testsCompletedTime: { not: null } },
    orderBy: { testsCompletedTime: "desc" },
  });

  return submission
    ? {
        ...mapDefaultSubmission(submission),
        testsCompletedTime: submission.testsCompletedTime!,
      }
    : null;
}

export async function getSubmissionResult(
  submissionId: string,
): Promise<(Submission & { submissionResult: TestResult | null }) | null> {
  const submission = await prisma.submission.findFirst({
    select: {
      ...SelectSubmissionDefaultFields,
      submissionResult: true,
    },
    where: { id: submissionId },
  });

  const submissionResult = submission?.submissionResult?.toString();
  return submission
    ? {
        ...mapDefaultSubmission(submission),
        submissionResult: submissionResult
          ? (JSON.parse(submissionResult) as TestResult)
          : null,
      }
    : null;
}
