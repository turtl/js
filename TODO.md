v0.7:

- allow pasting into login fields?
- set invite secret input to type="password"
- import/export
- Clean out bookmarker junk

v1043.56.1:

- header: drive page title, action items, and menu items off of url (store as
  config options in the routes file). this allows deterministic header state
  based off url, and frees controllers from any responsibility, allowing them
  to just track back state.

