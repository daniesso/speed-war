import { exec } from "child_process";
import path from "path";

import { ActionFunctionArgs, json } from "@remix-run/node";
import invariant from "tiny-invariant";

export const action = async ({ request }: ActionFunctionArgs) => {
  const host = request.headers.get("authorization");

  const adminAccessKey = process.env.BOOTSTRAP_ACCESS_KEY;
  invariant(!!adminAccessKey, "BOOTSTRAP_ACCESS_KEY must be set");

  if (host != adminAccessKey) {
    return json({ result: "access denied" }, { status: 401 });
  }

  const repoBasePath = process.env.REPO_BASE_PATH;
  invariant(!!repoBasePath, "Repo base path must be defined");
  const cmd = path.join(repoBasePath, "install.sh");

  new Promise((resolve, reject) =>
    exec(cmd, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error(`Failed to run install.sh: ${stdout}\n${stderr}`);
        reject();
      } else {
        resolve(null);
      }
    }),
  );

  return json(
    {
      result: "started",
    },
    {
      status: 200,
    },
  );
};
