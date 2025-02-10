export interface Page {
  /**
   * URL can be used in `<a href>` to link to other templates.
   *
   * > **NOTE:**
   * >
   * > This value will be `false` if `permalink` is set to `false`.
   *
   * @example
   * "/current/page/myFile/"
   */
  url: string;
  /**
   * For permalinks: inputPath filename minus template file extension.
   *
   * @example
   * "myFile"
   */
  fileSlug: string;
  /**
   * For permalinks: inputPath minus template file extension.
   *
   * @example
   * "/current/page/myFile"
   */
  filePathStem: string;
  /**
   * JS Date object for current page (used to sort collections).
   */
  date: Date;
  /**
   * The path to the original source file for the template.
   *
   * > **NOTE:**
   * >
   * > this includes your input directory path!
   *
   * @example
   * "./current/page/myFile.md"
   */
  inputPath: string;
  /**
   * Depends on your output directory (the default is `_site`).
   * You should probably use `url` instead.
   *
   *
   * > **NOTE:**
   * >
   * > This value will be `false` if `permalink` is set to `false`.
   *
   * @example
   * "./_site/current/page/myFile/index.html"
   */
  outputPath: string | false;
  /**
   * Useful with `page.filePathStem` when using custom file extensions.
   */
  outputFileExtension: string;
  /**
   * Comma separated list of template syntaxes processing this template.
   *
   * @example
   * "liquid,md"
   */
  templateSyntax: string;
  /**
   * The default is the value of `defaultLanguage` passed to the i18n plugin.
   *
   * > **NOTE:**
   * >
   * > Note that `page.lang` is only available when the [i18n plugin](https://www.11ty.dev/docs/plugins/i18n/#add-to-your-configuration-file) has been added to your configuration file.
   */
  lang: string;
  /** missing from 11ty.ts! */
  rawInput: string;
}

export interface Data {
  /**
   * Eleventy version
   */
  version: string;
  /**
   * For use with `<meta name="generator">`
   */
  generator: string;
  /**
   * Environment Variables
   *
   * [11ty Docs](https://www.11ty.dev/docs/environment-vars/#eleventy-supplied)
   */
  env: {
    /**
     * Absolute path to the directory in which you've run the Eleventy command.
     *
     * @example
     * "1.0.1"
     */
    root: string;
    /**
     * Absolute path to the current config file
     *
     * @example
     * '/Users/zachleat/myProject/.eleventy.js'
     */
    config: string;
    /**
     * The method, either `cli` or `script`
     */
    source: 'cli' | 'script';
    /**
     * One of `serve`, `watch`, or `build`
     */
    runMode: 'serve' | 'watch' | 'build';
  };
  serverless: {
    /**
     * An object containing the values from any Dynamic URL
     * slugs from Serverless paths
     *
     * For Example:
     *
     * A slug for `/path/:id/` and a URL for `/path/1/` would give:
     *
     * @example
     * { id: 1 }
     */
    path: {
        [key: string]: any;
    };
    /**
     * The `event.queryStringParameters` received from the
     * serverless function. Note these are not available in Netlify On-demand Builders
     *
     * @example
     *
     * // ?id=1
     * { id: 1 }
     */
    query: {
        [key: string]: any;
    };
  };
}

// Eleventy doesn't have types for the shortcode callback params or this.
export interface ShortcodeCallbackThis {
  page: Page;
  eleventy: Data; // ??
  env: unknown;
  ctx: unknown;
}
