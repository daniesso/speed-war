import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";

import { getContest } from "~/models/contest.server";
import { requireUser } from "~/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const contest = await getContest();

  return json({ contest, user });
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/">Speed Warz</Link>
        </h1>
        {!user.isAdmin ? <p>{user.teamName}</p> : null}

        <div className="flex flex-row items-center gap-4">
          {user.isAdmin ? <Link to="/home/admin">Admin</Link> : null}

          <Form action="/logout" method="post">
            <button
              type="submit"
              className="rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
            >
              Logout
            </button>
          </Form>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
