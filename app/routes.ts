import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("share-target", "routes/share-target.tsx"),
] satisfies RouteConfig;
