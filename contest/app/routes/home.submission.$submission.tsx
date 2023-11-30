import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { H1 } from "~/components/header";
import { SubmissionRow } from "~/components/submission-list";
import { getSubmissionResult } from "~/models/submission.server";
import { TestResult } from "~/service/types";
import { requireUser } from "~/session.server";
import { mapSubmissionSubmittedAt } from "~/utils";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  const submissionId = params.submission;
  invariant(!!submissionId, "Expected a submission ID");

  const submission = await getSubmissionResult(submissionId);

  if (!submission) {
    return redirect("/home");
  }

  return json({ user, submission });
};

function FormatFailure({
  testResult,
}: {
  testResult: TestResult;
}): JSX.Element {
  switch (testResult.type) {
    case "build_error": {
      return (
        <div>
          <p>Beskrivelse: Bygging feilet</p>
          <p>Feilmelding: {testResult.error}</p>
        </div>
      );
    }
    case "prelim_tests_incorrect": {
      return (
        <div>
          <p>Beskrivelse: Feil svar på utdelte tester</p>
        </div>
      );
    }
    case "prelim_tests_error": {
      return (
        <div>
          <p>Beskrivelse: Utdelte tester krasjet</p>
          <p>Feilmelding: {testResult.error}</p>
        </div>
      );
    }
    case "speed_tests_incorrect":
      return (
        <div>
          <p>Beskrivelse: Feil svar på hastighetstester</p>
        </div>
      );
    case "speed_tests_error":
      return (
        <div>
          <p>Beskrivelse: Hastighetstester krasjet</p>
          <p>Feilmelding: {testResult.error}</p>
        </div>
      );
    case "internal_server_error":
      return (
        <div>
          <p>Beskrivelse: Intern feil</p>
          <p>Feilmelding: {testResult.error}</p>
        </div>
      );
    default:
      return <div>Beskrivelse: Ukjent feil</div>;
  }
}

export default function ViewSubmissionPage() {
  const { submission } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-10 p-10">
      <H1>Se opplasting</H1>

      <SubmissionRow
        submission={mapSubmissionSubmittedAt([submission])[0]}
        onDeleteRedirectTo="/home"
      />

      {submission.submissionResult &&
      submission.submissionResult?.type != "success" ? (
        <FormatFailure testResult={submission.submissionResult} />
      ) : null}
    </div>
  );
}
