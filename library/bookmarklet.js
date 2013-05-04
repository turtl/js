function _t_bookmarklet()
{
	var u = encodeURIComponent(window.location.href);
	var t = encodeURIComponent(document.title);
	var m = document.getElementsByTagName('meta');
	var d = '';
	var i = false;
	for(var x in m) {if(m[x].name == 'description') {d = m[x].content; break;}}
	for(var x in m)
	{
		if(m[x].getAttribute && m[x].getAttribute('property') == 'og:image')
		{
			i = m[x].content; break;
		}
	}

	if(i) d += '  \\n![image]('+i+')';
	d = encodeURIComponent(d);

    f = '<?=__site_url?>/bookmark?url='+ u +'&title='+ t +'&text='+ d;
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

