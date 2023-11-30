import { Contest } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { H1 } from "~/components/header";
import {
  CombinedScoreTable,
  CorrectnessScoreTable,
  EnergyScoreTable,
  ProblemScoreTable,
  TimeScoreTable,
} from "~/components/score-tables";
import { Table } from "~/components/table";
import {
  IRanking,
  Ranking,
  ScoreTable,
  getSubmissions,
} from "~/models/submission.server";
import { requireUser } from "~/session.server";
import { range } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const submissions = await getSubmissions();
  const contest = submissions?.getContest();

  const scores = submissions?.getScoreTable();

  const ranking = submissions?.calculateRanking();

  return json({ user, scores, contest, ranking });
};

export default function Index() {
  const { scores, contest, ranking } = useLoaderData<typeof loader>();

  if (!contest || !scores || !ranking) {
    return <H1>Ingen aktiv konkurranse</H1>;
  }

  return (
    <main className="flex flex-col p-12 gap-8">
      <CombinedScoreTable ranking={ranking} />
      <CorrectnessScoreTable contest={contest} ranking={ranking} />
      <TimeScoreTable contest={contest} ranking={ranking} />
      <EnergyScoreTable contest={contest} ranking={ranking} />
      <ProblemScoreTable contest={contest} scores={scores} />
    </main>
  );
}
