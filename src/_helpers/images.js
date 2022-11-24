// Image shortcode implementations
const Image = require('@11ty/eleventy-img');

// We want the general-purpose `image` shortcode to be async, which allows the
// image to be on-disk before the update is rendered and the browser refreshed.
// But for a Nunjucks macro, we need non-async because macros can't use async.
// To that end, this is factored to share as much implementation as possible.
//
// Also, the documentation on @11ty/eleventy-img doesn't really describe a lot
// about what the attributes and options mean, and the names are vague.  As this
// gets refined, we will hopefully add some clarity.
//
// The shortcodes need to generate HTML (string) output, but the sync/async
// difference is basically in the very first lines of code, which makes sharing
// an implementation tricky.

/** The standard set of sizes/formats we want to generate */
const defaultImageGenOpts = {
  widths: [null, 1280, 1024, 600],
  formats: ['webp', 'jpg'],
  outputDir: './_site/static/img/',
  urlPath: '/static/img/',
};

// So... the examples that create shortcodes for eleventy-image don't have great
// consumability/extensibility design.  This wrapper attempts to solve some of
// those problems... and maybe should become a plugin in its own right?
//
// Rather than positional arguments (which can't be omitted if a later one is
// needed), we use a structured object for the options *other than* `src`.

/**
 * This is basically the same at @11ty/eleventy-img's `ImageOptions`.
 * @typedef {object} ImageGenOptions
 * @property {number[]} widths
 * @property {string[]} formats
 * @property {string} outputDir
 * @property {string} urlPath
 */

/**
 * @typedef {object} ElementAttributes
 * @property {string} class Class(es) for the element.
 * @property {string} style Style(s) for the element.
 */

/**
 * @typedef {object} ImageOptions
 * @property {ImageGenOptions} generate
 * @property {string} alt (Should this just go inside img?)
 * @property {string} sizes
 * @property {string} loading
 * @property {string} decoding
 * @property {ElementAttributes} image
 * @property {ElementAttributes} picture
 * @property {ElementAttributes} img
 */

/**
 * Renders a `<picture>` element for a given image.
 * @param {string} src Path to the original image.
 * @param {ImageOptions} options Rendering options.
 * @returns Rendered HTML string for the image.
 */
async function image(src, options = undefined) {
  // kick off--and wait for!--the image to generate
  const genOpts = mergeImageGenOptions(options?.generate);
  const metadata = await Image(src, genOpts);
  const html = generateBetterHTML(src, metadata, options);
  return html;
}

/**
 * Renders a `<picture>` element for a given image.
 * @param {string} src Path to the original image.
 * @param {ImageOptions} options Rendering options.
 * @returns Rendered HTML string for the image.
 */
function imageSync(src, options = undefined) {
  // kick off image generation, but don't await it!
  const genOpts = mergeImageGenOptions(options?.generate);
  Image(src, genOpts);
  const metadata = Image.statsSync(src, genOpts);
  const html = generateBetterHTML(src, metadata, options);
  return html;
}

/**
 * A helper for thumbnail images, generating just a single, specific-width
 * image.  Intended for things like open-graph tags and the like.
 * @param {string} src Path to the original image.
 * @param {number} width Target width for the image.
 * @returns A URL for the generated image.
 */
function imageUrl(src, width) {
  const genOpts = mergeImageGenOptions({ widths: [width], formats: ['jpg'] });
  // const metadata = await Image(src, genOpts);
  Image(src, genOpts);
  const metadata = Image.statsSync(src, genOpts);
  const obj = generateBetterObject(src, metadata);
  // console.log('****', obj.img.src);
  return obj.img.src;
}

/**
 * Merges provided image generation options with the defauls.
 * @param {ImageGenOptions} options generation options
 * @returns Merged object.
 */
function mergeImageGenOptions(options = undefined) {
  return Object.assign({}, defaultImageGenOpts, options);
}

