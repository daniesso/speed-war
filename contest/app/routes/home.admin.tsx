import { Contest } from "@prisma/client";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import { useEffect, useRef } from "react";
import { ContestWithTeams, getContest } from "~/models/contest.server";

import { verifyLogin } from "~/models/user.server";
import { createUserSession, requireUser } from "~/session.server";
import { safeRedirect, useUser } from "~/utils";

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
  const accesskey = formData.get("accesskey");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

  if (typeof accesskey !== "string" || accesskey.length === 0) {
    return json(
      { errors: { password: "Access key is required" } },
      { status: 400 },
    );
  }

  const user = await verifyLogin(accesskey);

  if (!user) {
    return json(
      { errors: { password: "Invalid access key" } },
      { status: 400 },
    );
  }

  return createUserSession({
    redirectTo,
    request,
    userId: user.userId,
  });
};

export const meta: MetaFunction = () => [{ title: "Login" }];

function ActiveContest({
  contest,
}: {
  contest: ContestWithTeams;
}): React.ReactNode {
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
            {contest!.ContestTeams.map((team) => (
              <tr key={team.id}>
                <td>Lag {team.id}</td>
                <td>{team.chosenName}</td>
                <td>{team.accessKey}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function CreateContest(): React.ReactNode {
  return <table></table>;
}

export default function LoginPage() {
  const { contest } = useLoaderData<typeof loader>();

  return contest ? <ActiveContest contest={contest} /> : <CreateContest />;
}
