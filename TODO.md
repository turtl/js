v0.7:

- adding/updating spaces/notes/boards
  - implement `sync:local` event (when something changes locally in data we want
    to re-search, see controllers/notes/list.js)
- invites/sharing
- sync:
  - when models save, send to core
    - special attention to note model
  - need anything special for `move-space`?
  - wire up `connected` status (mainly on settings)
- files
  - core support for grabbing file data?
  - show image files inline
  - when remote files change, make sure we update locally (if image)
- cleanup
  - Protected and all its derivative functions
  - old js syncing stugg
  - old js file syncing junk
- wire up sharing interfaces to core
- wire up all settings interfaces to core
  - change password
  - delete account
  - sync info
  - resend confirmation (need core support?)
  - feedback
  - clear data
- Update bookmarker
  - should be aware of spaces, have space selector
  - bookmarker should accept a URL, fill in the rest itself (title, thumbnail, desc)
  - should save last space/last board used

