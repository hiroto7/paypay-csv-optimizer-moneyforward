import { redirect } from "react-router";

import type { Route } from "./+types/share-target";

const toSearchParamValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return "unknown";
  }

  return String(value);
};

export async function action({ request }: Route.ActionArgs) {
  const params = new URLSearchParams({
    shareTarget: "poc",
    requestMethod: request.method,
    contentType: toSearchParamValue(request.headers.get("content-type")),
  });

  try {
    const formData = await request.formData();
    const file = formData.get("csv");

    if (file instanceof File) {
      params.set("fileName", toSearchParamValue(file.name));
      params.set("fileType", toSearchParamValue(file.type));
      params.set("fileSize", toSearchParamValue(file.size));
    } else {
      params.set("fileName", "not-file");
      params.set("fileType", "not-file");
      params.set("fileSize", "0");
    }
  } catch {
    params.set("fileName", "form-data-parse-failed");
    params.set("fileType", "form-data-parse-failed");
    params.set("fileSize", "0");
  }

  return redirect(`/?${params.toString()}`);
}

export function loader({ request }: Route.LoaderArgs) {
  const params = new URLSearchParams({
    shareTarget: "poc",
    requestMethod: request.method,
    contentType: toSearchParamValue(request.headers.get("content-type")),
    fileName: "loader-called",
    fileType: "loader-called",
    fileSize: "0",
  });

  return redirect(`/?${params.toString()}`);
}

export default function ShareTarget() {
  return null;
}
