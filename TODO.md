v0.7:

- app-wide shortcuts without using global
- get katex working??
  - https://github.com/Khan/KaTeX
  - https://github.com/turtl/js/blob/master/views/help/markdown.hbs
  - https://github.com/turtl/js/issues/151
- allow pasting into login fields?
- set invite secret input to type="password"
- import/export
- Clean out bookmarker junk
- ctrl+enter to save note

v1043.56.1:

- header: drive page title, action items, and menu items off of url (store as
  config options in the routes file). this allows deterministic header state
  based off url, and frees controllers from any responsibility, allowing them
  to just track back state.

