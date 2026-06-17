import "web-app-manifest";

declare module "web-app-manifest" {
  export interface ShareTargetFiles {
    name: string;
    accept: string | readonly string[];
  }

  export interface ShareTargetParams {
    title?: string;
    text?: string;
    url?: string;
    files?: ShareTargetFiles | readonly ShareTargetFiles[];
  }

  export interface ShareTarget {
    action: string;
    method?: "GET" | "POST";
    enctype?: "application/x-www-form-urlencoded" | "multipart/form-data";
    params: ShareTargetParams;
  }

  export interface WebAppManifest {
    /**
     * Web Share Target API extension to Web App Manifest.
     *
     * @see https://w3c.github.io/web-share-target/level-2/
     */
    share_target?: ShareTarget;
  }
}
