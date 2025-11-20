# titles plugin

AKC (and other) title lookup tools.

## Background

I wanted something to support a "list of titles" and a "title decoder" for the Ture Hounds website, all generated from a single source of truth.

## Design

The canonical title information is stored in a single YAML file, although very compactly. I am in the process of "un-compacting" it, though, because known-length arrays make editing/updating much more difficult; the data doesn't self-document what it's for.

Here's the new model:

- **`levels`:** A convenience lookup table for common title abbreviations like "Novice" and "Advanced". This exists to allow many titles' "full names" to be inferred simply from the title symbol itself. (e.g. "TKA" means "Trick Dog Advanced" because "TK" is the "Trick Dog" prefix, and "A" is a level lookup.)

- **`qualifiers`:** A set of title-prefix values for things like "AM CH", "AM/CAN CH", etc.

- **`events`:** The events for which titles can be earned. Each event represents a collection of titles.

  - **`name`:** _(required)_ The base name of the event, used as a default portion of the title names as well

  - **`desc`:** _(required)_ A description of the event.

  - **`defaultTitle`:** _(optional)_ The default event name to use in the display names for titles. If omitted, `name` is used instead. (Where the rest of the documentation simply refers to `defaultTitle` for conciseness, understand that it might fall back to just using `name`.)

  - **`key`:** _(required)_ The default level-less symbol for the titles. This maps to `defaultTitle` for the title display names.

  - **`titles`:** _(required)_ A map of "title letters" to information about that title. The same title letters _might_ be used for two or more events, but any one event necessarily defines only one title with a given title-letters.

    - **`name`:** _(optional)_ The name of the title. If the title follows the standard pattern of "_`defaultTitle`_ _`level`_" (`TKA` => `Trick Dog Advanced`), this value can be omitted completely. In addition to a literal name, the following replacements can also be used to reduce typing:

      | symbol | replacement                                                                                                                   |
      | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
      | `^1`   | the value of `defaultTitle`                                                                                                   |
      | `^2`   | the display value of a `levels` key; the last character of the "title letters" key value is used as the level.                |
      | `^3`   | the display value of a `levels` key; the first character of the "title letters" key value is used as the level. **(TODO!!!)** |
      | `^^`   | "`^1 ^2`"                                                                                                                     |

      Another way of looking at an omitted `name` value is that "`^^`" ( or "`^1 ^2`") is used as the default.

    - **`desc`:** _(optional)_ A description for the title.

    - **`supersedes`:** _(optional)_ A list of other title letters keys (for this same event) that this title replaces. For instance, in Conformation `GCH` lists `supersedes: [CH]` to indicate that the `CH` should no longer be used once `GCH` is earned. We don't make much use of this yet, but it could be used to build a "title canonicalizer".

    - **`prefix`:** _(optional)_ Whether this is considered a "prefix title" or not. Defaults to `false` if not specified, as most titles are suffix titles. (We _could_ hoist `prefix` to the event, but I think only Conformation titles would make use of it, so we won't.)
