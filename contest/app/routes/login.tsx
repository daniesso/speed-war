import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef } from "react";

import { Button } from "~/components/button";
import { verifyLogin } from "~/models/user.server";
import { createUserSession, getUserId } from "~/service/session.server";
import { safeRedirect } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
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

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const actionData = useActionData<typeof action>();
  const accessKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.password) {
      accessKeyRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Access key
            </label>
            <div className="mt-1">
              <input
                id="accesskey"
                ref={accessKeyRef}
                name="accesskey"
                type="password"
                autoComplete="current-password"
                aria-invalid={actionData?.errors?.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.password ? (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              ) : null}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button>Logg inn</Button>
        </Form>
      </div>
    </div>
  );
}
