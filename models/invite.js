var Invite = Composer.Model.extend({
});

var BoardInvite = Invite.extend({
	send: function(board, secret, options)
	{
		options || (options = {});

		tagit.api.post('/invites/boards/'+board.id(), {

		}, {
		});
	}
});
