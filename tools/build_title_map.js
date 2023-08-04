// Build the title map data file

const { writeTitleMap } = require('../plugins/titles/titles');

const OUTPUT_FILE = '_site/static/js/titleMap.js';

writeTitleMap(OUTPUT_FILE);
