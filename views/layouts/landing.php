<?
$saved	=	false;
if(isset($_POST['email']) && !empty($_POST['email']))
{
	include 'local.php';
	$db	=	$config['db']['db'];
	$m	=	new Mongo($config['db']['host']);
	$d	=	$m->$db;
	$saved	=	$d->mailing->save(array('email' => $_POST['email']));
}
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Musio</title>
		
		<meta charset="utf-8" /> 
		<meta http-equiv="Content-language" content="en" /> 

		<!--<link rel="shortcut icon" href="http://musio.dev/images/favicon.png" type="image/x-icon" />-->
		<link rel="stylesheet" href="/css/landing.css" /> 

		<script src="/library/mootools-1.4.1.js"></script>
		<script src="/library/composer/composer.js"></script>
		<script src="/musio/api.js"></script>
		<script src="/musio/landing.js"></script>
		<script>
			var __site_url			=	'<?=SITE_URL?>';
			var __api_url			=	'<?=API_URL?>';
			var __api_direct_url	=	'<?=DIRECT_API_URL?>';
			var __api_key			=	'<?=MUSIO_API_KEY?>';
			var api	=	new Api(
				__api_url,
				__api_direct_url,
				__api_key,
				function(cb_success, cb_fail) {
					return function(data)
					{
						if(typeof(data) == 'string')
						{
							data	=	JSON.decode(data);
						}
						if(data.__error) cb_fail(data.__error);
						else cb_success(data);
					};
				}
			);
			window.addEvent('domready', function() {
				new MusioLandingInviteController();
			});
		</script>
	</head>
	<body class="landing">
		<div id="wrapper">
			<div class="invite">
				<form>
					<input type="text" name="invite_code" placeholder="Invite code" value="" />
					<input type="submit" value="Let me in" />
				</form>
				<? if($bad_invite) { ?>
					<br/>
					<span style="color: #f77;">That invite code is invalid. Please try again!</span>
				<? } ?>
			</div>
			<div class="everything">
				<form class="email" action="/" method="post">
					<input type="text" name="email" placeholder="your@email.com" />
					<input type="submit" value="Do it." />
					<? if($saved) { ?>
						<div class="msg">Email saved!</div>
					<? } ?>
				</form>

				<div class="text">
				</div>
			</div>
		</div>
	</body>
</html>

