import { redirect } from "react-router";

import type { Route } from "./+types/share-target";

const toSearchParamValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return "unknown";
  }

  return String(value);
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const file = formData.get("csv");
  const params = new URLSearchParams({ shareTarget: "poc" });

  if (file instanceof File) {
    params.set("fileName", toSearchParamValue(file.name));
    params.set("fileType", toSearchParamValue(file.type));
    params.set("fileSize", toSearchParamValue(file.size));
  } else {
    params.set("fileName", "not-file");
    params.set("fileType", "not-file");
    params.set("fileSize", "0");
  }

  return redirect(`/?${params.toString()}`);
}

export function loader() {
  return redirect("/");
}

export default function ShareTarget() {
  return null;
}
