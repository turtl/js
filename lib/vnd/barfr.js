/**
 * barfr.js
 * ---
 * This is a wonderful Mootools (1.2+) notification system box that's simple, clean, and works well. 
 * 
 * 
 * Copyright (c) 2009, Lyon Bros LLC. (http://www.lyonbros.com)
 * 
 * Licensed under The MIT License. 
 * Redistributions of files must retain the above copyright notice.
 * 
 * @copyright	Copyright (c) 2009, Lyon Bros Enterprises, LLC. (http://www.lyonbros.com)
 * @package		modal
 * @license		http://www.opensource.org/licenses/mit-license.php
 */

// MT1.11 Compat - did we srsly have to get rid of these??
var $E = function(selector, filter) {return ($(filter) || document).getElement(selector);};
var $ES = function(selector, filter) {return ($(filter) || document).getElements(selector);};

/**
 * The barfr class, using the Mootools class object. 
 * 
 * @author		Jeff and Andrew Lyon <jeff@lyonbros.com>
 */
var Barfr = new Class({
	/**
	 * Configurable options - these are safe to tweak and change
	 */
	options: {
		// if true, barfs don't timeout
		persist: false,

		// the default timeout for messages
		timeout: 5000,
		
		// if true, will be verbose about errors (using alert boxes)
		debug_mode: true,

		// if true, we won't let the same message be added twice in a row
		prevent_duplicates: true
	},
	
	// ---------------------------------------------------------------
	// You probably don't want to edit anything under this line, unless you are 5uP3r 1337 h4x0r (1yk3 u5)!!
	// ---------------------------------------------------------------
	
	/**
	 * Central place for DOM objects created and used by the modal interface.
	 */
	objects: {
		container: false,
		list: false
	},

	/**
	 * Object containing objects for the various barf messages
	 */
	barfs: {},

	/**
	 * Counts how many barfs we have open (since Object.length doesn't work right)
	 */
	barf_count: 0,

	/**
	 * Most recent barf id
	 */
	most_recent_barf_id: '',

	/**
	 * Whether the mouse cursor is over our silly list of messages
	 */
	mouse_over: false,
		
	/**
	 * Create our initial divs used for the barfr interface
	 */
	initialize: function(element, options)
	{
		options || (options = {});

		// set up the parameters
		for(var x in options)
			this.options[x] = options[x];
		

		// create all of our needed divs/objects and inject them into the DOM (only if we haven't already tho)
		
		var el = $(element);
		if(!this.objects.container && !el)
		{
			this.objects.container = new Element('div');
			this.objects.container.id = element;
			this.objects.container.className = 'barfr';
			this.objects.container.setStyles({
			//	display: 'none'
			});
			this.objects.container.inject(document.body, 'bottom');
		}
		else if(el)
		{
			this.objects.container = el;
		}
		
		var el = $('barfr-ul');
		if(!this.objects.list && !el)
		{
			// create the list container, holds all the barf messages
			this.objects.list = new Element('ul');
			this.objects.list.id = 'barfr-ul';
			this.objects.list.setStyles({
				display: 'none'
			});
			this.objects.list.addEvent('mouseover', function(e) { this.mouse_over = true; }.bind(this));
			this.objects.list.addEvent('mouseout', function(e) { this.mouse_over = false; }.bind(this));

			this.objects.list.inject(this.objects.container, 'top');
		}
		else if(el)
		{
			this.objects.list = el;
		}
	},

	barf: function(msg, options)
	{
		options || (options = {});

		var msg = msg.replace(/<\/?script(.*?)>/ig, '');
		var merged_options = {};

		for (x in this.options)
			merged_options[x] = this.options[x];

		for(x in options)
			merged_options[x] = options[x];

		if (this.options.prevent_duplicates && this.most_recent_barf_id && this.barfs[this.most_recent_barf_id] && this.barfs[this.most_recent_barf_id].msg == msg)
			return false;

		if (options.title)
			msg = '<h2>'+options.title+'</h2>'+msg;

		var id = new Date().getTime() + Math.random();

		var li = new Element('li');
		li.innerHTML = msg + '<a href="#" class="close"></a>';
		var self = this;
		li.addEvent('click', function(e) {
			if(options.onclick) options.onclick();
			self.close_barf(id);
			li.removeEvent('click', arguments.callee);
		});
		li.addEvent('click:relay(a.close)', function(e) {
			if(e) e.stop();
			self.close_barf(id);
			li.removeEvent('click:relay(a.close)', arguments.callee);
		});

		li.inject(this.objects.list, 'top');
		this.objects.list.style.display = 'block';

		var slider = new Fx.Slide(li, {duration: 200}).hide().slideIn();

		this.barfs[id] = {
			id: 		id,
			li: 		li,
			msg: 		msg,
			slider: 	slider,
			barfr: 		this,
			timer: 		null,
			options: 	merged_options,

			init_timer: function()
			{
				if(this.options.persist) return false;

				this.timer = new Timer(this.options.timeout);
				this.timer.bind('fired', this.timer_end.bind(this));
				this.timer.start();
			},
			timer_end: function()
			{
				if (this.barfr.mouse_over)
					this.init_timer();
				else
					this.barfr.close_barf(this.id);
			}
		};
		this.barf_count++;
		this.most_recent_barf_id = id;

		this.barfs[id].init_timer();

		return id;
	},

	close_barf: function(id)
	{
		if(this.barfs[id] && this.barfs[id].slider) this.barfs[id].slider.slideOut().chain(function() { this.destroy_barf(id); }.bind(this));
	},

	destroy_barf: function(id)
	{
		this.barfs[id].li.removeEvents('click');
		this.barfs[id].slider = null;
		// the li is wrapped in a div, courtesy of the slider
		this.barfs[id].li.getParent().destroy();
		this.barfs[id].li = null;
		this.barfs[id].timer = null;
		delete this.barfs[id];
		this.barf_count--;

		if (this.barf_count == 0)
			this.objects.list.style.display = 'none';
	}

});
