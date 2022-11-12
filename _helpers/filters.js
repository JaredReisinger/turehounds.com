// utility functions... it would be nice to leverage Typescript for these, but
// I think we can get 90% of what I want with JSDoc comments...

const util = require("util");

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
  // console.log('GOT ARGS', {obj, keys});
  o = {};
  keys.forEach((k) => {
    o[k] = obj[k];
  });
  // console.log('keys', {
  //   before: Object.keys(obj).sort(),
  //   after: Object.keys(o).sort(),
  // });
  return o;
}

/**
 * Omits specific keys when cloning into a new object.
 * @param {Object} obj Object to clone from
 * @param {Array<string>} keys Keys to omit
 * @returns Object
 */
function omit(obj, keys) {
  // console.log('GOT ARGS', {obj, keys});
  o = { ...obj };
  keys.forEach((k) => {
    delete o[k];
  });
  // console.log('keys', {
  //   before: Object.keys(obj).sort(),
  //   after: Object.keys(o).sort(),
  // });
  return o;
}

/**
 * Shallow-clones the "interesting" properties from a collection item.
 * @param {Object} obj Collection item object
 * @returns Object
 */
function collectionInfo(obj) {
  // Not sure if "allowlist" or "denylist" is a cleaner mechanism... the former
  // is safer, but prevents "additional" things from appearing. I think,
  // however, that the top-level properties are really convenience accessors for
  // stuff in `data.page`, and therefore `pick` should be okay...

  // return omit(obj, [
  //   '_templateContent',
  //   'checkTemplateContent',
  //   'template',
  //   'templateContent',
  // ]);

  const o = pick(obj, [
    // 'data',
    'date',
    'filePathStem',
    'fileSlug',
    'inputPath',
    'outputPath',
    'url',
  ]);

  // ... and also streamline `.data` to exclude `eleventy` and `pkg`, which is
  // common across all items?
  o.data = omit(obj.data, ['eleventy', 'pkg', 'collections']);
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

module.exports = {
  inspect,
  keys,
  pick,
  omit,
  collectionInfo,
  arrayslice,
  split,
  trimstart,
  trimend,
};
