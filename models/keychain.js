var KeychainEntry = Composer.Model.extend({
	base_url: '/keychain'
});

var Keychain = Composer.Collection.extend({
	model: KeychainEntry,
	local_table: 'keychain'
});

