<?
/**
 * store any needed php functions in here, such as image url rewriting to S3 
 * and shit.
 */

function arrg($data, $place, $default = null)
{
	if(!isset($data[$place])) return $default;
	return $data[$place];
}

function error($status, $msg, $options = array())
{
	header(get_status_header($status));
	$err	=	array(
		'code'	=>	arrg($options, 'code', -1),
		'msg'	=>	$msg
	);
	die(json_encode($err));
}

/**
 * rewrite image urls for S3/cloudfront
 */
function url($url)
{
	return $url;
}

function js_url()
{
	// write the PHP url() function above in JS here and include in your templates OR ELSE
}

/**
 * Given an HTTP status code, return the corresponding header text.
 * 
 * @param integer $code		HTTP status code
 * @param bool $construct	whether or not to construct the full header:
 * 							(true)		HTTP/1.1 301 Moved Permanently
 * 							(false)		Moved Permanently
 * @return string			header text
 */
function get_status_header($code, $construct = true)
{
	$codes = array(
		100	=>	'Continue',
		101	=>	'Switching Protocols',
		200	=>	'OK',
		201	=>	'Created',
		202	=>	'Accepted',
		203	=>	'Non-Authoritative Information',
		204	=>	'No Content',
		205	=>	'Reset Content',
		206	=>	'Partial Content',
		300	=>	'Multiple Choices',
		301	=>	'Moved Permanently',
		302	=>	'Found',
		303	=>	'See Other',
		304	=>	'Not Modified',
		305	=>	'Use Proxy',
		306	=>	'(Unused)',
		307	=>	'Temporary Redirect',
		400	=>	'Bad Request',
		401	=>	'Unauthorized',
		402	=>	'Payment Required',
		403	=>	'Forbidden',
		404	=>	'Not Found',
		405	=>	'Method Not Allowed',
		406	=>	'Not Acceptable',
		407	=>	'Proxy Authentication Required',
		408	=>	'Request Timeout',
		409	=>	'Conflict',
		410	=>	'Gone',
		411	=>	'Length Required',
		412	=>	'Precondition Failed',
		413	=>	'Request Entity Too Large',
		414	=>	'Request-URI Too Long',
		415	=>	'Unsupported Media Type',
		416	=>	'Requested Range Not Satisfiable',
		417	=>	'Expectation Failed',
		500	=>	'Internal Server Error',
		501	=>	'Not Implemented',
		502	=>	'Bad Gateway',
		503	=>	'Service Unavailable',
		504	=>	'Gateway Timeout',
		505	=>	'HTTP Version Not Supported'
	);
	
	$header	=	isset($codes[$code]) ? $codes[$code] : '';
	if($construct)
	{
		$header	=	'HTTP/1.1 ' . $code . ' ' . $header;
	}
	
	return $header;
}
