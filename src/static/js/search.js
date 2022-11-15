// console.log('search script loaded');
// console.log('search index', window.SEARCH_INDEX ? 'exists' : 'does not exist');
// console.log('lunr', window.lunr ? 'exists' : 'does not exist');

// search('disa');

let idx;

function ensureSearchIndex() {
  if (!idx) {
    idx = lunr.Index.load(window.SEARCH_INDEX.idx);
  }

  return idx;
}

function search(query) {
  if (!query) {
    return '';
  }

  const idx = ensureSearchIndex();
  const allResults = idx.search(query);

  const totalCount = allResults.length || 0;
  const count = totalCount > 10 ? 10 : totalCount;
  const results = allResults.slice(0, count);

  let html;

  if (count > 0) {
    html = buildSearchResults(results, window.SEARCH_INDEX.previews);
  } else {
    html = `<div><i>no results found for <b>${query}</b></i></div>`;
  }
  // console.log('result HTML:', html);
  return html;
}

function buildSearchResults(results, previews) {
  const htmls = results.map((r) => {
    const { l: link, t: title, p: preview } = previews[r.ref];
    return `<div class="search-result"><div class="title"><a href="${link}">${title}</a></div><div class="preview"><a href="${link}">${preview}</a></div></div>`;
  });

  return htmls.join('\n');
}
