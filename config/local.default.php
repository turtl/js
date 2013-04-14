<?
define('MBASE', realpath(dirname(__FILE__) . '/..'));
define('SITE_URL', 'http://musio.dev');
define('API_URL', '/api');
define('DIRECT_API_URL', 'http://api.musio.dev');
define('API_DIR', MBASE . '/../musio_api');
define('ENABLE_APP_INVITES', false);
define('JS_IS_COMPRESSED', false);
define('CSS_IS_COMPRESSED', false);
define('ENABLE_ANALYTICS', true);
define('ANALYTICS_SITE', 'dev');		// (dev|live)
define('TPL_SCRIPT_URL', '/library/templates.php');
define('DISABLE_FEATURED_SCROLL', true);
define('STATIC_FILE_VER', 1);

if(!isset($config)) $config	=	array();

$config['social']	=	array(
	'facebook'		=>	array(
		'key'		=>	'174543605945615',
		'namespace'	=>	'musioint'			// musioint (internal) || musiodev (dev) || musioapp (prod)
	)
);

if(isset($config['analytics'])) $config['analytics'] = $config['analytics'][ANALYTICS_SITE];
?>
