import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { SubmissionList } from "~/components/submission-list";
import { getContest } from "~/models/contest.server";
import { getTeamSubmissionsSortedByRecency } from "~/models/submission.server";
import { requireUser } from "~/session.server";
import { mapSubmissionSubmittedAt } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  const contest = await getContest();

  if (!contest) {
    return redirect("/home");
  }

  const teamSubmissions = !user.isAdmin
    ? await getTeamSubmissionsSortedByRecency(user.teamNumber)
    : null;

  invariant(
    teamSubmissions,
    "Expected to have submissions since contest exists",
  );

  return json({ user, contest, teamSubmissions });
};

export const meta: MetaFunction = () => [{ title: "Team" }];

export default function TeamPage() {
  const { teamSubmissions: _teamSubmissions } = useLoaderData<typeof loader>();
  const teamSubmissions = mapSubmissionSubmittedAt(_teamSubmissions);

  return (
    <div className="flex flex-col gap-10 p-10">
      <SubmissionList
        submissions={teamSubmissions}
        onDeleteRedirectTo={location.pathname}
      />
    </div>
  );
}
