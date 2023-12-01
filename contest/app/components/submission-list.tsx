import { Form, Link } from "@remix-run/react";

import { Submission, SubmissionState } from "~/models/submission.server";

import { Button } from "./button";
import { H1 } from "./header";

export function SubmissionBox({
  submissionState,
  children,
}: {
  submissionState: SubmissionState;
  children: React.ReactNode[];
}): JSX.Element {
  const bgColor: Record<SubmissionState, string> = {
    queued: "bg-gray-200",
    success: "bg-green-200",
    failure: "bg-red-200",
    running: "bg-yellow-200",
  };

  return (
    <div
      className={`rounded flex flex-row py-1 px-2 ${bgColor[submissionState]}`}
    >
      {children}
    </div>
  );
}

export function SubmissionRow({
  submission,
  onDeleteRedirectTo = undefined,
}: {
  submission: Submission;
  onDeleteRedirectTo?: string;
}): JSX.Element {
  return (
    <SubmissionBox submissionState={submission.state}>
      <p className="w-2/12">Oppg {submission.problemId}</p>
      <p className="w-1/12">{submission.lang}</p>
      <p className="w-3/12">{submission.submittedAt.toLocaleString("no")}</p>
      <p className="w-2/12">{submission.state}</p>
      <p className="w-2/12">{submission.scoreMs ?? "-"} ms</p>
      <p className="w-1/12">{submission.scoreJ ?? "-"} J</p>
      <Form
        method="post"
        className="w-1/12"
        action={`/home/problem/${submission.problemId}`}
      >
        <input type="hidden" name="problem-action" value="delete-submission" />
        <input type="hidden" name="submission-id" value={submission.id} />
        {onDeleteRedirectTo ? (
          <input type="hidden" name="redirect-to" value={onDeleteRedirectTo} />
        ) : null}
        {submission.state != "running" ? (
          <Button variant="inline">Slett</Button>
        ) : null}
      </Form>
    </SubmissionBox>
  );
}

export function MostRecentSubmissionRow({
  submission,
}: {
  submission: Submission;
}): JSX.Element {
  return (
    <SubmissionBox submissionState={submission.state}>
      <p className="w-3/12">Lag {submission.teamId}</p>
      <p className="w-2/12">Oppg {submission.problemId}</p>
      <p className="w-1/12">{submission.lang}</p>
      <p className="w-2/12">{submission.state}</p>
      <p className="w-2/12">{submission.scoreMs ?? "-"} ms</p>
      <p className="w-1/12">{submission.scoreJ ?? "-"} J</p>
    </SubmissionBox>
  );
}

export function SubmissionList({
  submissions,
  onDeleteRedirectTo = undefined,
}: {
  submissions: Submission[];
  onDeleteRedirectTo?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <H1>Opplastinger</H1>
      {submissions.map((submission) => (
        <Link key={submission.id} to={`/home/submission/${submission.id}`}>
          <SubmissionRow
            key={submission.id}
            submission={submission}
            onDeleteRedirectTo={onDeleteRedirectTo}
          />
        </Link>
      ))}
    </div>
  );
}
