<?
ini_set('html_errors', 0);

include 'config/local.php';
include 'library/functions.php';

function dispatch($command)
{
	switch($command)
	{
	case 'save_profile':
		$profile	=	arrg($_POST, 'profile');
		$file		=	DATA . '/profile.json';
		$fp	=	fopen($file, 'w');
		if(!$fp)
		{
			error(500, 'Couldn\'t save profile.');
		}
		fwrite($fp, $profile, strlen($profile));
		fclose($fp);
		die('true');
		break;
	case 'get_profile':
		$file		=	DATA . '/profile.json';
		if(!file_exists($file)) die('null');
		$profile	=	file_get_contents($file);
		die($profile);
		break;
	case 'post_file':
		break;
	default:
		die('Action '. $command .' not supported.');
	}
}

set_error_handler(function($errno, $errstr, $errfile, $errline, $errcontext = null) {
	error(500, $errstr . ' ('. $errfile .':'. $errline .')', array('code' => $errno));
});

$command = arrg($_GET, 'command');
dispatch($command);
