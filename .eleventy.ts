import htmlmin from 'html-minifier';
import YAML from 'yaml';
// import debugFn from 'debug';

import navPlugin from '@11ty/eleventy-navigation';

import helpersPlugin from './plugins/helpers/index.js';
import imagesPlugin from './plugins/images/index.js';
import titlesPlugin from './plugins/titles/index.js';

import { defineConfig } from '11ty.ts';

// const debug = debugFn('MY_CONFIG');

// Some of the addins want the config'd directories, but that's not available
// until the *return* of the called config function.  But, since it's a constant
// value, we pre-define it and pass it into our `withConfig` helper.

const configOptions = {
  dir: {
    input: 'src',
    output: '_site',
    // relative to input...
    data: '_data',
    includes: '_includes',
    layouts: '_layouts',
  },
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
};

// debug('helpers plugin', helpersPlugin);

export default defineConfig(function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addPlugin(navPlugin);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // Allow YAML everywhere that JSON is supported.
  eleventyConfig.addDataExtension('yaml', (contents: string) =>
    YAML.parse(contents)
  );

  // Add all filters/shortcodes from our helper addins...
  eleventyConfig.addPlugin(helpersPlugin, configOptions);
  eleventyConfig.addPlugin(imagesPlugin, configOptions);
  eleventyConfig.addPlugin(titlesPlugin, configOptions);

  // No Netlify CMS yet... may add this back in later?

  // copy media folder to /_site
  eleventyConfig.addPassthroughCopy('src/static/media');

  // copy js folder to /_site
  eleventyConfig.addPassthroughCopy('src/static/js');

  // copy dependency files to /_site
  eleventyConfig.addPassthroughCopy({
    'node_modules/alpinejs/dist/cdn.min.js': 'static/js/alpine.js',
    'node_modules/lunr/lunr.min.js': 'static/js/lunr.min.js',
    'node_modules/luxon/build/global/luxon.min.js': 'static/js/luxon.min.js',
  });

  // copy favicon folder to /_site (and special copy for '/favicon.ico')
  eleventyConfig.addPassthroughCopy({
    '_js/src/static/favicon/favicon.ico': 'favicon.ico',
  });

  eleventyConfig.addPassthroughCopy('_js/src/static/favicon');

  // Minify HTML
  eleventyConfig.addTransform('htmlmin', function (content: string) {
    if ((this.page.outputPath || '').endsWith('.html')) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  return configOptions;
});
