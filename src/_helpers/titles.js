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

  const { _levels, events } = ensureTitleData();

  // console.log('EVENTS', events);
  titleMap = events.reduce((memo, evt) => {
    // console.log('*** event', evt);
    return evt.titles.reduce((memo2, titleInfo) => {
      // *not* getting supercedes or isPrefix!
      const { title, name, desc } = titleInfo;
      if (title in memo2) {
        throw new Error(`title ${title} is already used!`);
      }
      memo2[title] = { name, desc, info: titleInfo, event: evt };
      return memo2;
    }, memo);
  }, {});

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
  const rawTitleData = yaml.load(titleDataYaml, { filename: titleDataFile });

  // We should normalize the title data here!
  const events = rawTitleData.events.map(
    ([
      eventKey,
      eventName,
      eventDesc,
      defaultTitleOrTitleInfos,
      titleInfosOrUndefined,
    ]) => {
      const haveDefaultTitle = typeof defaultTitleOrTitleInfos === 'string';
      const defaultTitle = haveDefaultTitle
        ? defaultTitleOrTitleInfos
        : eventName;
      const titleInfos = haveDefaultTitle
        ? titleInfosOrUndefined
        : defaultTitleOrTitleInfos;

      const titles = titleInfos.map(
        ([title, titleNameRaw, titleDesc, supercedes, isPrefix]) => {
          let titleName = titleNameRaw ?? '^^';
          const levelKey = title.slice(-1);
          // TODO: treat a numerical final character as a modifier, and go back
          // one further? "CAX2" --> "Coursing Ability Excellent 2" ?

          // console.log('*** title', {
          //   title,
          //   titleName,
          //   supercedes,
          //   eventName,
          //   levelKey,
          // });
          titleName = titleName.replace('^^', `^1 ^2`);
          titleName = titleName.replace('^1', defaultTitle);
          titleName = titleName.replace(
            '^2',
            `${rawTitleData.levels[levelKey]}`
          );
          titleName = titleName.replace('^', defaultTitle);

          const titleInfo = {
            title,
            name: titleName,
          };

          if (titleDesc) {
            titleInfo.desc = titleDesc;
          }

          if (supercedes) {
            titleInfo.supercedes = supercedes;
          }

          if (isPrefix) {
            titleInfo.isPrefix = isPrefix;
          }

          return titleInfo;
        }
      );

      return {
        key: eventKey,
        name: eventName,
        desc: eventDesc,
        titles,
      };
    }
  );

  titleData = { ...rawTitleData, events };
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
    Object.entries(ensureTitleMap()).map(([title, obj]) => [title, `${obj.name} (${obj.event.name})`])
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
