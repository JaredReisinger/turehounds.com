const fs = require('fs');
const path = require('path');
const glob = require('glob');

// const UserConfig = require('@11ty/eleventy/src/UserConfig');
const Image = require('@11ty/eleventy-img');

const { generateBetterHTML } = require('./images');

const GALLERY_DIR = 'gallery';
const IMAGE_GLOB = '*.{jpg,png,heic}';

async function autoGallery(galleryClasses = 'columns-sm', imageClasses = '') {
  const { page } = this;
  console.log('building auto-gallery for', page.url);

  // look for images in GALLERY_DIR subdirectory...
  const images = glob.sync(
    path.join(path.dirname(page.inputPath), GALLERY_DIR, IMAGE_GLOB)
  );

  let galleryPathStem = page.filePathStem;
  ['/index', '/default'].forEach((suffix) => {
    if (galleryPathStem.endsWith(suffix)) {
      galleryPathStem = galleryPathStem.substring(
        0,
        galleryPathStem.length - suffix.length
      );
    }
  });

  // output dir will be same as outputPath's parent!
  const outputDir = path.dirname(page.outputPath);

  const items = await Promise.all(
    images.map(async (image) => {
      const metadata = await Image(image, {
        widths: [null, 1280, 1024, 600],
        formats: ['webp', 'jpg'],
        outputDir,
        urlPath: page.url,
      });
      // console.log('image metadata', { image, metadata }, metadata);

      // const stats = fs.statSync(image);
      // console.dir(stats)

      // return {
      //   inputPath: image,
      //   // outputPath,
      //   date: stats.mtime,
      //   data: { metadata },
      // };
      return metadata;
    })
  );

  // console.log('auto-gallery?', items);

  const htmls = items.map((item) =>
    generateBetterHTML(item, { image: { class: 'rounded-lg' } })
  );

  // The `<picture>` element needs to be wrapped in a `div` to get actual column
  // behavior.  Also note that this isn't true masonry, row-first layout, it's
  // column-first layout.
  const html = `<div class="${galleryClasses}">${htmls
    .map((pic) => `<div class="${imageClasses}">${pic}</div>`)
    .join('\n')}<div>`;
  return html;
}

module.exports = {
  filters: {
    async: {},
    sync: {},
  },
  shortcodes: {
    async: { autoGallery },
    sync: {},
  },
  // withConfig,
};
