import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

// Rather than load the titles as a 11ty data file, it's encapulated by this
// "plugin" so that all of the needed variants are exposed.  I tried doing this
// using a "normal" data file, but couldn't guarantee it was loaded when the
// `addGlobalData` helper was called.  :-(

interface RawTitleData {
  levels: Record<string, string>;
  // # - - KEY
  // #   - NAME
  // #   - DESC
  // #   - DEFAULT TITLE (opt)  --- ever used?
  // #   - - - TITLE-LETTERS
  // #       - TITLE NAME
  // #       - DESC
  // #       - [SUPERCEDES]
  // #       - PREFIX?
  events: RawTitleEvent[];
}

/**
 * tuple: [key, name, description, default title (opt? unused?), details[]]
 */
type RawTitleEvent =
  | [string, string, string, string, RawTitleDetail[]]
  | [string, string, string, RawTitleDetail[]];

/**
 * tuple: [title-letters, title-name, description, supercedes?, prefix? ]
 */
type RawTitleDetail = [string, string, string, string[]?, 'PREFIX'?];

interface TitleInfo {
  title: string;
  name: string;
  desc?: string;
  supercedes?: string[];
  isPrefix?: boolean;
}

interface TitleEvent {
  key: string;
  name: string;
  desc: string;
  titles: TitleInfo[];
}

type TitleData = Omit<RawTitleData, 'events'> & { events: TitleEvent[] };

type TitleMap = Record<
  string,
  { name: string; desc: string; info: TitleInfo; event: TitleEvent }
>;

let titleMap: TitleMap = undefined;

export function ensureTitleMap() {
  if (titleMap) {
    return titleMap;
  }

  const { /* levels, */ events } = ensureTitleData();

  // console.log('EVENTS', events);
  titleMap = events.reduce<TitleMap>((memo, evt) => {
    // console.log('*** event', evt);
    return evt.titles.reduce<TitleMap>((memo2, titleInfo) => {
      // *not* getting supercedes or isPrefix!
      const { title, name, desc } = titleInfo;
      if (title in memo2) {
        // TODO: handle title collisions!
        throw new Error(`title ${title} is already used!`);
      }
      memo2[title] = { name, desc, info: titleInfo, event: evt };
      return memo2;
    }, memo);
  }, {});

  // console.log('TITLE MAP', titleMap);

  return titleMap;
}

let titleData: TitleData = undefined;

export function ensureTitleData() {
  if (titleData) {
    return titleData;
  }

  const titleDataFile = path.resolve(__dirname, 'titles.yaml');
  const titleDataYaml = fs.readFileSync(titleDataFile).toString();
  const rawTitleData = yaml.load(titleDataYaml, {
    filename: titleDataFile,
  }) as RawTitleData;

  // We should normalize the title data here!
  const events = rawTitleData.events.map<TitleEvent>(
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

      const titles = titleInfos.map<TitleInfo>(
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

          const titleInfo: TitleInfo = {
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
            titleInfo.isPrefix = !!isPrefix;
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

export function getTitleLevels() {
  const { levels } = ensureTitleData();
  return levels;
}

export function getTitleEvents() {
  const { events } = ensureTitleData();
  return events;
}

export function titlify(str: string) {
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

// write a titleMap file for client-side title decoding...
export function writeTitleMap(filename: string) {
  const leanMap = Object.fromEntries(
    Object.entries(ensureTitleMap()).map(([title, obj]) => [
      title.toUpperCase(),
      `${title}: ${obj.name}${
        obj.event.name !== obj.name ? `—${obj.event.name}` : ''
      }`,
    ])
  );
  fs.writeFileSync(filename, `window.titleMap = ${JSON.stringify(leanMap)};`);
}
