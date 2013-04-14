<?
	$base		=	dirname(__FILE__);
	$app_base	=	$base . '/..';
	
	if(!(defined('SITE_URL') || defined('API_URL')))
	{
		include $base . '/../config/config.php';
		include $base . '/../config/local.php';
	}
	include $app_base . '/library/functions.php';

	// NOTE: This is unconventional, but I think makes sense in the long run.
	//
	// The problem: a lot of our CSS references #main. this is fine. in fact,
	// I believe in my heart that it is correct semantically and spiritually.
	// The problem is that sometimes (namely for modal content pages), #main
	// exists in more than one place, which screws a lot of things up in JS
	// land. Thusly, we need a way to make CSS still apply to a #main container
	// even if it no longer has the id="main".
	//
	// I believe in my heart that referencing #main in the CSS is great, so I
	// think that it makes sense to leave it, and event make it transparent, but
	// here, rename it to .maincontent, which is the only div in musio with this
	// ID.
	//
	// Also, in the spirit of things, I've generified CSS rewrites. Use wisely,
	// but feel free to use.
	//
	// TL;DR: need to sometimes reference #main even when the div that should be
	// #main isn't #main. This lets me transparently.
	//
	// - Andrew Danger Lyon
	$rewrites	=	array(
		'/\#main\b/'	=>	'.maincontent',
		'/#photos\b/'	=>	'.photoscontent'
	);
	
	if(isset($argv[2]) && $argv[2] == 'https')
	{
		$_SERVER['HTTPS']	=	'on';
	}
	
	$file	=	isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : null;
	if(empty($file))
	{
		if(!isset($_GET['file']))
		{
			$file	=	isset($argv[1]) ? $argv[1] : die('no file specified');
		}
		else
		{
			$file	=	$_GET['file'];
		}
	}
	$file	=	preg_replace('/[^a-z0-9\.\-\_\/]/i', '', $file);
	$file	=	$base .'/'. $file;
	
	$curdir	=	getcwd();
	chdir(dirname(__FILE__));
	if(file_exists($file))
	{
		ob_start();
		include $file;
		$css	=	ob_get_contents();
		ob_end_clean();
		foreach($rewrites as $re => $replace)
		{
			$css	=	preg_replace($re, $replace, $css);
		}
	}
	else
	{
		die('No such CSS file: '. $file);
	}
	
	header('Content-type: text/css');
	echo $css;
	chdir($curdir);

	function include_subfolder($folder)
	{
		if(!is_dir($folder)) return false;
		$files	=	array_filter(scandir($folder), function($file) { if($file[0] == '.') { return false; } return true; });
		foreach($files as $file)
		{
			include $folder . '/' . $file;
		}
	}

	/**
	 * -------------------------------------------------
	 * CSS helper functions. make everyone's life easier
	 * -------------------------------------------------
	 */
	function opacity($val)
	{
		return 'opacity:'.$val.'; filter:alpha(opacity='.(int)($val * 100).')';
	}

	function gradient($topcolor, $bottomcolor, $default = '', $horizontal = false)
	{
		$formatcolor	=	function($color) {
			if(empty($color)) return $color;
			$col	=	preg_replace('/#/', '', $color);
			if(strlen($col) == 3) $col .= $col;
			return '#'.$col;
		};

		$topcolor		=	$formatcolor($topcolor);
		$bottomcolor	=	$formatcolor($bottomcolor);
		$default		=	$formatcolor($default);

		$pos	=	$horizontal ? 'left' : 'top';
		$pos_s	=	$horizontal ? 'left top, right top' : 'left top, left bottom';
		$css	=	array();
		if(!empty($default))
		{
			$css[]	=	'background: '.$default;
		}
		$css[]	=	'background: -moz-linear-gradient('.$pos.', '.$topcolor.' 0%, '.$bottomcolor.' 100%)';
		$css[]	=	'background: -webkit-gradient(linear, '. $pos_s .', color-stop(0%,'.$topcolor.'), color-stop(100%,'.$bottomcolor.'))';
		$css[]	=	'background: -webkit-linear-gradient('.$pos.', '.$topcolor.' 0%,'.$bottomcolor.' 100%)';
		$css[]	=	'background: -o-linear-gradient('.$pos.', '.$topcolor.' 0%,'.$bottomcolor.' 100%)';
		$css[]	=	'background: -ms-linear-gradient('.$pos.', '.$topcolor.' 0%,'.$bottomcolor.' 100%)';
		$css[]	=	'background: linear-gradient('.$pos.', '.$topcolor.' 0%,'.$bottomcolor.' 100%)';
		$css[]	=	'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr=\''.$topcolor.'\', endColorstr=\''.$bottomcolor.'\',GradientType='.($horizontal ? '1' : '0').' )';
		return implode('; ', $css);
	}

	// mainly for automating shit like
	// -moz-border-radius: ...; -webkit-border-radius: ...; ...
	function generic_css_builder()
	{
		$args		=	func_get_args();
		if(count($args) < 3) return '';

		$directive	=	array_shift($args);
		$prefixes	=	array_shift($args);

		$declarations	=	array();
		foreach($prefixes as $prefix)
		{
			$declarations[]	=	trim($prefix . $directive . ': '. implode(' ', $args));
		}
		return implode('; ', $declarations);
	}

	// macros, anyone?
	// TODO: replace this shit with eval(), since CSS is precompiled on the live site newayz
	function border_radius()
	{
		return call_user_func_array(
			'generic_css_builder',
			array_merge(
				array('border-radius', array('-moz-', '-webkit-', '-khtml-', '')),
				func_get_args()
			)
		);
	}

	function box_shadow($v, $h, $blur = '', $spread = '', $color = '', $inset = '')
	{
		return call_user_func_array(
			'generic_css_builder',
			array_merge(
				array('box-shadow', array('-moz-', '-webkit-', '')),
				func_get_args()
			)
		). '; filter: progid:DXImageTransform.Microsoft.Shadow(color=\''.$color.'\', Direction=90, Strength=3)';
	}
?>
