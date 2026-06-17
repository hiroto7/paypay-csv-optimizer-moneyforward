import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("manifest.webmanifest", "routes/manifest.webmanifest.ts"),
] satisfies RouteConfig;
