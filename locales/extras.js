/**
 * This is a file that holds locale entries for items that are not included in
 * the UI.
 *
 * This can be handy if another component loads the UI and has localization it
 * wants to do. Ideally, that component would have its own localization, but to
 * be frank it seems stupid to not store it in one place, and the UI is the
 * common piece here, so we just put it here and be done with it.
 *
 * Having these entries here makes sure that `scripts/i18n-tool` will find them
 * when generating locale templates for us.
 */
i18next.t('New bookmark');
i18next.t('File saved to Download/{{filename}}');
i18next.t('There was a problem saving the file {{filename}}.');

