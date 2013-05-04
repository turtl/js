function _t_bookmarklet()
{
	var u = encodeURIComponent(window.location.href);
	var t = encodeURIComponent(document.title);
	var m = encodeURIComponent(document.getElementsByTagName('meta'));
	var d = '';
	for(x in m) { if(m[x].name == 'description') { d = m[x].content; break; } };

	/* TODO: remember to change "http://127..." to <?=__site_url?> in header bar */
    f = 'http://127.0.0.1:81/bookmark?url='+ u +'&title='+ t +'&text='+ d;
	t = function()
	{
		if(!window.open(f, 'tagit', 'location=yes,links=no,scrollbars=no,toolbar=no,width=740,height=525'))
		{
			location.href = f;
		}
    };
    if(/Firefox/.test(navigator.userAgent)) setTimeout(t, 0);
	else t();
}

