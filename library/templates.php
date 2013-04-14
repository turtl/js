<?
if(!isset($no_header))
{
	header('Content-Type: application/javascript');
}

$tpl_base	=	dirname(dirname(__FILE__));

if(isset($_GET['_site_template']) && $_GET['_site_template'] == 1)
{
	$node_js	=	true;
	include $tpl_base . '/index.php';
	die();
}


$load_templates	=	function($dir, $ext = '', $tpls = array()) use (&$load_templates)
{
	$files	=	scandir($dir);
	foreach($files as $file)
	{
		$path	=	$dir . DIRECTORY_SEPARATOR . $file;
		if($file[0] == '.') continue;
		if(is_dir($path))
		{
			$tpls	=	$load_templates($path, $ext, $tpls);
			continue;
		}
		if(!empty($ext) && substr($file, -strlen($ext)) != $ext) continue;
		$tpls[]	=	$path;
	}
	return $tpls;
};
$template_dir	=	$tpl_base . '/views';
$templates		=	$load_templates($template_dir, '.html');
echo 'var _templates = {};'."\n";
foreach($templates as $tpl)
{
	$name		=	str_replace('.html', '', substr(str_replace($template_dir, '', $tpl), 1));


	$contents	=	file_get_contents($tpl);
	$contents	=	str_replace("\\", "\\\\", $contents);
	$contents	=	str_replace("'", "\'", $contents);
	$contents	=	str_replace("\r", '', $contents);
	$contents	=	str_replace("\n", "\\\n", $contents);
	$contents	=	"'" . $contents . "';";

	$tpl		=	'_templates[\''. $name .'\'] = ' . $contents . "\n\n";
	echo $tpl;
}
?>
