import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";

import { getSubmissions } from "~/models/submission.server";
import { requireUser } from "~/session.server";
import { range } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const submissions = await getSubmissions();
  const contest = submissions?.getContest();

  const scores = submissions?.getScoreTable();

  return json({ user, scores, contest });
};

export default function Index() {
  const { scores, contest } = useLoaderData<typeof loader>();

  if (!contest || !scores) {
    return <h1>Ingen aktiv konkurranse</h1>;
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <main className="flex h-full bg-white">
        <div className="flex-1 p-6">
          <div className="v-full">
            <table className="table-auto">
              <thead>
                <tr>
                  <th>Lag</th>
                  {range(1, contest.numProblems).map((problem) => (
                    <th key={problem}>Oppgave {problem}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {range(1, contest.numTeams).map((team) => (
                  <tr key={team}>
                    <td>Lag {team}</td>
                    {range(1, contest.numProblems).map((problem) => (
                      <td className="px-10 py-2" key={problem}>
                        <div className=" flex flex-row gap-4">
                          <p>{scores[team][problem].scoreMs ?? "?"} ms</p>
                          <p>{scores[team][problem].scoreJ ?? "?"} J</p>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
