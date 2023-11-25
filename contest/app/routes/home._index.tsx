import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";

import { getContest } from "~/models/contest.server";
import { requireUser } from "~/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const contest = await getContest();
  return json({ contest, user });
};

export default function Index() {
  const { contest } = useLoaderData<typeof loader>();

  if (!contest) {
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
                  {[...Array(contest.numProblems).keys()].map((idx) => (
                    <th key={idx}>Oppgave {idx + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(contest.numPlayers).keys()].map((idx) => (
                  <tr key={idx}>
                    <td>Lag {idx + 1}</td>
                    {[...Array(contest.numProblems).keys()].map((idx) => (
                      <td className="px-10 py-2" key={idx}>
                        0 ms, 0 J
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
