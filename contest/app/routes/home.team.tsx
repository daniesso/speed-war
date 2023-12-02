import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useLocation } from "@remix-run/react";
import invariant from "tiny-invariant";

import { Button } from "~/components/button";
import { H1 } from "~/components/header";
import { SubmissionList } from "~/components/submission-list";
import { getContest } from "~/models/contest.server";
import { getTeamSubmissionsSortedByRecency } from "~/models/submission.server";
import { updateTeamName } from "~/models/team.server";
import { ContestTeam } from "~/models/user.server";
import { requireUser } from "~/session.server";
import { mapSubmissionSubmittedAt } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  const contest = await getContest();

  if (!contest || user.isAdmin) {
    return redirect("/home");
  }

  const teamSubmissions = await getTeamSubmissionsSortedByRecency(
    user.teamNumber,
  );

  invariant(
    !!teamSubmissions,
    "Expected to have submissions since contest exists",
  );

  return json({ user, contest, teamSubmissions });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request);
  invariant(!user.isAdmin, "Admins cannot set team name");

  const formData = await request.formData();

  const newTeamName = formData.get("team-name");

  invariant(
    typeof newTeamName === "string" && newTeamName && newTeamName.length < 32,
  );

  await updateTeamName(user.teamNumber, newTeamName);

  return json({});
};

export const meta: MetaFunction = () => [{ title: "Team" }];

function EditTeamName({ user }: { user: ContestTeam }) {
  return (
    <div>
      <H1>Rediger lagnavn</H1>

      <Form method="post" className="flex flex-col w-96 gap-4 px-4 py-2">
        <input
          id="accesskey"
          name="team-name"
          type="text"
          className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
          defaultValue={user.teamName}
        />
        <Button type="submit">Lagre</Button>
      </Form>
    </div>
  );
}

export default function TeamPage() {
  const { teamSubmissions: _teamSubmissions, user } =
    useLoaderData<typeof loader>();
  const teamSubmissions = mapSubmissionSubmittedAt(_teamSubmissions);
  const location = useLocation();

  return (
    <div className="flex flex-col gap-10 p-10">
      <EditTeamName user={user} />
      <SubmissionList
        submissions={teamSubmissions}
        onDeleteRedirectTo={location.pathname}
      />
    </div>
  );
}
