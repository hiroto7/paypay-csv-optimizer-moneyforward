self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const toSearchParamValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "unknown";
  }

  return String(value);
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
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

        return Response.redirect(`/?${params.toString()}`, 303);
      })(),
    );
  }
});
