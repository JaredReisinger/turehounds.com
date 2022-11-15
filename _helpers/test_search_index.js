const fs = require('fs');
const lunr = require('lunr');

const windowPolyfill = require('node-window-polyfill');

const SEARCH_INDEX = '_site/static/js/search_index.js';

main();

function main() {
  console.log('testing search...');
  windowPolyfill.register();
  const data = fs.readFileSync(SEARCH_INDEX).toString();
  eval(data); // approximate browser loading!
  // console.log('search index?', window.SEARCH_INDEX);

  const idx = lunr.Index.load(window.SEARCH_INDEX.idx);

  const allResults = idx.search('disa');

  // console.dir(results, { depth: null });
  const totalCount = allResults.length || 0;
  const count = totalCount > 10 ? 10 : totalCount;
  const results = allResults.slice(0, count);
  // console.log(
  //   `results ${count} of ${totalCount}:`,
  //   results.map((r) => r.ref)
  // );

  const html = buildSearchResults(results, window.SEARCH_INDEX.previews);

  console.log('result HTML:', html);
}

function buildSearchResults(results, previews) {
  const htmls = results.map((r) => {
    const { l: link, t: title, p: preview } = previews[r.ref];
    return `<div class="search-result"><div class="search-result-title"><a href="${link}">${title}</a><div><div class="search-result-preview">${preview}</div></div>`;
  });

  return htmls.join('\n');
}
