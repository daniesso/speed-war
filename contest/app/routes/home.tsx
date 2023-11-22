import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { createContest, getContest } from "~/models/contest.server";

import { getNoteListItems } from "~/models/note.server";
import { requireUser, requireUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const noteListItems = await getNoteListItems({ userId: user.userId });
  let contest = await getContest();

  if (!contest) {
    contest = await createContest(4, 4);
  }
  return json({ noteListItems, contest, user });
};

export default function Index() {
  const { noteListItems, contest, user } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/">Speed Warz</Link>
        </h1>
        {!user.isAdmin ? <p>user.teamName</p> : null}

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
