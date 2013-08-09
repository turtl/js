/**
 * This is a wonderful Mootools (1.2+) modal dialog box that's simple, clean, and works well. Its content can be loaded from
 * an ajax call, an image URL on-site or off-site, or a DOM node that exists in the page. Also supports event triggering for
 * generating callbacks based on user actions.
 * 
 * 
 * Copyright (c) 2009, Lyon Bros Enterprises, LLC. (http://www.lyonbros.com)
 * 
 * Licensed under The MIT License. 
 * Redistributions of files must retain the above copyright notice.
 * 
 * @copyright	Copyright (c) 2009, Lyon Bros Enterprises, LLC. (http://www.lyonbros.com)
 * @package		modal
 * @license		http://www.opensource.org/licenses/mit-license.php
 */

// MT1.11 Compat - did we srsly have to get rid of these??
var $E = function(selector, filter) {return ($(filter) || document).getElement(selector)};
var $ES = function(selector, filter) {return ($(filter) || document).getElements(selector)};

/**
 * The modal class, using the Mootools class object. When initialized, this class attaches events to all <a> tags
 * with a rel="modal" set as a parameter. When one of the links is clicked, it opens a modal dialog in the middle
 * of the screen and shows content based on the href of the link.
 * 
 * The href can be one of the following:
 * 1. A URL to a page (on-site only) to be loaded via AJAX:
 * 		<a href="page.html" rel="modal">load page in dialog</a>
 * 2. An image URL (on-site or off-site):
 * 		<a href="http://site.com/big-image.jpg" rel="modal"><img src="thumbnail.jpg"/></a>
 * 3. A Mootools DOM selector:
 * 		<a href="#hidden-div" rel="modal">load contents of div into modal box</a>
 * 
 * You can specify width/height of the box within the rel="..." statement: 
 * 		<a href="contents.html" rel="modal 500 400">open box</a>
 * Which will open a 500x400 (WxH) dialog and constrain the content to those dimensions. This will NOT work with 
 * images! When you load an image in the box, it will ALWAYS use the image's dimensions for the dimensions of the
 * box. 
 * 
 * Also, when loading content from a DOM element, it is physically moved inside the modal box, not copied, and a 
 * "placeholder" element is put in its original spot in the DOM. This allows us to put the element back where it 
 * belongs when the dialog closes without having to "copy" it and risk id conflicts.
 * 
 * The dialog also implements a handful of events that can be bound to: start, complete, close. For instance, you
 * can open a modal box manually w/ modal.open(...) but also say "when it closes, run this_function:"
 * 
 * var this_function = function() {...};
 * modal.addEvent('close', this_function);
 * 
 * NOTE: calling modal.fireEvent('close') will NOT close the box, it will just run all callbacks attached to the
 * close event.
 * NOTE: if you want to change the loading icon of the modal WITHOUT editing this source file (recommended!!),
 * you can set the toplevel variable _modal_load_icon_override to the source of your loading icon.
 * 
 * For a full description of events, see comments for modal_interface::addEvent()
 * 
 * @author		Andrew Lyon <andrew@lyonbros.com>
 */
