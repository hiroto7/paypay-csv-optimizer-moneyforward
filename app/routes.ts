import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("guide", "routes/guide.tsx"),
  route("manifest.webmanifest", "routes/manifest.webmanifest.ts"),
  route("privacy", "routes/privacy.tsx"),
] satisfies RouteConfig;