/**
 * Improved version of Image.generateObject().  Instead of each element having
 * attributes (if an object) *or* children (if an array), always uses an object
 * but with a `children` property for any child elements.
 * @param {string} src : Path to the original image.
 * @param {Image.Metadata} metadata Image metadata to use.
 * @param {ImageOptions} options Rendering options.
 * @returns Object representing elements.
 */
function generateBetterObject(src, metadata, options = undefined) {
  const DEFAULT_OPTIONS = {
    src: '(MISSING)',
    alt: '',
    sizes: '100vw', // ?
    loading: 'lazy',
    decoding: 'async',
  };
  const LOWSRC_FORMAT_PREFERENCE = ['jpeg', 'png', 'svg', 'webp', 'avif'];

  const opts = Object.assign({}, DEFAULT_OPTIONS, options);

  // recall that metadata keys are in order of format preference, and then
  // small-to-large within each format.

  // If there is one format and one size, just return an "img" element.  For one
  // format with multiple sizes, we return "img" with a srcset.  With multiple
  // formats, return "picture"
  const formats = Object.entries(metadata);
  const formatCount = formats.length;
  const entryCount = formats.reduce((acc, [_, v]) => acc + v.length, 0);
  // console.log('got counts', { formatCount, entryCount, formats });

  if (entryCount === 0) {
    throw new Error(
      'No image results (metadata) found from `eleventy-img`. Expects a results object similar to: https://www.11ty.dev/docs/plugins/image/#usage.'
    );
  }

  // TODO: lowsrc calculation?
  let lowsrc;
  for (const format of LOWSRC_FORMAT_PREFERENCE) {
    if (format in metadata && metadata[format].length) {
      lowsrc = metadata[format];
      break;
    }
  }

  if (!lowsrc && formatCount === 1) {
    lowsrc = formats[0][1];
  }

  if (!lowsrc || !lowsrc.length) {
    throw new Error(
      `Could not find the lowest <img> source for responsive markup for ${src}`
    );
  }

  // The url for the smallest image, but the width/height of the largest
  const lowsrcAttributes = Object.assign(
    {
      src: lowsrc[0].url,
      // REVIEW: do we really want width/height on the low-level fallback?
      // width: lowsrc[lowsrc.length - 1].width,
      // height: lowsrc[lowsrc.length - 1].height,
    },
    opts.image,
    opts.img
  );

  if (entryCount === 1) {
    return {
      img: lowsrcAttributes,
    };
  }

  // For multi-entry images, we *must* have a sizes value!
  const missingSizesError = `Missing "sizes" attribute on shortcode from: ${src}`;

  if (formatCount === 1) {
    if (!opts.sizes) {
      // Per the HTML specification sizes is required srcset is using the `w`
      // unit
      // https://html.spec.whatwg.org/dev/semantics.html#the-link-element:attr-link-imagesrcset-4
      // Using the default "100vw" is okay
      throw new Error(missingSizesError);
    }

    return {
      img: Object.assign({}, lowsrcAttributes, {
        sizes: opts.sizes,
        srcset: Object.values(lowsrc)
          .map((entry) => entry.srcset)
          .join(', '),
      }),
    };
  }

  // If we get this far, we have multiple formats, and need to create the full
  // picture element. The original code filters out the lowsrc iff it has only
  // one size?  That seems like an unnecessary optimization; adding complexity
  // for a very edge case.
  const sources = formats.map(([_, entries]) => {
    if (entries.length > 1 && !opts.sizes) {
      // Per the HTML specification sizes is required srcset is using the `w`
      // unit
      // https://html.spec.whatwg.org/dev/semantics.html#the-link-element:attr-link-imagesrcset-4
      // Using the default "100vw" is okay
      throw new Error(missingSizesError);
    }
    return {
      source: {
        type: entries[0].sourceType,
        srcset: entries.map((entry) => entry.srcset).join(', '),
        sizes: opts.sizes,
      },
    };
  });

  return {
    picture: {
      ...Object.assign({}, opts.image, opts.picture),
      children: [...sources, { img: lowsrcAttributes }],
    },
  };
}