var modal_interface	=	new Class({
	/**
	 * Configurable options - these are safe to tweak and change
	 */
	options: {
		// default dimensions
		width:				652,
		height:				null,
		
		// TODO: implement max_height vs height
		
		// set to true if none of the URLs in your links are DOM selectors and you don't want to accidentally load 
		// a dom object (not bloody likely). in fact, best to keep this set to false just in case.
		disable_domload:	false,
		
		// when loading content for the modal box, do we want to evaluate javascript?
		evalscripts:		true,

		// whether or not by default to attach the modal open action to links
		// with rel="modal"
		attach_links:		true,
		
		// if we want a gif "LOADING!!" icon, specify URL here
		// TODO: move this to CSS eventually
		load_icon:			'images/modal/load_42x11.gif',

		// if true, will add an overlay div element above the modal container.
		// the container does not live inside the overlay, but above it. this
		// makes for much easier styling.
		overlay:			false,
		
		// if true, will be verbose about errors (using alert boxes)
		debug_mode:			true,
		
		// the dialog will always have a top value of at least this number (in pixels)
		top_cutoff:			50,
		
		// when loading an image, remove padding from the gutter (if set to true)
		image_no_padding:	true,
		
		// when sending an AJAX call to get content, what data shall be sent with the request? (can be null)
		default_data:		{ajax:1},
		
		// if true, will show a javascript confirm dialog before closing the modal box. useful for times when you
		// may be displaying a form and don't want accidental closing of the box to erase form data.
		close_confirm:		false,
		
		// if set to true, will disable closing of the modal box when clicking on one of its childred that are *outside*
		// the box (based on coordinates). for instance, if a dropdown menu inside the modal box goes ourside of the 
		// box and a user clicks an item in the dropdown, the modal box will close unless this is set to true.
		//
		// it's a good idea to set this to true unless you know for a fact you don't want this behavior
		no_close_on_child_click:	true
	},
	
	// ---------------------------------------------------------------
	// You probably don't want to edit anything under this line, unless you are 5uP3r 1337 h4x0r (1yk3 u5)!!
	// ---------------------------------------------------------------
	
	/**
	 * Internally set parameters
	 */
	params: {
		dom_object:			false,		// if set to something, the close function will copy it back here on close
		dom_object_clone:	false,		// our DOM object clone
		mouse_in_box:		false		// tracks if the mouse is over the modal box or one of its children
	},
	
	/**
	 * Central place for DOM objects created and used by the modal interface.
	 */
	objects: {
		container:		false,
		gutter:			false,
		content:		false,
		close:			false,
		placeholder:	false,
		overlay:		false,
		events:			false
	},

	is_open: false,
	
	/**
	 * Create our initial divs used for the modal interface, and a few other objects used in the opening process.
	 * 
	 * Call the function to attach the modal interface to <a> links in the DOM
	 */
	initialize: function(options)
	{
		// set up the parameters
		for(x in options)
		{
			this.options[x]	=	options[x];
		}

		// default to not attaching to links unless we specify
		var attach_links	=	this.options.attach_links;

		// create an element (unique to this modal instance) just for holding events
		this.objects.events	=	new Element('div');

		// create all of our needed divs/objects and inject them into the DOM (only if we haven't already tho)
		if(this.options.overlay)
		{
			var el	=	$('modalbox-overlay');
			if(!this.objects.overlay && !el)
			{
				this.objects.overlay	=	new Element('div');
				this.objects.overlay.id	=	'modalbox-overlay';
				this.objects.overlay.setStyles({
					display: 'none'
				});
				this.objects.overlay.inject(document.body, 'bottom');
			}
			else if(el)
			{
				this.objects.overlay	=	el;
			}
		}

		var el	=	$('modalbox');
		if(!this.objects.container && !el)
		{
			// create the container, holds everything
			this.objects.container		=	new Element('div');
			this.objects.container.id	=	'modalbox';
			this.objects.container.setStyles({
				display:	'none'
			});
		}
		else if(el)
		{
			this.objects.container	=	el;
		}
			
		var el	=	$E('.modalgutter', this.objects.container);
		if(!this.objects.gutter && !el)
		{
			// create the gutter object, wraps around the content
			this.objects.gutter		=	new Element('div');
			this.objects.gutter.addClass('modalgutter');
		}
		else if(el)
		{
			this.objects.gutter		=	el;
		}
		this.objects.gutter.inject(this.objects.container, 'top');
			
		var el	=	$E('.modalcontent', this.objects.container);
		if(!this.objects.content && !el)
		{
			// create our content div
			this.objects.content	=	new Element('div');
			this.objects.content.addClass('modalcontent');
		}
		else if(el)
		{
			this.objects.content	=	el;
		}
		this.objects.content.inject(this.objects.gutter, 'top');

		// inject the container (hidden) into the DOM, bottom of <body>
		this.objects.container.inject(document.body, 'bottom');

		var el	=	$E('.closelink', this.objects.container);
		if(!this.objects.close && !el)
		{
			// create a "close [x]" link, add a close event to it, but don't inject it anywhere (it will be used later)
			this.objects.close			=	new Element('a');
			this.objects.close.href		=	'#close-box';
			this.objects.close.title	=	'Close';
			this.objects.close.addEvent('click', function(e) {
				if(e) e.stop();
				this.close();
			}.bind(this));
			this.objects.close.addClass('closelink');
		}
		else if(el)
		{
			this.objects.close	=	el;
		}
			
		// useful for "bookmarking" where a node should be returned to when using a selector for loading content.
		if(!this.objects.placeholder)
		{
			this.objects.placeholder	=	new Element('div');
		}
		
		if(attach_links)
		{
			// attach to our linky links
			this.attach_links();
		}
	},
	
	/**
	 * Uses even delegation to attach the modal to <a rel="modal..."> tags
	 * 
	 * If you want a link to use the modal box (via AJAX), do 
	 * 		<a href="/page/to/load.html" rel="modal">click here :(</a>
	 * 
	 * You can also use a CSS selector (Mootools compatible):
	 * 		<a href="#content-div" rel="modal">load the hidden div and its contents into a modal box!</a>
	 * 
	 * Or finally, an image (matches by extension, /\.(jpg|jpeg|gif|png)$/i), image can be on separate domain
	 * 		<a href="/page/to/image.jpg" rel="modal">open the image, full size, in a modal box</a>
	 */
	attach_links: function()
	{
		// praise be to event delegation. wow. this code used to be so complicated and buggy.
		document.addEvent('click:relay(a[rel="modal"])', function(e) {
			if(e) e.stop();
			var next_tag_up	=	function(tag, element)
			{
				return element.get('tag') == tag ? element : next_tag_up(element.getParent());
			}
			var a	=	next_tag_up('a', e.target);
			var rel	=	a.get('rel');
			
			// check the rel for width/height. if not found, just use defaults
			var params	=	rel.split(/\s+/);
			var width	=	false;
			var height	=	false;
			var nodom	=	this.options.disable_domload;
			var title	=	el.title ? el.title : '';
			
			// loop over our parameters in the rel attribute. valid params are:
			// modal - this one is obvious, activate the modal box for this link
			// nodom - don't use DOM loading on this specific link...useful for not having to disable all DOM loading
			// numeric values - width/height separated by space
			// 
			// so a possible rel could be:
			// rel="modal nodom 500 300"
			// rel="modal 500 300 nodom"
			// 
			// order does not matter. "modal" could even go at the end, but that's not recommended
			params.each(function(p) {
				if(p.match(/[0-9]+/))
				{
					// we have a numeric value, assume it's width/height
					if(!width)
					{
						// always use the first found numeric value as width
						width	=	p;
					}
					else if(!height)
					{
						// if we already have a width but not a height, assign the second numeric value as height
						height	=	p;
					}
				}
				else if(p.match(/nodom/))
				{
					nodom	=	true;
				}
			});
			
			this.open(el.href, width, height, nodom, title);
		}.bind(this));
	},
	
	/**
	 * Open the modal box, and show its contents at the specified width/height. 
	 * 
	 * Please note that not only is it possible to use the open() method within your other code for opening dialogs manually,
	 * but we encourage it! You can pass more verbose selectors by calling manually, and it also gives the ability to set
	 * fine-tuned callbacks for the modal events.
	 * 
	 * @param string href		URL/DOM selector used to pull content from
	 * @param integer width		width of the box
	 * @param integer height	height of the box (null|0 == expand to size of content)
	 * @param bool nodomload	if true, will only use href as a URL and not try to load a DOM object
	 * @param string title		the title we want to set this box to. really only useful for images
	 */
	// TODO: options options options options!!!!!! WTF WAS I THINKING?!?!
	open: function(href, width, height, nodomload, title)	// ... becomes function(href, options) // DERRR
	{
		// if open, close our modal box (do we srsly want more than one on the screen?)
		this.close(true);
		
		if((!href || href.toString().trim() == '') && (typeof(href) == 'undefined' || !href.inject || (typeof(href.inject != 'function'))))
		{
			this.debug('No URL/DOM selector specified for opening of modal box!');
			return false;
		}
		
		// fire any events we have attached to the modal box's start
		this.fireEvent('start');
		
		// double check our width/height values
		var width	=	width && (parseInt(width) == width) ? width : this.options.width;
		var height	=	height ? height : null;								// if a height isn't specified, let the content decide
		
		// pull out some other vars
		var	evalscripts	=	this.options.evalscripts;
		var nodomload	=	nodomload ? true : false;
		
		// TODO: implement a starting top value (ex right on top a link that was clicked vs the top of the window)
		// get the correct coordinates for positioning our box
		var cheight		=	height ? height : 500;							// if height isn't specified, use a height in our calculations so the box isn't halfway down the screen
		var wincoords	=	window.getCoordinates();
		var left		=	(wincoords.width / 2) - (width / 2);
		var top			=	(wincoords.height / 2) - (cheight / 1.3);		// notice we make use of "cheight" here when calculating the top position of the window
		
		// make sure our top value is not above the cutoff (this way the box is never cut off by the top of the browser)
		if(top < this.options.top_cutoff)
		{
			top	=	this.options.top_cutoff;
		}
		
		// add the scroll height on
		top		+=	this.get_scroll_position_y();
		
		// set up our container object so it's visible and positioned correctly
		this.objects.container.setStyles({
			width:		Math.floor(width)+'px',
			height:		'',
			left:		Math.floor(left)+'px',
			top:		Math.floor(top)+'px',
			display:	'block'
		});

		if(this.objects.overlay)
		{
			this.objects.overlay.setStyle('display', 'block');
		}
		
		// reset some styles that may have been set by previous openings
		this.objects.content.setStyles({
			width:		'',
			height:		'',
			padding:	''
		});
		
		// show a "LOADING!!" icon if configured, and add the "loading" class in case any special styles are needed
		this.objects.container.addClass('loading');
		if(this.options.load_icon)
		{
			this.objects.content.set('html', '<img id="modal_loading_icon" src="'+ this.options.load_icon +'" alt="loading" title="WORKING!!" />');
		}
		
		// see if the "href" is actually a selector
		if(href.inject && typeof(href.inject) == 'function')
		{
			var node	=	href;
		}
		else
		{
			var node	=	$E(href.replace(/.*?#/, '#'));
		}
		
		// make sure if we have a node, it's not the <html> tag (pulled out by default), and we aren't forcing a no DOM load
		if(node && !(node.get('tag') == 'html') && !nodomload)
		{
			// gnar dude, we found a node with the given "URL" (selector). load its contents into the modal box
			// as if we pulled it from a URL
			this.params.dom_object			=	node;
			this.open_complete(false, {height: height});
		}
		else if(href.match(/\.(jpg|jpeg|gif|png)$/i))
		{
			// we's got an image, do tings a bit differently
			var img	=	null;
			
			// create a function that gets called after the image is loaded
			var image_loaded	=	function() {
				// grab padding for our content area and gutter
				
				if(this.options.image_no_padding)
				{
					this.objects.content.setStyle('padding', '0px');
				}
				
				var gpadding	=	parseInt(this.objects.gutter.getStyle('padding'));
				var cpadding	=	parseInt(this.objects.content.getStyle('padding'));
				
				// calculate width/height of our top-level container based on padding and image widths/heights
				var cwidth		=	img.width + (cpadding * 2) + (gpadding * 2);
				var cheight		=	img.height + (cpadding * 2) + (gpadding * 2);
				
				// calculate our left/top values for our top-level container based on our widths and heights. note that this
				// uses some values from above. no point in re-initializing them since they aren't changed
				var left		=	(wincoords.width / 2) - (cwidth / 2);
				var top			=	(wincoords.height / 2) - (img.height / 1.5);
				
				if(top < this.options.top_cutoff)
				{
					top	=	this.options.top_cutoff;
				}
				
				// add on our scroll height
				top	+=	this.get_scroll_position_y();
				
				// we have all our calculated values, update our top-level container with them. keep in mind this is necessary
				// because we are setting a hard width/height based on the content (the image) so we have to recalculate the
				// values taking the padding of the containers into account.
				this.objects.container.setStyles({
					width:	Math.floor(cwidth) + 'px',
					height:	Math.floor(cheight) + 'px',
					left:	Math.floor(left)+'px',
					top:	Math.floor(top)+'px'
				});
				
				// call our open function. we can use our untouched image width/height since we already did all our container
				// resizing
				this.open_complete('<img src="'+ href +'" title="'+ title.trim() +'" />', {width: img.width, height: img.height});
			}.bind(this);
			
			// load a new image and call our image callback once it's loaded and we have width/height values
			img			=	new Image();
			img.onload	=	image_loaded;		// is this safe? works great in FF/IE7+8/Chrome/Opera.
			img.src		=	href;
			img.title	=	title;
		}
		else
		{
			// no node/image found, the href value is probably a URL. send the request and load it into the contents box
			new Request({
				url: href,
				data: this.options.default_data,
				onComplete: function(res) {
					this.open_complete(res, {height: height});
				}.bind(this),
				evalScripts: evalscripts,
				method: 'get'
			}).send();
		}
		
		// set up our events that will close the modalbox (clicking outside the box, hitting escape, etc)
		this.init_close_events();
	},
	
	/**
	 * This function gets called when we get the contents for the box (think onComplete for ajax). It's separate
	 * since it gets called from more than one location (for instance, if we pass a node selector instead of a URL)
	 * 
	 * @param string res		HTML/other result of ajax call, or false in the case of opening a node
	 * @param object args		associative args we can pass, such as width/height
	 */
	open_complete: function(res, args)
	{
		// set up our container and contents with the result we got
		this.objects.container.removeClass('loading');
		
		if(this.params.dom_object)
		{
			// we're pulling "content" from a DOM object (or rather, pulling the object itself)
			var node	=	this.params.dom_object;
			this.objects.content.set('html', '');
			
			// inject our object "placeholder" after the node before we remove it from the view. this way when we 
			// put it back, we know where to stick it, but we also only have one copy of node in the view so if 
			// needed we can reference by id.
			this.objects.placeholder.inject(node, 'after');
			
			// remove our node from its current location...
			node.dispose();
			
			// ...and inject it into our modal content block
			node.inject(this.objects.content, 'bottom');
			
			// save node display mode for later (we don't want to ASSUME it's display:none)
			node.display	=	node.getStyle('display');
			node.setStyle('display', 'block');
		}
		else
		{
			// we're updating based on content...so set the content we grabbed into the modal content area
			this.objects.content.set('html', res);
		}
		
		// set the width/height
		if(args.height)
		{
			this.objects.content.setStyle('height', args.height + 'px');
		}
		
		if(args.width)
		{
			this.objects.content.setStyle('width', args.width + 'px');
		}
		
		// make sure our "close [x]" link gets shoved in there at the top
		this.objects.close.inject(this.objects.content, 'top');

		this.is_open	=	true;
		
		// fire our complete event
		this.fireEvent('complete');
	},

	/**
	 * Replaces the content inside the modal with new content.
	 *
	 * @param string content	content to put into modal
	 */
	replace_content: function(content)
	{
		this.objects.content.set('html', content);
		this.objects.close.inject(this.objects.content, 'top');
	},
	
	/**
	 * Initializes some events that make closing the modal box a SNAP
	 */
	init_close_events: function()
	{
		// this.params.mouse_in_box
		//
		// track whether the mouse is inside the modal box (or one of its children) or not. useful for determining of a click
		// outside the coordinates of the modal should really be considered a close event. consider when you have an autocomplete
		// or dropdown that spills over the edge. normally, a user clicking on it will trigger the close event even though it's
		// inside the modal. this is bad. we try to solve that here!
		this.is_in_modal	=	function(e) { this.params.mouse_in_box = true; }.bind(this);
		this.not_in_modal	=	function(e) { this.params.mouse_in_box = false; }.bind(this);
		
		this.addEvent('mouseenter', this.is_in_modal);
		this.addEvent('mouseleave', this.not_in_modal);
		
		// function to test for the 'esc' key. separate function so it can be specifically removed by modal_interface::close()
		this.test_escape	=	function(e)
		{
			// pretty simple
			if(e.key.toLowerCase && e.key.toLowerCase() == 'esc')
			{
				this.close();
			}
		}.bind(this);
		window.addEvent('keydown', this.test_escape);

		var inside	=	false;
		this.test_click_start	=	function(e)
		{
			// get our container's coordinates
			var coords	=	this.objects.container.getCoordinates();
			
			if((e.page.x < coords.left || e.page.x > coords.right || e.page.y < coords.top || e.page.y > coords.bottom))
			{
				// what do you know, someone clicked outside it. close
				inside	=	false;
			}
			else
			{
				inside	=	true;
			}
			return true;
		}.bind(this);
		
		// function to test for a click outside the modal box. separate function so it can be specifically removed by modal_interface::close()
		this.test_click		=	function(e)
		{
			// if the mousedown event detects that the mousedown happened *in*
			// the modal, then don't close the modal on mouseup (ie click) event
			// if it's outside (since the user is probably click+dragging to
			// select)
			if(inside) return true;
			
			// this.params.mouse_in_box is set to true if the mouse is over any of the children of the box. see comments above
			if(	e.page.x == 0 && (e.page.y == 0 || e.page.y == window.getScroll().y) ||
				(this.options.no_close_on_child_click && this.params.mouse_in_box) )
			{
				// some terrible glitch in mootools, registering a form submission as a click at (0,0)
				// also, in FF, the click registers at (0, window.getScroll().y)
				return true;
			}

			// get our container's coordinates
			var coords	=	this.objects.container.getCoordinates();
			
			if((e.page.x < coords.left || e.page.x > coords.right || e.page.y < coords.top || e.page.y > coords.bottom))
			{
				// what do you know, someone clicked outside it. close
				this.close();
			} 
		}.bind(this);
		window.addEvent('mousedown', this.test_click_start);
		window.addEvent('click', this.test_click);
	},
	
	/**
	 * Closes the modal box and does event cleanup
	 */
	close: function(disable_close_events)
	{
		var disable_close_events	=	disable_close_events ? true : false;
		
		if(this.params.close_confirm && !disable_close_events)
		{
			if(!confirm('Closing this box will lose any unsaved data. Are you sure you want to do this?'))
			{
				return false;
			}
		}

		this.is_open	=	false;
		
		// close (hide) the container
		this.objects.container.setStyles({
			display:	'none'
		});

		if(this.objects.overlay)
		{
			this.objects.overlay.setStyle('display', 'none');
		}
		
		// if we have a DOM object as a content provider, inject it back into where we got it from and remove our placeholder
		if(this.params.dom_object)
		{
			var node	=	this.params.dom_object;
			node.dispose();
			node.setStyle('display', node.display);
			node.inject(this.objects.placeholder, 'after');
			this.objects.placeholder.dispose();
			this.params.dom_object	=	false;
		}
		
		// remove our slappy close events (won't need them now)
		this.removeEvent('mouseenter', this.is_in_modal);
		this.removeEvent('mouseleave', this.not_in_modal);
		window.removeEvent('keydown', this.test_escape);
		window.removeEvent('click', this.test_click);
		window.removeEvent('mousedown', this.test_click_start);
		
		if(!disable_close_events)
		{
			// fire our close event
			this.fireEvent('close');
		}
	},
	
	// ----- Events code, includes important hook events -----
	
	/**
	 * Add an event to the modal box. The event is actually added to the modal container element, so things like "click"
	 * will be all-encompassing. There are also some custom events (used as hooks):
	 * 
	 *  start:		This event is called at the very start of a valid modal box open, before displaying or resizing or anything
	 *  complete:	Called after the content is loaded and displayed, the last action of the modal box
	 *  close:		Called right after the modal box is closed
	 * 
	 * @param string type		type of event to add
	 * @param function fnct		function to attach
	 */
	addEvent: function(type, fnct)
	{
		this.objects.events.addEvent(type, fnct);
	},
	
	/**
	 * Remove an event from the modal box
	 * 
	 * @param string type		type of event to remove
	 * @param function fnct		function to remove
	 * @see modal_interface::addEvent()
	 */
	removeEvent: function(type, fnct)
	{
		this.objects.events.removeEvent(type, fnct);
	},
	
	/**
	 * Remove all events for a specific type
	 * 
	 * @param string type		type of event to remove
	 */
	removeEvents: function(type)
	{
		this.objects.events.removeEvents(type);
	},
	
	/**
	 * Fire an event manually.
	 * 
	 * @param string type		type of event to fire
	 * @param array args		arguments to pass to event function
	 */
	fireEvent: function(type, args)
	{
		this.objects.events.fireEvent(type, args);
	},
	
	/**
	 * If debugging is enabled, display alert boxes for errors that occur while processing
	 */
	debug: function(msg)
	{
		if(this.options.debug_mode)
		{
			alert(msg);
		}
	},
	
	// ---------- code taken from http://www.softcomplex.com/docs/get_window_size_and_scrollbar_position.html (thanks!!) ----------
	/**
	 * Get the Y scroll position of the window, cross-browser compatible. Works great.
	 * 
	 * Yo, big up for da SoftComplex mmmassive (http://www.softcomplex.com/docs/get_window_size_and_scrollbar_position.html)
	 */
	get_scroll_position_y: function()
	{
		return this.f_filterResults (
			window.pageYOffset ? window.pageYOffset : 0,
			document.documentElement ? document.documentElement.scrollTop : 0,
			document.body ? document.body.scrollTop : 0
		);
	},
	
	/**
	 * http://www.softcomplex.com/docs/get_window_size_and_scrollbar_position.html
	 */
	f_filterResults: function(n_win, n_docel, n_body)
	{
		var n_result = n_win ? n_win : 0;
		if (n_docel && (!n_result || (n_result > n_docel)))
			n_result = n_docel;
		return n_body && (!n_result || (n_result > n_body)) ? n_body : n_result;
	}
	// ---------- end code taken from http://www.softcomplex.com/docs/get_window_size_and_scrollbar_position.html ----------
});
