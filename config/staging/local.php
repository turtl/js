<?
define('MBASE', realpath(dirname(__FILE__) . '/..'));
define('SITE_URL', 'http://staging.musio.com');
define('API_URL', '/api');
define('API_DIR', '/srv/www/api.staging.musio.com/current');
define('DIRECT_API_URL', 'http://api.staging.musio.com');
define('ENABLE_APP_INVITES', false);
define('JS_IS_COMPRESSED', false);
define('CSS_IS_COMPRESSED', false);
define('ENABLE_ANALYTICS', true);
define('PIWIK_SITE', 'prod');		// (dev|live)

if(!isset($config)) $config	=	array();

$config['social']	=	array(
	'facebook'	=>	array(
		'key'	=>	'266876536728907'
	)
);

if(isset($config['piwik'])) $config['piwik'] = $config['piwik'][PIWIK_SITE];
?>
