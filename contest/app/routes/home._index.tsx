import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { H1 } from "~/components/header";
import {
  CombinedScoreTable,
  CorrectnessScoreTable,
  EnergyScoreTable,
  ProblemScoreTable,
  TimeScoreTable,
} from "~/components/score-tables";
import { MostRecentSubmissionRow } from "~/components/submission-list";
import { useRefreshInterval } from "~/hooks/refreshinterval";
import {
  getMostRecentlySystemUpdatedSubmission,
  getSubmissions,
} from "~/models/submission.server";
import { requireUser } from "~/session.server";
import { mapSubmissionSubmittedAt } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const submissions = await getSubmissions();
  const contest = submissions?.getContest();

  const scores = submissions?.getScoreTable();

  const ranking = submissions?.calculateRanking();

  const mostRecent = await getMostRecentlySystemUpdatedSubmission();

  const maybeMostRecent =
    mostRecent &&
    Date.now() - mostRecent?.testsCompletedTime?.getTime() < 600_000
      ? mostRecent
      : null;

  return json({
    user,
    scores,
    contest,
    ranking,
    mostRecentSubmission: maybeMostRecent,
  });
};

export default function Index() {
  const { scores, contest, ranking, mostRecentSubmission } =
    useLoaderData<typeof loader>();

  useRefreshInterval(15);

  if (!contest || !scores || !ranking) {
    return <H1>Ingen aktiv konkurranse</H1>;
  }

  return (
    <main className="flex flex-col p-12 gap-8">
      {mostRecentSubmission ? (
        <div>
          <p className="text-m font-bold py-1">Siste opplasting</p>
          <MostRecentSubmissionRow
            submission={mapSubmissionSubmittedAt([mostRecentSubmission])[0]}
          />
        </div>
      ) : null}
      <CombinedScoreTable ranking={ranking} />
      <CorrectnessScoreTable contest={contest} ranking={ranking} />
      <TimeScoreTable contest={contest} ranking={ranking} />
      <EnergyScoreTable contest={contest} ranking={ranking} />
      <ProblemScoreTable contest={contest} scores={scores} />
    </main>
  );
}
