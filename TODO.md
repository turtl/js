v0.7:

- Clean out bookmarker junk

v1043.56.1:

- header: drive page title, action items, and menu items off of url (store as
  config options in the routes file). this allows deterministic header state
  based off url, and frees controllers from any responsibility, allowing them
  to just track back state.

