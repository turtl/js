v0.7:

- set api endpoint on login/join pages
- join
- note interface
  - search: sorting not working
  - search: viewstate.searching = true not being set (red dot not showing up)
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

