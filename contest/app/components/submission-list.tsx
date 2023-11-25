import { Form } from "@remix-run/react";

import { Submission, SubmissionState } from "~/models/submission.server";

import { Button } from "./button";
import { H1 } from "./header";

function SubmissionRow({
  submission,
  onDeleteRedirectTo = undefined,
}: {
  submission: Submission;
  onDeleteRedirectTo?: string;
}): JSX.Element {
  const bgColor: Record<SubmissionState, string> = {
    queued: "bg-gray-200",
    success: "bg-green-200",
    failure: "bg-red-200",
  };

  return (
    <div
      className={`rounded flex flex-row justify-between gap-8 py-1 px-2 ${
        bgColor[submission.state]
      }`}
    >
      <p className="basis-1/7">Oppg {submission.problemId}</p>
      <p className="basis-2/7">{submission.submittedAt.toLocaleString()}</p>
      <p className="basis-1/7">{submission.state}</p>
      <p className="basis-1/7">{submission.scoreMs ?? "-"} ms</p>
      <p className="basis-1/7">{submission.scoreJ ?? "-"} J</p>
      <Form
        method="post"
        className="basis-1/7"
        action={`/home/problem/${submission.problemId}`}
      >
        <input type="hidden" name="problem-action" value="delete-submission" />
        <input type="hidden" name="submission-id" value={submission.id} />
        {onDeleteRedirectTo ? (
          <input type="hidden" name="redirect-to" value={onDeleteRedirectTo} />
        ) : null}
        <Button variant="inline">Slett</Button>
      </Form>
    </div>
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
    <div className="flex flex-col gap-5 max-w-2xl">
      <H1>Opplastinger</H1>
      {submissions.map((submission) => (
        <SubmissionRow
          key={submission.id}
          submission={submission}
          onDeleteRedirectTo={onDeleteRedirectTo}
        />
      ))}
    </div>
  );
}
