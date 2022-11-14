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
const defaultImageOpts = {
  widths: [null, 1280, 1024, 600],
  formats: ['webp', 'jpg'],
  outputDir: './_site/static/img/',
  urlPath: '/static/img/',
};

/**
 * Renders a `<picture>` element for a given image.
 * @param {string} src : Path to the original image.
 * @param {string} alt Alt-text for the image.
 * @param {string} sizes Size specification for the output.
 * @param {Object} options `class` or `style` attributes for the rendered HTML.
 * @returns Rendered HTML string for the image.
 */
 async function image(src, alt = '', sizes = '100vw', options = {}) {
  // kick off--and wait for!--the image to generate
  const metadata = await Image(src, defaultImageOpts);
  const html = generateBetterHTML(metadata, alt, sizes, options);
  return html;
}

/**
 * Renders a `<picture>` element for a given image.
 * @param {string} src : Path to the original image.
 * @param {string} alt Alt-text for the image.
 * @param {string} sizes Size specification for the output.
 * @param {Object} options `class` or `style` attributes for the rendered HTML.
 * @returns Rendered HTML string for the image.
 */
function imageSync(src, alt = '', sizes = '100vw', options = {}) {
  // kick off image generation, but don't await it!
  Image(src, defaultImageOpts);
  const metadata = Image.statsSync(src, defaultImageOpts);
  const html = generateBetterHTML(metadata, alt, sizes, options);
  return html;
}

/**
 * Renders the `<picture>` element for the given image. Based on
 * `Image.generateHTML`, but adds some tweaking of the output.
 * @param {Image.Metadata} metadata Image metadata to use.
 * @param {string} alt Alt-text for the image.
 * @param {string} sizes Size specification for the output.
 * @param {Object} options Options passed to `Image.generateObject`.
 * @returns Rendered HTML string.
 */
function generateBetterHTML(metadata, alt = '', sizes = '100vw', options = {}) {
  // console.log("\n\nMETADATA:", metadata, "\n\n");

  // Why can't we generate the "sizes" part here? or default to "100%" or "100vw"
  const attributes = {
    // class: 'w-full',
    alt,
    sizes,
    loading: 'lazy',
    decoding: 'async',
  };

  // let isInline = options.whitespaceMode !== "block";
  const isInline = true;
  let markup = [];

  const obj = Image.generateObject(metadata, attributes, options);

  // obj is either { img: {...} }, or { picture: [...] }; we apply top-level
  // options either way.
  for (let tag in obj) {
    if (!Array.isArray(obj[tag])) {
      const attrs = { ...obj[tag] };
      if (options?.class) {
        attrs.class = `${attrs.class}${attrs.class ? ' ' : ''}${options.class}`;
      }
      if (options?.style) {
        attrs.style = `${attrs.style}${attrs.style ? ' ' : ''}${options.style}`;
      }
      markup.push(mapObjectToHTML(tag, obj[tag]));
    } else {
      markup.push(
        `<${tag}${options?.class ? ` class="${options.class}"` : ''}${
          options?.style ? ` style="${options.style}"` : ''
        }>`
      );
      for (let child of obj[tag]) {
        let childTagName = Object.keys(child)[0];
        markup.push(
          (!isInline ? '  ' : '') +
            mapObjectToHTML(childTagName, child[childTagName])
        );
      }
      markup.push(`</${tag}>`);
    }
  }
  const result = markup.join(!isInline ? '\n' : '');
  // console.log('generated image HTML:', result);
  return result;
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
    .filter(x => x)
    .join(' ');

  return `<${tagName}${attrHtml ? ` ${attrHtml}` : ''}>`;
}


async function backgroundImage(src, quote = "'") {
  let metadata = await Image(src, /* {
    widths: [1280],
    formats: ['webp', 'jpeg'],
    outputDir: './_site/static/img/',
    urlPath: '/static/img/',
  } */ defaultImageOpts);

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
  async: {
    image,
    backgroundImage,
  },
  sync: {
    imageSync,
  }
};
