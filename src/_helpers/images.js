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
 * @typedef ElementAttributes
 * @type {object}
 * @property {string} alt Alt text for the image.
 * @property {string} class Class(es) for the element.
 * @property {string} style Style(s) for the element.
 */

/**
 * @typedef ImageOptions
 * @type {object}
 * @property {string} src Original source image (how do we ensure this?)
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
  const metadata = await Image(src, defaultImageGenOpts);
  const html = generateBetterHTML(metadata, options);
  return html;
}

/**
 * Renders a `<picture>` element for a given image.
 * @param {string} src : Path to the original image.
 * @param {ImageOptions} options Rendering options.
 * @returns Rendered HTML string for the image.
 */
function imageSync(src, options = undefined) {
  // kick off image generation, but don't await it!
  Image(src, defaultImageGenOpts);
  const metadata = Image.statsSync(src, defaultImageGenOpts);
  const html = generateBetterHTML(metadata, options);
  return html;
}

/**
 * Improved version of Image.generateObject().  Instead of each element having
 * attributes (if an object) *or* children (if an array), always uses an object
 * but with a `children` property for any child elements.
 * @param {Image.Metadata} metadata Image metadata to use.
 * @param {ImageOptions} options Rendering options.
 * @returns Object representing elements.
 */
function generateBetterObject(metadata, options = undefined) {
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
      `Could not find the lowest <img> source for responsive markup for ${opts.src}`
    );
  }

  // The url for the smallest image, but the width/height of the largest
  const lowsrcAttributes = Object.assign(
    {
      src: lowsrc[0].url,
      width: lowsrc[lowsrc.length - 1].width,
      height: lowsrc[lowsrc.length - 1].height,
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
  const missingSizesError = `Missing "sizes" attribute on shortcode from: ${opts.src}`;

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
 * @param {Image.Metadata} metadata Image metadata to use.
 * @param {ImageOptions} options Rendering options.
 * @returns Rendered HTML string.
 */
function generateBetterHTML(metadata, options = undefined) {
  const obj = generateBetterObject(metadata, options);
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
 * Renders a tag with attributes. (lifted from 11ty/image)
 * @param {string} tagName Tag to render, like `img` or `picture`.
 * @param {Object} attrs Attributes to include on the tag/element.
 * @returns Rendered HTML for the tag.
 */
function mapObjectToHTML(tagName, attrs = {}) {
  let attrHtml = Object.entries(attrs)
    .map((entry) => {
      let [key, value] = entry;
      // hack: remove width/height on img to allow 100% width...
      if (key === 'width' || key === 'height') {
        return '';
      }
      return `${key}="${value}"`;
    })
    .filter((x) => x)
    .join(' ');

  return `<${tagName}${attrHtml ? ` ${attrHtml}` : ''}>`;
}

async function backgroundImage(src, quote = "'") {
  let metadata = await Image(src, defaultImageGenOpts);

  const formats = Object.keys(metadata);

  const imageSet = formats
    .map((format) => {
      const url = metadata[format][0].url;
      return `url(${quote}${url}${quote}) type(${quote}image/${format}${quote})`;
    })
    .join(', ');

  // Many browsers don't support the "by type", so we include non-image-set as
  // well...
  const bgImageKinds = [
    `url(${metadata.jpeg[0].url})`,
    `-webkit-image-set(${imageSet})`,
    `image-set(${imageSet})`,
  ];

  return bgImageKinds.map((kind) => `background-image: ${kind};`).join(' ');
}

module.exports = {
  filters: {
    async: {},
    sync: {},
  },
  shortcodes: {
    async: {
      image,
      backgroundImage,
    },
    sync: {
      imageSync,
    },
  },

  generateBetterObject,
  generateBetterHTML,
};
