import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";

import { Button } from "~/components/button";
import { H1 } from "~/components/header";
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
        <H1>
          <Link to="/">Speed Warz</Link>
        </H1>
        {!user.isAdmin ? (
          <Link to={"team"}>
            <p>{user.teamName}</p>{" "}
          </Link>
        ) : null}

        <div className="flex flex-row items-center gap-4">
          {user.isAdmin ? <Link to="/home/admin">Admin</Link> : null}

          <Form action="/logout" method="post">
            <Button variant="secondary">Logg ut</Button>
          </Form>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
