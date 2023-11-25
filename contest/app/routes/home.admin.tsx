import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import {
  ContestWithTeams,
  createContest,
  deleteContest as deleteContest,
  getContest,
} from "~/models/contest.server";
import { requireUser } from "~/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  if (!user.isAdmin) {
    return redirect("/");
  }

  const contest = await getContest();

  return json({ user, contest });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const contestAction = formData.get("contest-action");
  invariant(!!contestAction);

  if (contestAction == "create-contest") {
    const numTeams = Number(formData.get("num-players"));
    const numProblems = Number(formData.get("num-problems"));

    if (isNaN(numTeams) || numTeams < 1 || numTeams > 20) {
      return json({ error: "Ugyldig antall spillere" });
    }

    if (isNaN(numProblems) || numProblems < 1 || numProblems > 20) {
      return json({ error: "Ugyldig antall oppgaver" });
    }

    await createContest(numTeams, numProblems);
  } else if (contestAction == "delete-contest") {
    const contest = await getContest();
    if (!contest) {
      return json({ error: "Det finnes ingen konkurranse å slette" });
    }
    await deleteContest();
  }

  return null;
};

export const meta: MetaFunction = () => [{ title: "Login" }];

function ActiveContest({
  contest,
}: {
  contest: ContestWithTeams;
}): React.ReactNode {
  const actionData = useActionData<typeof action>();

  return (
    <main className="p-10 flex flex-col gap-8">
      <h1 className="text-3xl font-bold ">Aktiv konkurranse</h1>
      <div>
        <table className="table-auto">
          <thead>
            <tr>
              <th>Lag</th>
              <th>Lagnavn</th>
              <th>Access key</th>
            </tr>
          </thead>
          <tbody>
            {contest!.teams.map((team) => (
              <tr key={team.id}>
                <td>Lag {team.id}</td>
                <td>{team.teamName}</td>
                <td>{team.accessKey}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Slett konkurranse</h1>
        <Form method="post" className="" name="Hello">
          <input type="hidden" name="contest-action" value="delete-contest" />

          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Slett
          </button>

          {actionData?.error != undefined ? (
            <div>{actionData.error}</div>
          ) : null}
        </Form>
      </div>
    </main>
  );
}

function CreateContest(): React.ReactNode {
  const actionData = useActionData<typeof action>();

  return (
    <div className="w-96">
      <Form method="post" className="flex flex-col gap-5">
        <h1 className="text-3xl font-bold">Opprett ny konkurranse</h1>
        <input type="hidden" name="contest-action" value="create-contest" />

        <label className="flex flex-col gap-1">
          <span>Antall spillere: </span>
          <input
            name="num-players"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Antall oppgaver: </span>
          <input
            name="num-problems"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Opprett
        </button>
        {actionData?.error != undefined ? <div>{actionData.error}</div> : null}
      </Form>
    </div>
  );
}

export default function LoginPage() {
  const { contest } = useLoaderData<typeof loader>();

  return contest ? <ActiveContest contest={contest} /> : <CreateContest />;
}
