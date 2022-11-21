const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Rather than load the titles as a 11ty data file, it's encapulated by this
// "plugin" so that all of the needed variants are exposed.  I tried doing this
// using a "normal" data file, but couldn't guarantee it was loaded when the
// `addGlobalData` helper was called.  :-(

let titleMap = undefined;

function ensureTitleMap() {
  if (titleMap) {
    return titleMap;
  }

  const { levels, events } = ensureTitleData();

  titleMap = {};
  events.forEach((evt) => {
    // console.log('*** event', evt);
    const [_, eventName, eventDesc, titleInfos] = evt;
    // console.log('***', {eventName, titleInfos});
    titleInfos.forEach((titleInfo) => {
      const [title, titleNameRaw, titleDesc, isPrefix, supercedes] = titleInfo;
      let titleName = titleNameRaw;
      const levelKey = title.slice(-1);
      // console.log('*** title', {
      //   title,
      //   titleName,
      //   supercedes,
      //   eventName,
      //   levelKey,
      // });
      titleName = titleName.replace('^^', `${eventName} ${levels[levelKey]}`);
      titleName = titleName.replace('^', eventName);

      titleMap[title] = {
        name: titleName,
        desc: titleDesc,
        info: titleInfo,
        event: evt,
      };
    });
  });

  // console.log('TITLE MAP', titleMap);

  return titleMap;
}

let titleData = undefined;

function ensureTitleData() {
  if (titleData) {
    return titleData;
  }

  const titleDataFile = path.resolve(__dirname, 'titles.yaml');
  const titleDataYaml = fs.readFileSync(titleDataFile).toString();
  titleData = yaml.load(titleDataYaml, { filename: titleDataFile });

  return titleData;
}

function getTitleLevels() {
  const { levels } = ensureTitleData();
  return levels;
}

function getTitleEvents() {
  const { events } = ensureTitleData();
  return events;
}

function titlify(str) {
  const titleMap = ensureTitleMap();
  const parts = str.split(' ').filter((x) => x);
  return parts
    .map(
      (part) =>
        `<span title="${
          titleMap[part]?.name || '(unknown title)'
        }">${part}</span>`
    )
    .join(' ');
}

/**
 * @param {UserConfig} eleventyConfig
 * @param {Object} configOptions
 */
function withConfig(eleventyConfig, configOptions) {
  eleventyConfig.addGlobalData('titleMap', ensureTitleMap);
  eleventyConfig.addGlobalData('titleLevels', getTitleLevels);
  eleventyConfig.addGlobalData('titleEvents', getTitleEvents);
}

// write a titleMap file for client-side title decoding...
function writeTitleMap(filename) {
  const leanMap = Object.fromEntries(
    Object.entries(ensureTitleMap()).map(([title, obj]) => [title, obj.name])
  );
  fs.writeFileSync(filename, `window.titleMap = ${JSON.stringify(leanMap)};`);
}

module.exports = {
  filters: {
    async: {},
    sync: {
      titlify,
    },
  },
  shortcodes: {
    async: {},
    sync: {},
  },
  withConfig,
  writeTitleMap,
};
