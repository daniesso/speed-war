import { Contest, Submission } from "@prisma/client";

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

  getSubmissions(team: number, problem: number): Submission[] {
    return this._submissionsByTeamAndProblem[team][problem];
  }

  getSuccessfulSubmissions(team: number, problem: number): Submission[] {
    return this.getSubmissions(team, problem).filter(
      (sub) => sub.state == "success",
    );
  }

  getSubmissionBestTime(team: number, problem: number): Submission | null {
    return this.getSuccessfulSubmissions(team, problem).reduce(
      (a, b) => (a == null || b.scoreMs < a.scoreMs ? b : a),
      null as Submission | null,
    );
  }

  getSubmissionBestEnergy(team: number, problem: number): Submission | null {
    return this.getSuccessfulSubmissions(team, problem).reduce(
      (a, b) => (a == null || b.scoreJ < a.scoreJ ? b : a),
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

export async function getSubmissions(): Promise<Submissions | null> {
  const contest = await getContest();
  if (!contest) {
    return null;
  }

  const submissions = await prisma.submission.findMany();

  return new Submissions(contest, submissions);
}
