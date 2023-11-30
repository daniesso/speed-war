import { Contest } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { H1 } from "~/components/header";
import { Table } from "~/components/table";
import { ScoreTable, getSubmissions } from "~/models/submission.server";
import { requireUser } from "~/session.server";
import { range } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const submissions = await getSubmissions();
  const contest = submissions?.getContest();

  const scores = submissions?.getScoreTable();

  const rank = submissions?.calculateRanking();

  return json({ user, scores, contest });
};

function ProblemScoreTable({
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

  return <Table headers={columns} rows={rows} />;
}

export default function Index() {
  const { scores, contest } = useLoaderData<typeof loader>();

  if (!contest || !scores) {
    return <H1>Ingen aktiv konkurranse</H1>;
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <main className="flex h-full bg-white">
        <div className="flex-1 p-6">
          <div className="v-full">
            <ProblemScoreTable contest={contest} scores={scores} />
          </div>
        </div>
      </main>
    </div>
  );
}
