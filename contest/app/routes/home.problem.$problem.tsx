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
  SUBMISSION_LANGUAGES,
  createSubmission,
  deleteSubmission,
  getTeamSubmissionsSortedByRecency,
  isSubmissionLang,
} from "~/models/submission.server";
import { User } from "~/models/user.server";
import { requireUser } from "~/service/session.server";
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
    : [];

  invariant(
    teamSubmissions,
    "Expected to have submissions since contest exists",
  );

  return json({
    user,
    contest,
    teamSubmissions,
    submissionLanguages: SUBMISSION_LANGUAGES,
  });
};

const ONE_MB = Math.pow(2, 20);

const actionUploadSubmission = async (
  user: User,
  problem: number,
  formData: FormData,
) => {
  invariant(!user.isAdmin);

  const submission = formData.get("submission") as Blob | null;
  const lang = formData.get("submission-lang");

  if (!submission || submission.size == 0) {
    return json({
      error: "Expected a submitted file",
      createdSubmission: null,
    });
  }

  invariant(isSubmissionLang(lang), `Unsupported submission language ${lang}`);

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
    lang,
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
  const {
    user,
    teamSubmissions: _teamSubmissions,
    submissionLanguages,
  } = useLoaderData<typeof loader>();
  const teamSubmissions = mapSubmissionSubmittedAt(_teamSubmissions);
  const actionData = useActionData<typeof action>();

  if (user.isAdmin) {
    return <p>Denne siden fungerer ikke for admin</p>;
  }

  return (
    <div className="flex flex-col gap-10 p-10">
      <H1>Last opp løsning</H1>

      <Form method="post" encType="multipart/form-data">
        <div className="flex flex-col gap-10 w-96">
          <div className="flex justify-between items-center">
            <label htmlFor="submission-lang">Velg språk</label>
            <select
              id="submission-lang"
              name="submission-lang"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-72 p-2.5"
            >
              {submissionLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <input
            type="hidden"
            name="problem-action"
            value="upload-submission"
          />
          <div className="flex justify-between items-center">
            <label htmlFor="submission">Velg zip-fil</label>
            <input
              id="submission"
              name="submission"
              type="file"
              accept="application/zip"
              className="w-44"
            />
          </div>
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
