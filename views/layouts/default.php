<?
$default_page_title	=	'Repinterblr';
$title	=	trim(isset($content['title']) ? $content['title'] : '');
if(empty($title)) $title = $default_page_title;
?>
<!DOCTYPE html>
<html lang="en" xmlns:fb="http://www.facebook.com/2008/fbml" xmlns:og="http://ogp.me/ns#">
	<head>
		<meta http-equiv="Content-type" content="text/html; charset=utf-8" />
		<meta http-equiv="Content-language" content="en" />

		<? if(defined('NOINDEX') && NOINDEX) { ?>
			<meta name="robots" content="noindex, nofollow">
		<? } ?>

		<title><?=$title?></title>
		
		<link rel="shortcut icon" href="/images/site/favicon.png" type="image/x-icon" />

		<meta name="robots" content="noindex, nofollow">

		<?
			// STATIC_FILE_VER is now automatically incremented by the deploy
			// process...hooray for automation
			$cssver	=	STATIC_FILE_VER;
			$jsver	=	STATIC_FILE_VER;
		?>
		
		<? $cssphp	=	CSS_IS_COMPRESSED ? '' : 'css.php/'; ?>
		<link rel="stylesheet" type="text/css" href="/css/<?=$cssphp?>research.v<?=$cssver?>.css" />
		<!--[if IE]>
			<link rel="stylesheet" type="text/css" href="/css/ie.css" />
		<![endif]-->
		<!--[if lte IE 8]>
			<script src="/library/ieshiv.js"></script>
		<![endif]-->
		
		<script src="/library/mootools-1.4.1.js"></script>
		<? if(JS_IS_COMPRESSED) { ?>
			<script src="/library/composer.v<?=$jsver?>.js"></script>
			<script src="/musio.v<?=$jsver?>.js"></script>
		<? } else { ?>
			<script src="/library/composer/composer.js"></script>
			<script src="/library/composer/composer.relational.js"></script>
			<script src="/library/composer/composer.filtercollection.js"></script>
			<script src="/library/composer/composer.keyboard.js"></script>
			<?
			$get_files	=	function($dir, $ext = '.js', $exclude = array()) use (&$get_files)
			{
				if(!file_exists($dir)) return array();
				$files	=	scandir($dir);
				sort($files);
				$append	=	array();
				foreach($files as $file)
				{
					if($file[0] == '.') continue;
					if(array_reduce($exclude, function($a, $b) use ($file) { return ($a === true || strstr($file, $b) !== false); })) continue;
					if(is_dir($dir.'/'.$file))
					{
						$append	=	array_merge($append, $get_files($dir.'/'.$file, $ext, $exclude));
					}
					else
					{
						if(substr($file, strrpos($file, '.')) != '.js') continue;
						$append[]	=	'/'. $dir .'/'. $file;
					}
				}
				return $append;
			};
			$make_scripts	=	function($includes)
			{
				foreach($includes as $include)
				{
					echo '<script src="'. $include .'"></script>' . "\n";
				}
			};
			// need to load in this order, hence no autoload. FUCKING DEAL WITH IT
			$make_scripts(array(
				'/config/config.js',
				'/config/auth.js',
				'/config/routes.js'
			));
			$make_scripts($get_files('library', '.js', array('ignore', 'plupload', 'mootools-', 'modernizr', 'composer', 'uservoice')));
			echo '<script src="/research.js"></script>' . "\n";
			$make_scripts($get_files('research'));
			$make_scripts($get_files('handlers'));
			$make_scripts($get_files('controllers'));
			$make_scripts($get_files('models'));
			?>
			<? if(!INLINE_TEMPLATES) { ?>
				<script src="<?=TPL_SCRIPT_URL?>"></script>
			<? } ?>
		<? } ?>
		<script>
			var __site_url			=	'<?=SITE_URL?>';
			var __api_url			=	'<?=API_URL?>';
			var __api_key			=	'<?=API_KEY?>';
		</script>
		<!--[if !IE 7]>
			<style type="text/css">
				#wrap {display:table;height:100%}
			</style>
		<![endif]-->

		<?
			// insert our scraped header tags for this page
			if(isset($content['head']) && count($content['head']) > 0)
			{
				foreach($content['head'] as $do_you_have_a_head)
				{
					echo preg_replace('/<([^\s]+)/i', '<$1 class="scrape-head"', $do_you_have_a_head) . "\n";
				}
			}
		?>
	</head>
	<body class="initial">
		<div id="wrap-modal">
			<div id="wrap">
				<header>
					<h1><a href="/">repinterblr</a></h1>
				</header>

				<div id="main" class="maincontent">
				</div>
			</div>
		</div>

		<div id="footer">
			<footer>
				<div class="gutter">
					Copyright &copy; <?=date('Y')?> Lyon Bros. Enterprises, LLC.
				</div>
			</footer>
		</div>
<?
	if(INLINE_TEMPLATES)
	{
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
				if(!empty($ext) && substr($file, strrpos($file, '.')) != $ext) continue;
				$tpls[]	=	$path;
			}
			return $tpls;
		};
		$template_dir	=	'views';
		$templates	=	$load_templates($template_dir, '.html');
		foreach($templates as $tpl)
		{
			$contents	=	file_get_contents($tpl);
			$name		=	preg_replace('/^[\/\\\]*'.$template_dir.'[\/\\\]*/', '', $tpl);
			$name		=	substr($name, 0, strrpos($name, '.'));
			$tpl	=	'<script type="text/x-lb-tpl" name="'. $name .'">' . "\n";
			$tpl	.=	str_replace('</script>', '</%script%>', str_replace('<script', '<%script%', $contents));
			$tpl	.=	"\n" . '</script>' . "\n";
			echo $tpl;
		}
	}
?>

	</body>
</html>
