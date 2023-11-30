import { Contest } from "@prisma/client";
import { Link } from "@remix-run/react";
import { IRanking, ScoreTable } from "~/models/submission.server";
import { range } from "~/utils";
import { H1 } from "./header";
import { Table } from "./table";

export function CombinedScoreTable({ ranking }: { ranking: IRanking }) {
  const columns: React.ReactNode[] = ["Lag", "Poeng"];

  const rows: React.ReactNode[][] = ranking.combined.map((team) => [
    `Lag ${team.team}`,
    team.points,
  ]);

  return (
    <div>
      <H1>Ledertavle</H1>
      <Table headers={columns} rows={rows} />
    </div>
  );
}

export function TimeScoreTable({
  contest,
  ranking,
}: {
  contest: Contest;
  ranking: IRanking;
}) {
  const columns: React.ReactNode[] = [
    "Lag",
    ...range(1, contest.numProblems).map((problem) => (
      <Link to={`problem/${problem}`}>Oppgave {problem}</Link>
    )),
    "Sum",
  ];

  const rows: React.ReactNode[][] = range(1, contest.numTeams).map((team) => [
    `Lag ${team}`,
    ...range(1, contest.numProblems).map(
      (problem) => ranking.speed[problem][team].points,
    ),
    ranking.speed["sum"][team].points,
  ]);

  return (
    <div>
      <H1>Hastighet</H1>
      <Table headers={columns} rows={rows} />
    </div>
  );
}

export function CorrectnessScoreTable({
  contest,
  ranking,
}: {
  contest: Contest;
  ranking: IRanking;
}) {
  const columns: React.ReactNode[] = [
    "Lag",
    ...range(1, contest.numProblems).map((problem) => (
      <Link to={`problem/${problem}`}>Oppgave {problem}</Link>
    )),
    "Sum",
  ];

  const rows: React.ReactNode[][] = range(1, contest.numTeams).map((team) => [
    `Lag ${team}`,
    ...range(1, contest.numProblems).map(
      (problem) => ranking.correctness[problem][team].points,
    ),
    ranking.correctness["sum"][team].points,
  ]);

  return (
    <div>
      <H1>Korrekthet</H1>
      <Table headers={columns} rows={rows} />
    </div>
  );
}

export function EnergyScoreTable({
  contest,
  ranking,
}: {
  contest: Contest;
  ranking: IRanking;
}) {
  const columns: React.ReactNode[] = [
    "Lag",
    ...range(1, contest.numProblems).map((problem) => (
      <Link to={`problem/${problem}`}>Oppgave {problem}</Link>
    )),
    "Sum",
  ];

  const rows: React.ReactNode[][] = range(1, contest.numTeams).map((team) => [
    `Lag ${team}`,
    ...range(1, contest.numProblems).map(
      (problem) => ranking.energy[problem][team].points,
    ),
    ranking.energy["sum"][team].points,
  ]);

  return (
    <div>
      <H1>Energiforbruk</H1>
      <Table headers={columns} rows={rows} />
    </div>
  );
}

export function ProblemScoreTable({
  contest,
  scores,
}: {
  contest: Contest;
  scores: ScoreTable;
}) {
  const columns: React.ReactNode[] = [
    "Lag",
    ...range(1, contest.numProblems).map((problem) => (
      <Link to={`problem/${problem}`}>Oppgave {problem}</Link>
    )),
  ];

  const rows: React.ReactNode[][] = range(1, contest.numTeams).map((team) => [
    `Lag ${team}`,
    ...range(1, contest.numProblems).map((problem) => (
      <div className=" flex flex-row gap-4">
        <p>{scores[problem][team].scoreMs ?? "?"} ms</p>
        <p>{scores[problem][team].scoreJ ?? "?"} J</p>
      </div>
    )),
  ]);

  return (
    <div>
      <H1>Resultater</H1>
      <Table headers={columns} rows={rows} />
    </div>
  );
}
