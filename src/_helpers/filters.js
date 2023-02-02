// utility functions... it would be nice to leverage Typescript for these, but
// I think we can get 90% of what I want with JSDoc comments...

const util = require('util');

const UserConfig = require('@11ty/eleventy/src/UserConfig');

/**
 * Javascript/Node `util.inspect(), but defaults to "all" depth.
 * @param {Object} obj Object to inspect (tojson)
 * @param {boolean} showHidden Whether to show hidden properties
 * @param {number} depth Depth to show.
 * @returns JSON string
 */
function inspect(obj, showHidden = undefined, depth = null) {
  return util.inspect(obj, showHidden, depth);
}

/**
 * Gets the keys of an object.
 * @param {Object} obj The object to inspect.
 * @returns {Array<String>} List of keys from the object.
 */
function keys(obj) {
  return Object.keys(obj).sort();
}

/**
 * Picks specific keys into a new object.
 * @param {Object} obj Object to clone from
 * @param {Array<string>} keys Keys to select
 * @returns Object
 */
function pick(obj, keys) {
  return pickOmitImpl(obj, keys, true);
}

/**
 * Omits specific keys when cloning into a new object.
 * @param {Object} obj Object to clone from
 * @param {Array<string>} keys Keys to omit
 * @returns Object
 */
function omit(obj, keys) {
  return pickOmitImpl(obj, keys, false);
}

/**
 * Underlying implementation for `pick` and `omit`.
 * @param {Object} obj Object to clone from.
 * @param {Array<string>} keys Keys to include/exclude.
 * @param {boolean} doPick `true` to include keys, `false` to exlclude them.
 * @returns Object with/without given keys.
 */
function pickOmitImpl(obj, keys, doPick) {
  const objKeys = Object.keys(obj || {});
  const o = {};
  objKeys.forEach((k) => {
    if (keys.includes(k) ^ !doPick) {
      o[k] = obj[k];
    }
  });
  // console.log('pick/omit', { objKeys, keys, doPick, result: Object.keys(o) });
  return o;
}

/**
 * Shallow-clones the "interesting" properties from a collection item.
 * @param {Object} obj Collection item object
 * @returns Object
 */
function collectionDebugInfo(obj) {
  // Not sure if "allowlist" or "denylist" is a cleaner mechanism... the former
  // is safer, but prevents "additional" things from appearing. I think,
  // however, that the top-level properties are really convenience accessors for
  // stuff in `data.page`, and therefore `pick` should be okay...

  const o = omit(obj, [
    '_templateContent',
    'checkTemplateContent',
    'template',
    'templateContent',
    'data',
  ]);

  // const o = pick(obj, [
  //   // 'data',
  //   'date',
  //   'filePathStem',
  //   'fileSlug',
  //   'inputPath',
  //   'outputPath',
  //   'url',
  // ]);

  // o.keys = Object.keys(obj);

  // ... and also streamline `.data` to exclude `eleventy` and `pkg`, which is
  // common across all items?
  o.data = omit(obj.data, [
    'debugConfig',
    'eleventy',
    'eleventyComputed',
    'pkg',
    'collections',
    'settings',
    'titleEvents',
    'titleLevels',
    'titleMap',
  ]);
  return o;
}

/**
 * The Javascript Array.prototype.slice function.
 * @param {Array} arr Array to slice.
 * @param {number} start Start index for the slice.
 * @param {number} end End index (exclusive) for the slice.
 * @returns
 */
function arrayslice(arr, start = undefined, end = undefined) {
  return arr.slice(start, end);
}

/**
 * Splits a string.
 * @param {string} str String to split into pieces.
 * @param {string|RegExp} separator Separator to split the string on.
 * @param {number} limit Limit of strings to return.
 * @returns An array of strings separated by `separator`.
 */
function split(str, separator, limit = undefined) {
  return str.split(separator, limit);
}

/**
 * A combination of Javascript's `string.trimStart` and golang's
 * `strings.TrimPrefix` which removes either leading whitespace or the specified
 * prefix.
 * @param {string} str String to trim.
 * @param {string} prefix Prefix to remove
 * @returns String without the prefix.
 */
function trimstart(str, prefix = undefined) {
  if (prefix && str.startsWith(prefix)) {
    return str.substring(prefix.length);
  }
  return str.trimStart();
}

/**
 * A combination of Javascript's `string.trimEnd` and golang's
 * `strings.TrimSuffix` which removes either trailing whitespace or the
 * specified suffix.
 * @param {string} str String to trim.
 * @param {string} suffix Suffix to remove
 * @returns String without the suffix.
 */
function trimend(str, suffix = undefined) {
  if (suffix && str.endsWith(suffix)) {
    return str.substring(0, str.length - suffix.length);
  }
  return str.trimEnd();
}

function typeOf(obj) {
  return typeof obj;
}

/**
 * @param {UserConfig} eleventyConfig
 * @param {Object} configOptions
 */
function withConfig(eleventyConfig, configOptions) {
  eleventyConfig.addGlobalData('debugConfig', () =>
    pick(eleventyConfig, ['collections', 'dir', 'pathPrefix'])
  );
}

module.exports = {
  filters: {
    async: {},
    sync: {
      inspect,
      keys,
      pick,
      omit,
      collectionDebugInfo,
      arrayslice,
      split,
      trimstart,
      trimend,
      typeOf,
    },
  },
  shortcodes: {
    async: {},
    sync: {},
  },
  withConfig,
};
