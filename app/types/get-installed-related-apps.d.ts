export {};

declare global {
  interface RelatedApplication {
    id?: string;
    platform: string;
    url?: string;
    version?: string;
  }

  interface Navigator {
    /**
     * Returns related applications installed on the current device.
     *
     * @see https://wicg.github.io/get-installed-related-apps/spec/
     */
    getInstalledRelatedApps?(): Promise<RelatedApplication[]>;
  }
}
