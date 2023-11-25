import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Params, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { Button } from "~/components/button";
import { H1 } from "~/components/header";
import { SubmissionList } from "~/components/submission-list";
import { getContest } from "~/models/contest.server";
import {
  createSubmission,
  deleteSubmission,
  getTeamSubmissionsSortedByRecency,
} from "~/models/submission.server";
import { User } from "~/models/user.server";
import { requireUser } from "~/session.server";
import { mapSubmissionSubmittedAt } from "~/utils";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const problem = validateProblemParam(params);

  const contest = await getContest();

  if (!contest) {
    return redirect("/home");
  }

  const teamSubmissions = !user.isAdmin
    ? await getTeamSubmissionsSortedByRecency(user.teamNumber, problem)
    : null;

  invariant(
    teamSubmissions,
    "Expected to have submissions since contest exists",
  );

  return json({ user, contest, teamSubmissions });
};

const ONE_MB = Math.pow(2, 20);

const actionUploadSubmission = async (
  user: User,
  problem: number,
  formData: FormData,
) => {
  invariant(!user.isAdmin);

  const submission = formData.get("submission") as Blob | null;

  if (!submission || submission.size == 0) {
    return json({
      error: "Expected a submitted file",
      createdSubmission: null,
    });
  }

  if (submission.size > 5 * ONE_MB) {
    return json({
      error: "Too large file (max 5 MB please)",
      createdSubmission: null,
    });
  }

  const data = await submission.arrayBuffer();

  const createdSubmission = await createSubmission(
    user.teamNumber,
    problem,
    data,
  );

  return json({ createdSubmission, error: null });
};

const actionDeleteSubmission = async (user: User, formData: FormData) => {
  const submissionId = formData.get("submission-id");
  const redirectTo = formData.get("redirect-to");

  invariant(typeof submissionId == "string" && !!submissionId);
  invariant(!redirectTo || typeof redirectTo == "string");
  await deleteSubmission(submissionId);

  if (redirectTo) {
    return redirect(redirectTo);
  } else {
    return json({ createdSubmission: null, error: null });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await requireUser(request);

  const problem = validateProblemParam(params);

  const formData = await request.formData();

  const problemAction = formData.get("problem-action");

  invariant(problemAction == "upload-submission" || "delete-submission");

  return problemAction == "upload-submission"
    ? actionUploadSubmission(user, problem, formData)
    : actionDeleteSubmission(user, formData);
};

export const meta: MetaFunction = () => [{ title: "Submit submission" }];

function validateProblemParam(params: Params<string>) {
  invariant(params.problem, "Expected problem number");
  const problem = Number(params.problem);
  invariant(!isNaN(problem) && 1 <= problem);
  return problem;
}

export default function SubmitPage() {
  const { user, teamSubmissions: _teamSubmissions } =
    useLoaderData<typeof loader>();
  const teamSubmissions = mapSubmissionSubmittedAt(_teamSubmissions);
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-10 p-10">
      <H1>Last opp løsning</H1>

      <Form method="post" encType="multipart/form-data">
        <div className="flex flex-col gap-10 w-96">
          <input
            type="hidden"
            name="problem-action"
            value="upload-submission"
          />
          <input name="submission" type="file" accept="application/zip" />

          <Button type="submit" disabled={user.isAdmin}>
            Last opp
          </Button>
          {actionData?.error ? <p>{actionData.error}</p> : null}
          {actionData?.createdSubmission ? (
            <p>Lastet opp løsning {actionData?.createdSubmission.id} </p>
          ) : null}
        </div>
      </Form>

      <SubmissionList submissions={teamSubmissions} />
    </div>
  );
}
