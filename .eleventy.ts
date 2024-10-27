import htmlmin from 'html-minifier';
import yaml from 'js-yaml';
// import debugFn from 'debug';
import eleventyNavigationPlugin from '@11ty/eleventy-navigation';
import helpersPlugin from './plugins/helpers';
import imagesPlugin from './plugins/images';
import titlesPlugin from './plugins/titles';

// Setting compilerOptions.typeRoots to @types seems to cause issues... perhaps
// the generated types aren't 100% correct as far as defining the
// module/library? In any case, since we only need the type, we can reference
// the type definition directly.

// import UserConfig from '@11ty/eleventy/src/UserConfig';
import type UserConfig from './@types/@11ty/eleventy/src/UserConfig';

// import * as addins from './src/_plugins/helpers/addins';

// const debug = debugFn('MY_CONFIG');

// Some of the addins want the config'd directories, but that's not available
// until the *return* of the called config function.  But, since it's a constant
// value, we pre-define it and pass it into our `withConfig` helper.

const configOptions = {
  dir: {
    input: '_js/src',
    output: '_site',
    // relative to input...
    data: '_data',
    includes: '_includes',
    layouts: '_layouts',
  },
  // markdownTemplateEngine: "webc",
  // htmlTemplateEngine: "webc",
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
};

// debug('helpers plugin', helpersPlugin);

module.exports = function (eleventyConfig: UserConfig) {
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addPlugin(eleventyNavigationPlugin, undefined);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // Allow YAML everywhere that JSON is supported.
  eleventyConfig.addDataExtension('yaml', (contents: string) =>
    yaml.load(contents)
  );

  // Add all filters/shortcodes from our helper addins...
  eleventyConfig.addPlugin(helpersPlugin, configOptions);
  eleventyConfig.addPlugin(imagesPlugin, configOptions);
  eleventyConfig.addPlugin(titlesPlugin, configOptions);

  // No Netlify CMS yet... may add this back in later?

  // copy media folder to /_site
  eleventyConfig.addPassthroughCopy('_js/src/static/media');

  // copy js folder to /_site
  eleventyConfig.addPassthroughCopy('_js/src/static/js');

  // copy dependency files to /_site
  eleventyConfig.addPassthroughCopy({
    'node_modules/alpinejs/dist/cdn.min.js': 'static/js/alpine.js',
    'node_modules/lunr/lunr.min.js': 'static/js/lunr.min.js',
  });

  // copy favicon folder to /_site (and special copy for '/favicon.ico')
  eleventyConfig.addPassthroughCopy({
    '_js/src/static/favicon/favicon.ico': 'favicon.ico',
  });

  eleventyConfig.addPassthroughCopy('_js/src/static/favicon');

  // Minify HTML
  eleventyConfig.addTransform(
    'htmlmin',
    function (content: string, outputPath: string) {
      // Eleventy 1.0+: use this.inputPath and this.outputPath instead
      if (outputPath.endsWith('.html')) {
        let minified = htmlmin.minify(content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true,
        });
        return minified;
      }

      return content;
    }
  );

  return configOptions;
};