/**
 * Renders the `<picture>` element for the given image. Based on
 * `Image.generateHTML`, but adds some tweaking of the output.
 * @param {string} src : Path to the original image.
 * @param {Image.Metadata} metadata Image metadata to use.
 * @param {ImageOptions} options Rendering options.
 * @returns Rendered HTML string.
 */
function generateBetterHTML(src, metadata, options = undefined) {
  const obj = generateBetterObject(src, metadata, options);
  const html = renderObjectHTML(obj);
  // console.log('GENERATED', obj, html);
  return html;
}

/**
 * Renders an object-representation for an HTML element; expects an object with
 * a single property which is the tag name
 * @param {object} obj
 * @returns HTML for the object element.
 */
function renderObjectHTML(obj) {
  // console.log('renderObjectHTML', obj);
  const entries = Object.entries(obj);
  if (entries.length !== 1) {
    throw new Error(
      `expected single property in object, got ${Object.keys(obj).join(', ')}`
    );
  }

  const [tagName, attrs] = entries[0];
  return renderTagAttrHTML(tagName, attrs);
}

/**
 * Renders an element with the given attributes.
 * @param {string} tagName
 * @param {object} attrs
 * @returns HTML for the element.
 */
function renderTagAttrHTML(tagName, attrs) {
  // console.log('renderTagAttrHTML', { tagName, attrs });
  // "children" is handled differently from the other attributes!
  const { children, ...rest } = attrs || {};

  const attrHtml = Object.entries(rest)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const childrenHtml = (children || []).map(renderObjectHTML).join('');

  return `<${tagName}${attrHtml ? ` ${attrHtml}` : ''}>${
    childrenHtml ? `${childrenHtml}</${tagName}>` : ''
  }`;
}

/**
 * @typedef {object} BackgroundImageOptions
 * @property {string} quote Character to use for quote (' by default).
 * @property {string} before List of layers to put before the image.
 * @property {string} after List of layers to put before the image.
 */

/**
 * Returns a series of `background-image` values to be used in the style of an
 * element in order to give it a background image.
 * @param {string} src original source image
 * @param {BackgroundImageOptions} options options for background-image
 */
async function backgroundImage(src, options) {
  const opts = Object.assign({}, { quote: "'" }, options);
  const { quote, before, after } = opts;

  // For background-image image-set, there's a way to specify "resolution", but
  // not "size".  We aim for a reasonable resolution (1280) with no size
  // fallbacks.
  const metadata = await Image(src, {
    ...defaultImageGenOpts,
    widths: [1280],
    sharpWebpOptions: { quality: 50 },
    sharpJpegOptions: { quality: 50 },
  });
  // console.log('background metadata', metadata);
  const formats = Object.values(metadata).map((list) => list[0]);

  const imageSet = formats
    .map((format) => {
      return `url(${quote}${format.url}${quote}) type(${quote}${format.sourceType}${quote})`;
    })
    .join(', ');

  // Many browsers don't support the "by type", so we include non-image-set as
  // well... (and if they don't handle image-set, they might not handle webp,
  // either, so we just fall back to jpeg.)
  const bgImageKinds = [
    `url(${metadata.jpeg[0].url})`,
    `-webkit-image-set(${imageSet})`,
    `image-set(${imageSet})`,
  ];

  return bgImageKinds
    .map(
      (kind) =>
        `background-image: ${before ? `${before}, ` : ''}${kind}${
          after ? `, ${after}` : ''
        };`
    )
    .join(' ');
}

module.exports = {
  filters: {
    async: {},
    sync: {},
  },
  shortcodes: {
    async: {
      image,
      // imageUrl,
      backgroundImage,
    },
    sync: {
      imageSync,
      imageUrl,
    },
  },

  generateBetterObject,
  generateBetterHTML,
  renderObjectHTML,
  renderTagAttrHTML,
};
