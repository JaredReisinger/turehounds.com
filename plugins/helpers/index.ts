import debugFn from 'debug';
import type UserConfig from '../../@types/@11ty/eleventy/src/UserConfig';

import * as addins from './addins';
import { pick } from './filters.js';

const debug = debugFn('plugin:helpers');

// TODO: we should define our expectation about configOptions and export it!
export default function (
  eleventyConfig: UserConfig,
  configOptions: Record<PropertyKey, unknown>
) {
  debug('loading helpers with config', configOptions);

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

  // if (addins.withConfig) {
  //   addins.withConfig(eleventyConfig, configOptions);
  // }

  eleventyConfig.addGlobalData('debugConfig', () =>
    // somehow, we know that dir and pathPrefix are added by the time the
    // function is called... is this documented anywhere?
    pick(eleventyConfig as UserConfig & { dir: unknown; pathPrefix: unknown }, [
      'collections',
      'dir',
      'pathPrefix',
    ])
  );

  // copy dependency files -- TODO: pass static css/js locations in config?
  eleventyConfig.addPassthroughCopy({
    // photoswipe
    'node_modules/photoswipe/dist/photoswipe.esm.min.js':
      'static/js/photoswipe.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe-lightbox.esm.min.js':
      'static/js/photoswipe-lightbox.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe.css': 'static/css/photoswipe.css',
    // photoswipe captions
    'node_modules/photoswipe-dynamic-caption-plugin/dist/photoswipe-dynamic-caption-plugin.esm.min.js':
      'static/js/photoswipe-dynamic-caption-plugin.esm.min.js',
    'node_modules/photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css':
      'static/css/photoswipe-dynamic-caption-plugin.css',
  });

  // add transform for injecting scripts, etc?
  eleventyConfig.addTransform(
    'gallery-stuff',
    async function (content: string) {
      // debug('transform', this);

      // if we don't see any 'data-pswp' on the page, immediately return the
      // existing content unchanged.
      if (!content.includes('data-pswp')) {
        return content;
      }

      // otherwise, assume we need to inject the photoswipe styles and
      // scripts...
      debug('need photoswipe stuff for', this.page.url);

      const endOfHead = content.indexOf('</head>');
      // debug('CONTENT', content.substring(endOfHead - 50, endOfHead + 10));
      const before = content.substring(0, endOfHead);
      const after = content.substring(endOfHead);

      // can I define this in a sidecar HTML file or something to get syntax
      // formatting?
      const magic = `
<link rel="stylesheet" href="/static/css/photoswipe.css">
<link rel="stylesheet" href="/static/css/photoswipe-dynamic-caption-plugin.css">
<style type="text/css">
#body-content > div > div.columns-xs picture {
  cursor: pointer;
}

div.pswp__dynamic-caption {
  background:
}

div.pswp__dynamic-caption .title {
  font-weight: bold;
}

div.pswp__dynamic-caption .comment {
  margin: 1rem 0;
}

div.pswp__dynamic-caption .date {
  margin: 1rem 0;
  font-style: italic;
}

div.pswp__dynamic-caption .creator {
  margin: 1rem 0;
  font-style: italic;
  font-size: 84%
}

div.pswp__dynamic-caption .artist::before {
  content: 'by ';
}

div.pswp__dynamic-caption .copyright::before {
  content: 'Copyright '
}
</style>
<script type="module">
import PhotoSwipeLightbox from '/static/js/photoswipe-lightbox.esm.min.js';
import PhotoSwipeDynamicCaption from '/static/js/photoswipe-dynamic-caption-plugin.esm.min.js';

const lightbox = new PhotoSwipeLightbox({
  gallery: '#body-content > div > div.columns-xs',
  children: 'div.rounded-lg',
  //children: 'picture',
  bgOpacity: 0.9, // default is 0.8, but captions can be hard to read.
  pswpModule: () => import('/static/js/photoswipe.esm.min.js'),
});

lightbox.addFilter('itemData', (itemData, index) => {
  // console.log('SAW ITEMDATA', { itemData, index });
  // get props from picture...
  const el = itemData.element;
  let data;

  switch (el.tagName) {
    case 'DIV':
      data = el.firstChild.dataset;
      break;
    case 'PICTURE':
      data = el.dataset;
      break;
  }

  if (data) {
    itemData.src = data.pswpSrc;
    // we could get the srcSet straight from the DOM!?

    itemData.width = data.pswpWidth;
    itemData.height = data.pswpHeight;

    // support legacy w & h properties
    itemData.w = itemData.width;
    itemData.h = itemData.height;

    itemData.type = 'image';

    // TODO?: get thumbnail?
    const thumbnailEl = el.querySelector('img');
    if (thumbnailEl) {
      itemData.msrc = thumbnailEl.currentSrc || thumbnailEl.src;
      itemData.alt = thumbnailEl.getAttribute('alt') ?? '';
    }
  }

  //console.log('ITEMDATA FILTER', { tag: el.tagName, data, src: data.pswpSrc, itemData });

  return itemData;
});

const captionPlugin = new PhotoSwipeDynamicCaption(lightbox, {
  type: 'auto',
  // captionContent: () => { return 'THIS IS DUMMY CONTENT.'; },
});

lightbox.init();
//console.log('*** LOADED PHOTOSWIPE', lightbox);
</script>
`;

      return before + magic + after;
    }
  );
}
