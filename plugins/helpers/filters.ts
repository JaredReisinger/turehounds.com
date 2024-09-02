// utility functions... it would be nice to leverage Typescript for these, but
// I think we can get 90% of what I want with JSDoc comments...

import util from 'util';

import _ from 'lodash';

import UserConfig from '@11ty/eleventy/src/UserConfig';

/**
 * Node `util.inspect(), but defaults to "all" depth.
 */
function inspect(
  obj: any,
  showHidden: boolean | undefined = undefined,
  depth: number | undefined = undefined
) {
  return util.inspect(obj, showHidden, depth ?? null);
}

/**
 * Gets the keys of an object.
 */
function keys(obj: Record<PropertyKey, unknown>) {
  return Object.keys(obj).sort();
}

/**
 * Picks specific keys into a new object.
 */
export function pick<
  O extends object, // Record<PropertyKey, unknown>,
  K extends keyof O = keyof O,
>(obj: O, keys: K[]) {
  return pickOmitImpl(obj, keys, true);
}

/**
 * Omits specific keys when cloning into a new object.
 */
function omit<
  O extends object, // Record<PropertyKey, unknown>,
  K extends keyof O = keyof O,
>(obj: O, keys: K[]) {
  return pickOmitImpl(obj, keys, false);
}

/**
 * Underlying implementation for `pick` and `omit`.
 * @param {Object} obj Object to clone from.
 * @param {Array<string>} keys Keys to include/exclude.
 * @param {boolean} doPick `true` to include keys, `false` to exlclude them.
 * @returns Object with/without given keys.
 */
function pickOmitImpl<
  O extends object, // Record<PropertyKey, unknown>,
  K extends keyof O = keyof O,
>(obj: O, keys: K[], doPick: boolean): Partial<O> {
  const objKeys = Object.keys(obj || {});
  const o = {};
  objKeys.forEach((k) => {
    if (keys.includes(k as K) !== !doPick) {
      o[k] = obj[k];
    }
  });
  // console.log('pick/omit', { objKeys, keys, doPick, result: Object.keys(o) });
  return o;
}

/**
 * Shallow-clones the "interesting" properties from a collection item.
 */
function collectionDebugInfo(obj: Record<PropertyKey, unknown>) {
  // Not sure if "allowlist" or "denylist" is a cleaner mechanism... the former
  // is safer, but prevents "additional" things from appearing. I think,
  // however, that the top-level properties are really convenience accessors for
  // stuff in `data.page`, and therefore `pick` should be okay...

  const o = omit(obj, [
    '_templateContent',
    'checkTemplateContent',
    'content',
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
  o.data = omit(obj.data as Record<PropertyKey, unknown>, [
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
 */
function arrayslice(
  arr: any[],
  start: number | undefined = undefined,
  end: number | undefined = undefined
) {
  return arr.slice(start, end);
}

/**
 * Splits a string.
 */
function split(
  str: string,
  separator: string | RegExp,
  limit: number | undefined = undefined
) {
  return str.split(separator, limit);
}

/**
 * A combination of Javascript's `string.trimStart` and golang's
 * `strings.TrimPrefix` which removes either leading whitespace or the specified
 * prefix.
 */
function trimstart(str: string, prefix: string | undefined = undefined) {
  if (prefix && str.startsWith(prefix)) {
    return str.substring(prefix.length);
  }
  return str.trimStart();
}

/**
 * A combination of Javascript's `string.trimEnd` and golang's
 * `strings.TrimSuffix` which removes either trailing whitespace or the
 * specified suffix.
 */
function trimend(str: string, suffix: string | undefined = undefined) {
  if (suffix && str.endsWith(suffix)) {
    return str.substring(0, str.length - suffix.length);
  }
  return str.trimEnd();
}

function typeOf(obj: any) {
  return typeof obj;
}

/**
 * A replacement for rejectattr that allows arbitrary path to prop/attr, using
 * lodash.get.
 */
function rejectget(objs: Record<PropertyKey, unknown>[], propPath: string) {
  return _.filter(objs, (o: Record<PropertyKey, unknown>) => !_.get(o, propPath));
}

/**
 * A replacement for selectattr that allows arbitrary path to prop/attr, using
 * lodash.get.
 */
function selectget(objs: Record<PropertyKey, unknown>[], propPath: string) {
  return _.filter(objs, (o: Record<PropertyKey, unknown>) => _.get(o, propPath));
}

/**
 */
export function withConfig(
  eleventyConfig: UserConfig
  // configOptions: Record<PropertyKey, unknown>
) {
  eleventyConfig.addGlobalData('debugConfig', () =>
    pick(eleventyConfig, ['collections', 'dir', 'pathPrefix'])
  );
}

export const filters = {
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
    rejectget,
    selectget,
  },
};

export const shortcodes = {
  async: {},
  sync: {},
};
