<?
$base	=	dirname(__FILE__);
require $base . '/config/config.php';
require $base . '/config/local.php';
require $base . '/library/functions.php';

$https	=	false;

$valid_invite		=	false;
$bad_invite			=	false;
$in_social_login	=	false;
$content			=	false;

// landing page logicccc
include $base . '/views/layouts/default.php';
