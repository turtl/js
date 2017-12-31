v0.7:

- invites/sharing
- cleanup
  - Protected and all its derivative functions
  - old js syncing stuff
  - old js file syncing junk
- wire up all settings interfaces to core
  - change password
  - sync info
  - resend confirmation (need core support?)
  - feedback
- Update bookmarker
  - should be aware of spaces, have space selector
  - bookmarker should accept a URL, fill in the rest itself (title, thumbnail, desc)
  - should save last space/last board used

v1043.56.1:

- header: drive page title, action items, and menu items off of url (store as
  config options in the routes file). this allows deterministic header state
  based off url, and frees controllers from any responsibility, allowing them
  to just track back state.

