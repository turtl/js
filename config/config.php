<?
define('API_KEY', '85a49fdd0e3570d11a65f1526faab32e74df50fd');
define('INLINE_TEMPLATES', true);
date_default_timezone_set('UTC');

if(!isset($config)) $config = array();

// setup goals/other options for piwik tracking
// NOTE: *please* try to keep goals in sync. if you add a goal to the live site,
//       add it to the dev site too, and test it!
// you should never have to change the site_ids (unless the piwik installation
// changes).
$config['analytics']	=	array(
	'dev'	=>	array(
		'ga_site_id'	=>	'UA-33048803-2',
		'mp_site_id'	=>	'2e63e2aabca5a360744854d3128e9327',
		'goals'			=>	array(
			'signup'	=>	'Users|signup',
			'upload'	=>	'Media|upload'
		)
	),
	'prod'	=>	array(
		'ga_site_id'	=>	'UA-33048803-1',
		'mp_site_id'	=>	'1d84b9dd4cefbda7954e9d1324b5bab8',
		'goals'			=>	array(
			'signup'	=>	'Users|signup',
			'upload'	=>	'Media|upload'
		)
	)
);
/*
$config['analytics']	=	array(
	'dev'	=>	array(
		'site_id'	=>	2,
		'goals'		=>	array(
			'signup'	=>	1,
			'upload'	=>	2
		)
	),
	'prod'	=>	array(
		'site_id'	=>	5,
		'goals'		=>	array(
			'signup'	=>	1,
			'upload'	=>	2
		)
	)
);
*/
?>
