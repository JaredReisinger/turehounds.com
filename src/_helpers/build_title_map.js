// Build a search index using cheerio and lunr...
// based on https://github.com/BLE-LTER/Lunr-Index-and-Search-for-Static-Sites/blob/master/build_index.js

const { writeTitleMap } = require('./titles');

const OUTPUT_FILE = '_site/static/js/titleMap.js';

writeTitleMap(OUTPUT_FILE);
