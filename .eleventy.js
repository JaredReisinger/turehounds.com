const htmlmin = require('html-minifier');
const yaml = require('js-yaml');
const debug = require('debug')('MYCONFIG');
const eleventyNavigationPlugin = require('@11ty/eleventy-navigation');
const UserConfig = require('@11ty/eleventy/src/UserConfig');

const addins = require('./src/_helpers/addins');

// Some of the addins want the config'd directories, but that's not availble
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

/** @param {UserConfig} eleventyConfig */
module.exports = function (eleventyConfig) {
  // eleventyConfig.ignores.delete('./_js/**');
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // Allow YAML everywhere that JSON is supported.
  eleventyConfig.addDataExtension('yaml', (contents) => yaml.load(contents));

  // Add all filters/shortcodes from our helper addins...
  Object.entries(addins.filters?.async).forEach(([k, v]) => {
    debug(`adding async filter ${k}...`);
    eleventyConfig.addAsyncFilter(k, v);
  });

  Object.entries(addins.filters?.sync).forEach(([k, v]) => {
    debug(`adding sync filter ${k}...`);
    eleventyConfig.addFilter(k, v);
  });

  Object.entries(addins.shortcodes?.async).forEach(([k, v]) => {
    debug(`adding async shortcode ${k}...`);
    eleventyConfig.addAsyncShortcode(k, v);
  });

  Object.entries(addins.shortcodes?.sync).forEach(([k, v]) => {
    debug(`adding sync shortcode ${k}...`);
    eleventyConfig.addShortcode(k, v);
  });

  if (addins.withConfig) {
    addins.withConfig(eleventyConfig, configOptions);
  }

  // No Netlify CMS yet... may add this back in later?

  // copy media folder to /_site
  eleventyConfig.addPassthroughCopy('_js/src/static/media');

  // copy js folder to /_site
  eleventyConfig.addPassthroughCopy('_js/src/static/js');

  // copy dependency files to /_site
  eleventyConfig.addPassthroughCopy({
    'node_modules/alpinejs/dist/cdn.min.js': 'static/js/alpine.js',
    'node_modules/lunr/lunr.min.js': 'static/js/lunr.min.js',
    // photoswipe
    'node_modules/photoswipe/dist/photoswipe.esm.min.js': 'static/js/photoswipe.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe-lightbox.esm.min.js': 'static/js/photoswipe-lightbox.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe.css': 'static/css/photoswipe.css',
    // photoswipe captions
    'node_modules/photoswipe-dynamic-caption-plugin/dist/photoswipe-dynamic-caption-plugin.esm.min.js': 'static/js/photoswipe-dynamic-caption-plugin.esm.min.js',
    'node_modules/photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css': 'static/css/photoswipe-dynamic-caption-plugin.css',
  });

  // copy favicon folder to /_site (and special copy for '/favicon.ico')
  eleventyConfig.addPassthroughCopy({
    '_js/src/static/favicon/favicon.ico': 'favicon.ico',
  });
  eleventyConfig.addPassthroughCopy('_js/src/static/favicon');

  // Minify HTML
  eleventyConfig.addTransform('htmlmin', function (content, outputPath) {
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
  });

  return configOptions;
};
