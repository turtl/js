<?
define('MBASE', realpath(dirname(__FILE__) . '/..'));
define('SITE_URL', 'http://dev.musio.com');
define('API_URL', '/api');
define('DIRECT_API_URL', 'http://api.dev.musio.com');
define('API_DIR', MBASE . '/../../../api.dev.musio.com/current');
define('ENABLE_APP_INVITES', false);
define('JS_IS_COMPRESSED', false);
define('CSS_IS_COMPRESSED', false);
define('ENABLE_ANALYTICS', true);
define('ANALYTICS_SITE', 'dev');		// (dev|live)
define('TPL_SCRIPT_URL', '/library/templates.php');
define('DISABLE_FEATURED_SCROLL', false);
define('STATIC_FILE_VER', 1);	// this is replaced automatically by deploy script!
define('NOINDEX', true);		// don't index ANY pages on this site!

if(!isset($config)) $config	=	array();

$config['social']	=	array(
	'facebook'		=>	array(
		'key'		=>	'192544634168334',
		'namespace'	=>	'musiodev'			// musioint (internal) || musiodev (dev) || musioapp (prod)
	)
);

if(isset($config['analytics'])) $config['analytics'] = $config['analytics'][ANALYTICS_SITE];
?>
