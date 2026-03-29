// eleventy-navigation.d.ts
declare module '@11ty/eleventy-navigation' {
  /**
   * Navigation item metadata for Eleventy Navigation plugin
   * https://www.11ty.dev/docs/plugins/navigation/
   */
  export interface EleventyNavigation {
    /** The display title for the navigation link */
    key: string;

    /** Optional parent navigation key for nesting */
    parent?: string;

    /** Order in which the item appears (lower = earlier) */
    order?: number;

    /** URL for the navigation item (auto-generated if omitted) */
    url?: string;

    /** Optional title attribute for the link */
    title?: string;

    /** Optional additional data */
    [prop: string]: unknown;
  }

  /**
   * Options for the navigation plugin
   */
  export interface EleventyNavigationPluginOptions {
    /** Name of the data key to read navigation info from (default: "eleventyNavigation") */
    key?: string;
  }

  /**
   * Eleventy Navigation plugin function
   */
  export default function eleventyNavigationPlugin(
    eleventyConfig: unknown,
    options?: EleventyNavigationPluginOptions
  ): void;
}
