const { DateTime } = require('luxon');
const htmlmin = require('html-minifier');
const yaml = require('js-yaml');
// const nunjucks = require('nunjucks'); // for recursion?
const util = require('util');

const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");

// remove?
const eleventyWebcPlugin = require('@11ty/eleventy-plugin-webc');
const { EleventyRenderPlugin } = require('@11ty/eleventy');

const UserConfig = require('@11ty/eleventy/src/UserConfig');

const filters = require('./_helpers/filters');

/** @param {UserConfig} eleventyConfig */
module.exports = function (eleventyConfig) {
  // WebC testing -- BEGIN
  eleventyConfig.addPlugin(eleventyWebcPlugin, {
    components: 'src/_includes/components/**/*.webc',
    // useTransform: true,
    // transformData: {},
  });

  eleventyConfig.addPlugin(EleventyRenderPlugin);
  // WebC testing -- END

  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // human readable date
  eleventyConfig.addFilter('readableDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat(
      'dd LLL yyyy'
    );
  });

  eleventyConfig.addShortcode('year', () =>
    new Date().getFullYear().toString()
  );

  // Allow YAML everywhere that JSON is supported.
  eleventyConfig.addDataExtension('yaml', (contents) => yaml.load(contents));

  Object.entries(filters).forEach(([k, v]) => {
    // console.log(`adding filter ${k}...`);
    eleventyConfig.addFilter(k, v);
  });

  // TODO: image processing!

  // No Netlify CMS yet... may add this back in later?

  // copy dependency files to /_site
  eleventyConfig.addPassthroughCopy({
    'node_modules/alpinejs/dist/cdn.min.js': 'static/js/alpine.js',
  });

  // copy media folder to /_site
  eleventyConfig.addPassthroughCopy('src/static/media');

  // // copy favicon folder to /_site (and special copy for '/favicon.ico')
  // eleventyConfig.addPassthroughCopy({
  //   'src/static/favicon/favicon.ico': 'favicon.ico',
  // });
  // eleventyConfig.addPassthroughCopy('src/static/favicon');

  // // Copy favicon to route of /_site
  // eleventyConfig.addPassthroughCopy('src/favicon.ico');

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
  return {
    dir: {
      input: 'src',
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
};
