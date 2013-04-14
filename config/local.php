<?
define('MBASE', realpath(dirname(__FILE__) . '/..'));
define('DATA', MBASE . '/data');
define('SITE_URL', 'http://research.dev');
define('API_URL', '/api.php');
define('JS_IS_COMPRESSED', false);
define('CSS_IS_COMPRESSED', false);
define('TPL_SCRIPT_URL', '/library/templates.php');
define('STATIC_FILE_VER', 1);

if(!isset($config)) $config	=	array();

