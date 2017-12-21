v0.7:

- note interfaces
  - removing a file and saving opens annoying "are you sure?" dialog
  - adding a file to a note re-renders the note view, but doesnt show the
    filename until its closed/re-opened (is data not coming through sync??)
  - note image preview
- reloading doesnt kill previous sync, need to watch out
- adding a board doesnt switch to new board
- sync:
  - need anything special for `move-space`?
  - notify failed syncs `sync:outgoing:failure`
- user settings persist to core
  - need core support?
- invites/sharing
- files
  - core support for grabbing file data?
  - show image files inline
  - when remote files change, make sure we update locally (if image)
- cleanup
  - Protected and all its derivative functions
  - old js syncing stuff
  - old js file syncing junk
- wire up all settings interfaces to core
  - wire up `connected` status
  - change password
  - sync info
  - resend confirmation (need core support?)
  - feedback
- Update bookmarker
  - should be aware of spaces, have space selector
  - bookmarker should accept a URL, fill in the rest itself (title, thumbnail, desc)
  - should save last space/last board used

