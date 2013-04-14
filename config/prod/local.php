<?
define('MBASE', realpath(dirname(__FILE__) . '/..'));
define('SITE_URL', 'http://musio.com');
define('API_URL', '/api');
define('API_DIR', '/srv/www/api.musio.com/current');
define('DIRECT_API_URL', 'http://api.musio.com');
define('ENABLE_APP_INVITES', false);
define('JS_IS_COMPRESSED', true);
define('CSS_IS_COMPRESSED', true);
define('ENABLE_ANALYTICS', true);
define('ANALYTICS_SITE', 'prod');		// (dev|prod)
define('TPL_SCRIPT_URL', '/library/templates.php');
define('DISABLE_FEATURED_SCROLL', false);
define('STATIC_FILE_VER', 1);	// this is replaced automatically by deploy script!

if(!isset($config)) $config	=	array();

$config['social']	=	array(
	'facebook'		=>	array(
		'key'		=>	'151796044879445',
		'namespace'	=>	'musioapp'			// musioint (internal) || musiodev (dev) || musioapp (prod)
	)
);

if(isset($config['analytics'])) $config['analytics'] = $config['analytics'][ANALYTICS_SITE];
?>
