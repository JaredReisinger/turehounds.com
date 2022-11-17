const UserConfig = require('@11ty/eleventy/src/UserConfig');

const addins = [
  require('./dates'),
  require('./filters'),
  require('./galleries'),
  require('./images'),
];

filtersAndShortcodes = addins.reduce(
  (memo, addin) => {
    memo.filters.async = { ...memo.filters.async, ...addin.filters?.async };
    memo.filters.sync = { ...memo.filters.sync, ...addin.filters?.sync };
    memo.shortcodes.async = {
      ...memo.shortcodes.async,
      ...addin.shortcodes?.async,
    };
    memo.shortcodes.sync = {
      ...memo.shortcodes.sync,
      ...addin.shortcodes?.sync,
    };
    return memo;
  },
  {
    filters: { async: {}, sync: {} },
    shortcodes: { async: {}, sync: {} },
  }
);

/**
 * @param {UserConfig} eleventyConfig
 * @param {Object} configOptions
 */
function withConfig(eleventyConfig, configOptions) {
  addins.forEach((addin) => {
    if (addin.withConfig) {
      addin.withConfig(eleventyConfig, configOptions);
    }
  });
}

module.exports = {
  ...filtersAndShortcodes,
  withConfig,
};
