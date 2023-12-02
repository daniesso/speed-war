import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getUser } from "~/service/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUser(request);

  if (user) {
    return redirect("/home");
  } else {
    return redirect("/login");
  }
};

export default function Index() {
  return <div>Loading</div>;
}
