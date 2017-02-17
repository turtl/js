var TurtlTemplates = {};
(function() {
  var template = Handlebars.template, templates = TurtlTemplates = TurtlTemplates || {};
templates['boards/delete'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data,depths) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda;
  return "<p class=\"warn\">\n	"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Are you sure you want to delete the board <em>{{parent}}{{board}}</em>?", {"name":"t","hash":{
    'board': (((stack1 = (depth0 != null ? depth0.board : depth0)) != null ? stack1.title : stack1)),
    'parent': ((depth0 != null ? depth0.parentname : depth0))
  },"data":data})))
    + "\n</p>\n<div class=\"fr delete-notes\">\n	<input id=\"delete_notes_"
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.board : depth0)) != null ? stack1.id : stack1), depth0))
    + "\" type=\"checkbox\" name=\"notes\" value=\"1\">\n	<label for=\"delete_notes_"
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.board : depth0)) != null ? stack1.id : stack1), depth0))
    + "\">\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Also delete notes in the above <em>{{parentname}}{{board_title}}</em>", {"name":"t","hash":{
    'board_title': (((stack1 = (depths[1] != null ? depths[1].board : depths[1])) != null ? stack1.title : stack1)),
    'parentname': ((depth0 != null ? depth0.parentname : depth0))
  },"data":data})))
    + "\n	</label>\n</div>\n\n";
},"useData":true,"useDepths":true});
templates['boards/edit'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "	<p class=\"child\">\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "This board will be nested under \"{{parent_title}}\"", {"name":"t","hash":{
    'parent_title': (((stack1 = (depth0 != null ? depth0.parent : depth0)) != null ? stack1.title : stack1))
  },"data":data})))
    + "\n	</p>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, buffer = "<input type=\"text\" name=\"title\" value=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.board : depth0)) != null ? stack1.title : stack1), depth0))
    + "\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Board title", {"name":"t","hash":{},"data":data})))
    + "\">\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.parent : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['boards/index'] = template({"1":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		<div class=\"search\">\n			<form class=\"standard-form\">\n				"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "close", {"name":"icon","hash":{
    'class': ("close")
  },"data":data})))
    + "\n				<input type=\"text\" name=\"search\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Search for boards", {"name":"t","hash":{},"data":data})))
    + "\">\n			</form>\n		</div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "<div class=\"boards\">\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_search : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	<div class=\"boards-list\"></div>\n</div>\n\n";
},"useData":true});
templates['boards/item'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div class=\"board-actions\"></div>\n\n<div class=\"status\"></div>\n<h2>\n	";
  stack1 = lambda(((stack1 = (depth0 != null ? depth0.board : depth0)) != null ? stack1.title : stack1), depth0);
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n</h2>\n<p>\n	"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "<span class=\"count\">{{num_notes}}</span> notes", {"name":"t","hash":{
    'num_notes': ((depth0 != null ? depth0.num_notes : depth0))
  },"data":data})))
    + "\n</p>\n\n";
},"useData":true});
templates['boards/list'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers.unless.call(depth0, (depth0 != null ? depth0.child : depth0), {"name":"unless","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"2":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		<p class=\"page-empty\">\n			"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "boards", {"name":"icon","hash":{},"data":data})))
    + "\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "No boards here!", {"name":"t","hash":{},"data":data})))
    + "<br>\n			<small>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Tap <em>+</em> to start", {"name":"t","hash":{},"data":data})))
    + "</small>\n		</p>\n";
},"4":function(depth0,helpers,partials,data) {
  return "	<ul class=\"item-list\"></ul>\n";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.empty : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.program(4, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['feedback/index'] = template({"1":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "	<input type=\"text\" name=\"email\" value=\"\" tabindex=\"1\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Your email (optional, so we can respond)", {"name":"t","hash":{},"data":data})))
    + "\">\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div class=\"content\">\n	<h1>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Have an idea? A problem?", {"name":"t","hash":{},"data":data})))
    + "</h1>\n</div>\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_email : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "<textarea name=\"text\" rows=\"1\" cols=\"80\" tabindex=\"3\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Give your feedback", {"name":"t","hash":{},"data":data})))
    + "\"></textarea>\n<div class=\"buttons\">\n	<div class=\"button login\">\n		<input type=\"submit\" class=\"button\" value=\"Send\">\n	</div>\n</div>\n\n";
},"useData":true});
templates['feedback/noconnection'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<p class=\"page-empty\">\n	"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "connection", {"name":"icon","hash":{},"data":data})))
    + "\n	"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Sending feedback requires a connection!", {"name":"t","hash":{},"data":data})))
    + "\n	<small>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "You are currently in offline mode.", {"name":"t","hash":{},"data":data})))
    + "</small>\n</p>\n\n";
},"useData":true});
templates['feedback/thanks'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"content\">\n	<h1>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Thanks!", {"name":"t","hash":{},"data":data})))
    + "</h1>\n	<p>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "We appreciate you taking the time to help make Turtl better.", {"name":"t","hash":{},"data":data})))
    + "</p>\n</div>\n\n<div class=\"buttons\">\n	<div class=\"button login\">\n		<a href=\"/\" class=\"button\"><span>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Back to my notes", {"name":"t","hash":{},"data":data})))
    + "</span></a>\n	</div>\n</div>\n";
},"useData":true});
templates['help/bindings'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<h1>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Quick help", {"name":"t","hash":{},"data":data})))
    + "</h1>\n<div class=\"help content\">\n	<h2>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Keyboard shortcuts", {"name":"t","hash":{},"data":data})))
    + "</h2>\n	<table class=\"shortcuts\">\n		<tr>\n			<td><kbd>a</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Add a new note", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>b</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Open board dropdown", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>enter</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Open current note", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>e</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Edit current note", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>delete</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Delete current note", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>/</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Search notes", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>x</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Clear all current filters (show all notes in the board)", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>?</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Show this help", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n		<tr>\n			<td><kbd>shift + L</kbd></td>\n			<td>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Log out", {"name":"t","hash":{},"data":data})))
    + "</td>\n		</tr>\n	</table>\n	<p>\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "If you are having trouble using Turtl, please email us at <code>info@turtl.it</code>", {"name":"t","hash":{},"data":data})))
    + ".\n	</p>\n</div>\n";
},"useData":true});
templates['help/markdown'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"markdown-tutorial content\">\n	<p>\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Turtl notes use Markdown, a format that's easy to read and write and doesn't require a clunky editor.", {"name":"t","hash":{},"data":data})))
    + "\n	</p>\n\n	<ul>\n		<li>\n			<div># "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "One hash makes a large title", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div><h1>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "One hash makes a large title", {"name":"t","hash":{},"data":data})))
    + "</h1></div>\n		</li>\n		<li>\n			<div>## "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Two hashes for a smaller header", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div><h2>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Two hashes for a smaller header", {"name":"t","hash":{},"data":data})))
    + "</h2></div>\n		</li>\n		<li>\n			<div>- "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "dashes<br>- make<br>- bullets", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div><ul><li>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "dashes</li><li>make</li><li>bullets", {"name":"t","hash":{},"data":data})))
    + "</li></ul></div>\n		</li>\n		<li>\n			<div>1. "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "you can make<br>1. numbered bullets<br>1. as well", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div><ol><li>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "you can make</li><li>numbered bullets</li><li>as well", {"name":"t","hash":{},"data":data})))
    + "</li></ol></div>\n		</li>\n		<li>\n			<div>- [ ] "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "todo lists", {"name":"t","hash":{},"data":data})))
    + "<br>- [X] "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "works too", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div>\n				<ul class=\"task-list\">\n					<li class=\"task-list-item\"><input class=\"task-list-item-checkbox\" disabled=\"\" type=\"checkbox\"> "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "todo lists", {"name":"t","hash":{},"data":data})))
    + "</li>\n					<li class=\"task-list-item\"><input class=\"task-list-item-checkbox\" checked=\"\" disabled=\"\" type=\"checkbox\"> "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "works too", {"name":"t","hash":{},"data":data})))
    + "</li>\n				</ul>\n			</div>\n		</li>\n		<li>\n			<div>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "[Making links](https://turtl.it) is easy!", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div><a target=\"_blank\" href=\"https://turtl.it/\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Making links</a> is easy!", {"name":"t","hash":{},"data":data})))
    + "</div>\n		</li>\n		<li>\n			<div>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "You can also make text __bold__, *italic* or ~~strikethrough~~.", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "You can also make text <strong>bold</strong>, <em>italic</em> or <strike>strikethrough</strike>.", {"name":"t","hash":{},"data":data})))
    + "</div>\n		</li>\n		<li>\n			<div>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Here's an image:<br>![](https://turtl.it/images<space> </space>/favicon.png)", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Here's an image: ", {"name":"t","hash":{},"data":data})))
    + "<img src=\"https://turtl.it/images/favicon.png\" alt=\"\"></div>\n		</li>\n		<li>\n			<div>&gt; "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Quote text with a caret", {"name":"t","hash":{},"data":data})))
    + "</div>\n			<div><blockquote>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Quote text with a caret", {"name":"t","hash":{},"data":data})))
    + "</blockquote></div>\n		</li>\n		<li>\n			<div>\n				```<br>\n				surround(<space> </space>code.by(<space> </space>'three backticks'<space> </space>));<br>\n				```\n			</div>\n			<div>\n				<pre><code>surround(code.by('three backticks'));</code></pre>\n			</div>\n		</li>\n		<li>\n			<div>\n				"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Use backticks for `inline_code()`", {"name":"t","hash":{},"data":data})))
    + "\n			</div>\n			<div>\n				"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Use backticks for <code>inline_code()</code>", {"name":"t","hash":{},"data":data})))
    + "\n			</div>\n		</li>\n	</ul>\n\n	<span class=\"markdown-link form-note\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Read more about <a href=\"http://support.mashery.com/docs/customizing_your_portal/Markdown_Cheat_Sheet\" target=\"_blank\">markdown</a>.", {"name":"t","hash":{},"data":data})))
    + "</span>\n	<br><br>\n\n</div>\n\n";
},"useData":true});
templates['modules/actions'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing;
  return "	<a href=\"#action\" class=\"abutton\" title=\""
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.actions : depth0)) != null ? stack1['0'] : stack1)) != null ? stack1.title : stack1), depth0))
    + "\" rel=\"main\">\n		"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, ((stack1 = ((stack1 = (depth0 != null ? depth0.actions : depth0)) != null ? stack1['0'] : stack1)) != null ? stack1.icon : stack1), {"name":"icon","hash":{
    'class': (((stack1 = ((stack1 = (depth0 != null ? depth0.actions : depth0)) != null ? stack1['0'] : stack1)) != null ? stack1.name : stack1))
  },"data":data})))
    + "\n	</a>\n";
},"3":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "	<a href=\"#action\" class=\"abutton\" rel=\"open\">\n		"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "add", {"name":"icon","hash":{
    'class': ("add")
  },"data":data})))
    + "\n	</a>\n	<ul>\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.actions : depth0), {"name":"each","hash":{},"fn":this.program(4, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</ul>\n";
},"4":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda;
  return "			<li rel=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "\" class=\"item-"
    + escapeExpression(lambda((data && data.index), depth0))
    + "\">\n				<h4>"
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "</h4>\n				<a href=\"#"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" class=\"abutton\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, (depth0 != null ? depth0.icon : depth0), {"name":"icon","hash":{
    'class': ((depth0 != null ? depth0.name : depth0))
  },"data":data})))
    + "</a>\n			</li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, ((stack1 = (depth0 != null ? depth0.actions : depth0)) != null ? stack1.length : stack1), 1, {"name":"equal","hash":{},"fn":this.program(1, data),"inverse":this.program(3, data),"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['modules/form-layout'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "			<div class=\"button-row clear\">\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.footer_actions : depth0)) != null ? stack1.length : stack1), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "				<div class=\"desc\"></div>\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_cancel : depth0), {"name":"if","hash":{},"fn":this.program(5, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "				<div class=\"button flat submit\">\n					<input type=\"submit\" ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.tabindex : depth0), {"name":"if","hash":{},"fn":this.program(7, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + " value=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, (depth0 != null ? depth0.action : depth0), {"name":"t","hash":{},"data":data})))
    + "\">\n				</div>\n			</div>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, buffer = "					<ul>\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.footer_actions : depth0), {"name":"each","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "					</ul>\n";
},"3":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "							<li>\n								<a href=\"#"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" rel=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\">\n									"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, (depth0 != null ? depth0.icon : depth0), {"name":"icon","hash":{},"data":data})))
    + "\n								</a>\n							</li>\n";
},"5":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "					<div class=\"button flat cancel\">\n						<span>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Cancel", {"name":"t","hash":{},"data":data})))
    + "</span>\n					</div>\n";
},"7":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "tabindex=\""
    + escapeExpression(((helper = (helper = helpers.tabindex || (depth0 != null ? depth0.tabindex : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"tabindex","hash":{},"data":data}) : helper)))
    + "\"";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div class=\""
    + escapeExpression(((helper = (helper = helpers.formclass || (depth0 != null ? depth0.formclass : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"formclass","hash":{},"data":data}) : helper)))
    + " clear interface\">\n	<form class=\"standard-form\" autocomplete=\"off\">\n		";
  stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"content","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.buttons : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</form>\n</div>\n\n";
},"useData":true});
templates['modules/header/actions'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, buffer = "	<ul class=\"actions\">\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.actions : depth0), {"name":"each","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</ul>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "			<li rel=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\">\n";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.name : depth0), "menu", {"name":"equal","hash":{},"fn":this.program(3, data),"inverse":this.program(5, data),"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "			</li>\n";
},"3":function(depth0,helpers,partials,data) {
  return "					<div class=\"menu-actions\"></div>\n";
  },"5":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "					<a href=\"#"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, (depth0 != null ? depth0.icon : depth0), {"name":"icon","hash":{},"data":data})))
    + "</a>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.actions : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['modules/header/index'] = template({"1":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "settings", {"name":"icon","hash":{},"data":data})))
    + "\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<a class=\"logo\" href=\"#\">\n	<img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/logo.svg", {"name":"asset","hash":{},"data":data})))
    + "\">\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.logged_in : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</a>\n<h1><em><span>Turtl</span></em></h1>\n\n<div class=\"actions-container\"></div>\n\n";
},"useData":true});
templates['modules/item-actions'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, buffer = "			<div class=\"row\">\n				<ul>\n";
  stack1 = helpers.each.call(depth0, depth0, {"name":"each","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "				</ul>\n			</div>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "						<li ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0['class'] : depth0), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += ">\n							<a href=\"";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.href : depth0), {"name":"if","hash":{},"fn":this.program(5, data),"inverse":this.program(7, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\" rel=\""
    + escapeExpression(((helpers.sluggify || (depth0 && depth0.sluggify) || helperMissing).call(depth0, (depth0 != null ? depth0.name : depth0), {"name":"sluggify","hash":{},"data":data})))
    + "\">\n								"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, (depth0 != null ? depth0.name : depth0), {"name":"t","hash":{},"data":data})))
    + "\n							</a>\n						</li>\n";
},"3":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "class=\""
    + escapeExpression(((helper = (helper = helpers['class'] || (depth0 != null ? depth0['class'] : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"class","hash":{},"data":data}) : helper)))
    + "\"";
},"5":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return escapeExpression(((helper = (helper = helpers.href || (depth0 != null ? depth0.href : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"href","hash":{},"data":data}) : helper)));
  },"7":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "#"
    + escapeExpression(((helpers.sluggify || (depth0 && depth0.sluggify) || helperMissing).call(depth0, (depth0 != null ? depth0.name : depth0), {"name":"sluggify","hash":{},"data":data})));
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div rel=\""
    + escapeExpression(((helper = (helper = helpers.cid || (depth0 != null ? depth0.cid : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"cid","hash":{},"data":data}) : helper)))
    + "\" class=\"item-actions\">\n	<a href=\"#actions\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "menu", {"name":"icon","hash":{},"data":data})))
    + "</a>\n	<div class=\"menu\">\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.actions : depth0), {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n</div>\n\n";
},"useData":true});
templates['modules/loading'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div>\n	<p class=\"animate\">\n		<img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/logo.svg", {"name":"asset","hash":{},"data":data})))
    + "\">\n		<img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/logo.svg", {"name":"asset","hash":{},"data":data})))
    + "\">\n		<img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/logo.svg", {"name":"asset","hash":{},"data":data})))
    + "\">\n	</p>\n	<ul></ul>\n</div>\n";
},"useData":true});
templates['modules/modal'] = template({"1":function(depth0,helpers,partials,data) {
  return "	<header></header>\n";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_header : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "<div class=\"modal-gutter\"></div>\n\n";
},"useData":true});
templates['modules/nav'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<li";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.selected : depth0), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "><a href=\""
    + escapeExpression(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, (depth0 != null ? depth0.icon : depth0), {"name":"icon","hash":{},"data":data})))
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, (depth0 != null ? depth0.name : depth0), {"name":"t","hash":{},"data":data})))
    + "</a></li>\n";
},"2":function(depth0,helpers,partials,data) {
  return " class=\"sel\"";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.nav : depth0), {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"useData":true});
templates['modules/sidebar'] = template({"1":function(depth0,helpers,partials,data) {
  return "show";
  },"3":function(depth0,helpers,partials,data) {
  return "connected";
  },"5":function(depth0,helpers,partials,data) {
  return "disconnected";
  },"7":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "			<div class=\"sync\">\n				";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.last_sync : depth0), {"name":"if","hash":{},"fn":this.program(8, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n				<div class=\"button sync\">\n					<input type=\"button\" class=\"button\" value=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Sync now", {"name":"t","hash":{},"data":data})))
    + "\">\n				</div>\n			</div>\n";
},"8":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<p>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Last sync: {{val}}", {"name":"t","hash":{
    'val': (((helpers['ago-time'] || (depth0 && depth0['ago-time']) || helperMissing).call(depth0, (depth0 != null ? depth0.last_sync : depth0), {"name":"ago-time","hash":{},"data":data})))
  },"data":data})))
    + "</p>";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div class=\"overlay ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.open : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\"></div>\n<div class=\"inner\">\n	<div class=\"gutter\">\n		<ul>\n			<!--\n			<li>\n				<a href=\"/\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "notes", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "All notes", {"name":"t","hash":{},"data":data})))
    + "\n				</a>\n			</li>\n			<li class=\"sep\">\n				<a href=\"/boards\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "boards", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Boards", {"name":"t","hash":{},"data":data})))
    + "\n				</a>\n			</li>\n			<li rel=\"share\">\n				<a href=\"/sharing\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "share", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Sharing", {"name":"t","hash":{},"data":data})))
    + "\n				</a>\n			</li>\n			-->\n			<li>\n				<a href=\"/settings\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "account", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Your settings", {"name":"t","hash":{},"data":data})))
    + "\n				</a>\n			</li>\n			<li>\n				<a href=\"/feedback\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "feedback", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Feedback", {"name":"t","hash":{},"data":data})))
    + "\n				</a>\n			</li>\n			<li>\n				<a href=\"/users/logout\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "logout", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Logout", {"name":"t","hash":{},"data":data})))
    + "\n				</a>\n			</li>\n		</ul>\n	</div>\n	<div class=\"footer\">\n		<div class=\"connection ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.connected : depth0), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.program(5, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\">\n			"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "connection", {"name":"icon","hash":{},"data":data})))
    + "\n			<span class=\"connected\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Connected to the Turtl service", {"name":"t","hash":{},"data":data})))
    + "</span>\n			<span class=\"disconnected\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Offline mode", {"name":"t","hash":{},"data":data})))
    + "</span>\n		</div>\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.connected : depth0), {"name":"if","hash":{},"fn":this.program(7, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n</div>\n\n";
},"useData":true});
templates['notes/edit/boards/index'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "			<li rel=\""
    + escapeExpression(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"id","hash":{},"data":data}) : helper)))
    + "\">\n				<a class=\"check ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.selected : depth0), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\" href=\"#\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "selected", {"name":"icon","hash":{},"data":data})))
    + "</a>\n				<h2>"
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "</h2>\n			</li>\n";
},"2":function(depth0,helpers,partials,data) {
  return "selected";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "<div class=\"boards select\">\n	<ul class=\"item-list\">\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.boards : depth0), {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</ul>\n</div>\n\n";
},"useData":true});
templates['notes/edit/boards/list'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "	<div class=\"note-boards clear\">\n		"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "board", {"name":"icon","hash":{},"data":data})))
    + "\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.boards : depth0)) != null ? stack1.length : stack1), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.program(8, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, buffer = "			<ul>\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.boards : depth0), {"name":"each","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "			</ul>\n";
},"3":function(depth0,helpers,partials,data) {
  var stack1, buffer = "					<li>\n						";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.name : depth0), {"name":"if","hash":{},"fn":this.program(4, data),"inverse":this.program(6, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n					</li>\n";
},"4":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)));
  },"6":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "(untitled board)", {"name":"t","hash":{},"data":data})));
  },"8":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<span>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "This note is not in any boards", {"name":"t","hash":{},"data":data})))
    + " &raquo;</span>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.have_boards : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['notes/edit/file'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda, buffer = "	<p class=\"info\">\n		"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "attach", {"name":"icon","hash":{},"data":data})))
    + "\n		"
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.name : stack1), depth0))
    + "\n	</p>\n	<p class=\"size\">\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.size : stack1), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</p>\n	<p class=\"remove\">\n		<a href=\"#remove\" rel=\"remove\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "remove", {"name":"icon","hash":{},"data":data})))
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Remove attachment", {"name":"t","hash":{},"data":data})))
    + "</a>\n	</p>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			"
    + escapeExpression(((helpers.bytes || (depth0 && depth0.bytes) || helperMissing).call(depth0, ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.size : stack1), {"name":"bytes","hash":{},"data":data})))
    + "\n";
},"4":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "	<label for=\"note_file_"
    + escapeExpression(((helper = (helper = helpers.note_id || (depth0 != null ? depth0.note_id : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"note_id","hash":{},"data":data}) : helper)))
    + "\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "attach", {"name":"icon","hash":{},"data":data})))
    + "</label>\n	<input\n		id=\"note_file_"
    + escapeExpression(((helper = (helper = helpers.note_id || (depth0 != null ? depth0.note_id : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"note_id","hash":{},"data":data}) : helper)))
    + "\"\n		type=\"file\"\n		";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.accept : depth0), {"name":"if","hash":{},"fn":this.program(5, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n		name=\"file\"\n		placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Attach a file", {"name":"t","hash":{},"data":data})))
    + "\">\n";
},"5":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "accept=\""
    + escapeExpression(((helper = (helper = helpers.accept || (depth0 != null ? depth0.accept : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"accept","hash":{},"data":data}) : helper)))
    + "\"";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.name : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.program(4, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['notes/edit/index'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "	<div class=\"file-container\"></div>\n";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.type : depth0), "image", {"name":"equal","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"2":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		<span class=\"url-or-file\">- "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "OR", {"name":"t","hash":{},"data":data})))
    + " -</span>\n";
},"4":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, buffer = "	<input type=\"text\" name=\"url\" value=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.url : stack1), depth0))
    + "\" tabindex=\"1\" placeholder=\"";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.type : stack1), "image", {"name":"equal","hash":{},"fn":this.program(5, data),"inverse":this.program(7, data),"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\">\n	<div class=\"existing\"></div>\n";
},"5":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Image URL", {"name":"t","hash":{},"data":data})));
  },"7":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "URL", {"name":"t","hash":{},"data":data})));
  },"9":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing;
  return "	<input type=\"text\" name=\"username\" value=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.username : stack1), depth0))
    + "\" tabindex=\"3\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Username", {"name":"t","hash":{},"data":data})))
    + "\">\n	<div class=\"password\">\n		<a class=\"preview\" href=\"#preview\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "preview", {"name":"icon","hash":{},"data":data})))
    + "</a>\n		<input type=\"password\" name=\"password\" value=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.password : stack1), depth0))
    + "\" tabindex=\"4\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Password", {"name":"t","hash":{},"data":data})))
    + "\">\n	</div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, lambda=this.lambda, escapeExpression=this.escapeExpression, buffer = "";
  stack1 = ((helpers['equal-or'] || (depth0 && depth0['equal-or']) || helperMissing).call(depth0, (depth0 != null ? depth0.type : depth0), "file", "image", {"name":"equal-or","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  stack1 = ((helpers['equal-or'] || (depth0 && depth0['equal-or']) || helperMissing).call(depth0, (depth0 != null ? depth0.type : depth0), "image", "link", {"name":"equal-or","hash":{},"fn":this.program(4, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n<input type=\"text\" name=\"title\" value=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.title : stack1), depth0))
    + "\" tabindex=\"2\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Title", {"name":"t","hash":{},"data":data})))
    + "\">\n";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.type : depth0), "password", {"name":"equal","hash":{},"fn":this.program(9, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n<textarea name=\"text\" rows=\"1\" cols=\"80\" tabindex=\"5\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Note text", {"name":"t","hash":{},"data":data})))
    + "\">"
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.text : stack1), depth0))
    + "</textarea>\n<div class=\"formatting clear\">\n	<a href=\"#formatting\" rel=\"formatting\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Formatting help", {"name":"t","hash":{},"data":data})))
    + "</a>\n</div>\n\n<div class=\"boards-container\"></div>\n\n\n";
},"useData":true});
templates['notes/edit/tags/index'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<input type=\"text\" name=\"tags\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "comma, separate, tags", {"name":"t","hash":{},"data":data})))
    + "\">\n<div class=\"tags-container\"></div>\n\n";
},"useData":true});
templates['notes/edit/tags/list'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "		<li ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.selected : depth0), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + ">\n			<span>"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n		</li>\n";
},"2":function(depth0,helpers,partials,data) {
  return "class=\"sel\"";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "<ul class=\"tags\">\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.tags : depth0), {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</ul>\n\n";
},"useData":true});
templates['notes/index'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div class=\"notes\"></div>\n";
  },"useData":true});
templates['notes/item'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"content","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n\n";
},"useData":true});
templates['notes/list'] = template({"1":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "	<p class=\"page-empty\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Decrypting notes...", {"name":"t","hash":{},"data":data})))
    + "</p>\n";
},"3":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "	<p class=\"page-empty\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "No notes found.", {"name":"t","hash":{},"data":data})))
    + "</p>\n";
},"5":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "	<p class=\"page-empty\">\n		"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "notes", {"name":"icon","hash":{},"data":data})))
    + "\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "No notes here!", {"name":"t","hash":{},"data":data})))
    + "<br>\n		<small>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Tap <em>+</em> to start", {"name":"t","hash":{},"data":data})))
    + "</small>\n	</p>\n";
},"7":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		<a href=\"#prev\" rel=\"prev\">&lt; "
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Prev", {"name":"t","hash":{},"data":data})))
    + "</a>\n";
},"9":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		<a href=\"#next\" rel=\"next\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Next", {"name":"t","hash":{},"data":data})))
    + " &gt;</a>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.initial : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.no_results : depth0), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.empty : depth0), {"name":"if","hash":{},"fn":this.program(5, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "<ul class=\"note-list clear "
    + escapeExpression(((helper = (helper = helpers.view_mode || (depth0 != null ? depth0.view_mode : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"view_mode","hash":{},"data":data}) : helper)))
    + "\"></ul>\n\n<p class=\"paginate\">\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_prev : depth0), {"name":"if","hash":{},"fn":this.program(7, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_next : depth0), {"name":"if","hash":{},"fn":this.program(9, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</p>\n\n";
},"useData":true});
templates['notes/search/index'] = template({"1":function(depth0,helpers,partials,data) {
  return "sel";
  },"3":function(depth0,helpers,partials,data) {
  return "desc";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", buffer = "<div class=\"filter-sort\">\n	<ul>\n		<li class=\"";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.sort : depth0), "created", {"name":"equal","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.dir : depth0), "desc", {"name":"equal","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\">\n			<a href=\"#created\" rel=\"created\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "sort", {"name":"icon","hash":{},"data":data})))
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Create date", {"name":"t","hash":{},"data":data})))
    + "</a>\n		</li>\n		<li class=\"";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.sort : depth0), "mod", {"name":"equal","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, (depth0 != null ? depth0.dir : depth0), "desc", {"name":"equal","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\">\n			<a href=\"#modified\" rel=\"mod\">"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "sort", {"name":"icon","hash":{},"data":data})))
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Last edited", {"name":"t","hash":{},"data":data})))
    + "</a>\n		</li>\n	</ul>\n</div>\n\n<div class=\"filter-text\">\n	<form class=\"standard-form\">\n		<input type=\"text\" name=\"text\" value=\""
    + escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"text","hash":{},"data":data}) : helper)))
    + "\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Text search", {"name":"t","hash":{},"data":data})))
    + "\">\n	</form>\n</div>\n\n<div class=\"tag-container\"></div>\n\n\n";
},"useData":true});
templates['notes/search/tags'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, buffer = "	<div class=\"filter-tags\">\n		<ul class=\"tags clear\">\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.tags : depth0), {"name":"each","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "		</ul>\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_show_all : depth0), {"name":"if","hash":{},"fn":this.program(7, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "				<li class=\"";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.selected : depth0), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = helpers.unless.call(depth0, (depth0 != null ? depth0.available : depth0), {"name":"unless","hash":{},"fn":this.program(5, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\">\n					<span>"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n				</li>\n";
},"3":function(depth0,helpers,partials,data) {
  return "sel";
  },"5":function(depth0,helpers,partials,data) {
  return "empty";
  },"7":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<a href=\"#show\" rel=\"all\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Show all tags", {"name":"t","hash":{},"data":data})))
    + " &raquo;</a>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.tags : depth0)) != null ? stack1.length : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['notes/types/common'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "	<div class=\"color "
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.color_name : stack1), depth0))
    + "\">&nbsp;</div>\n";
},"3":function(depth0,helpers,partials,data) {
  var stack1, buffer = "	<div class=\"file download ";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.file : stack1)) != null ? stack1.encrypting : stack1), {"name":"if","hash":{},"fn":this.program(4, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\">\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.file : stack1)) != null ? stack1.encrypting : stack1), {"name":"if","hash":{},"fn":this.program(6, data),"inverse":this.program(8, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n";
},"4":function(depth0,helpers,partials,data) {
  return "encrypting";
  },"6":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda;
  return "			<strong class=\"encrypting\">\n				"
    + escapeExpression(((helpers.svg || (depth0 && depth0.svg) || helperMissing).call(depth0, "loading", {"name":"svg","hash":{},"data":data})))
    + "\n				"
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.file : stack1)) != null ? stack1.name : stack1), depth0))
    + "\n			</strong>\n";
},"8":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda;
  return "			<strong>\n				<a href=\"#open\" rel=\"download\">\n					"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "attachment", {"name":"icon","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(((helpers.svg || (depth0 && depth0.svg) || helperMissing).call(depth0, "loading", {"name":"svg","hash":{},"data":data})))
    + "\n					"
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.file : stack1)) != null ? stack1.name : stack1), depth0))
    + "\n				</a>\n			</strong>\n";
},"10":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda, buffer = "		<div class=\"content text\">\n			<div class=\"body\">\n				<h1>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Crypto error", {"name":"t","hash":{},"data":data})))
    + "</h1>\n				<p>\n					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "There was a problem decrypting this note. Please contact <a href=\"mailto:info@turtl.it\">info@turtl.it</a> for assistance.", {"name":"t","hash":{},"data":data})))
    + "\n				</p>\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 != null ? depth0.error_data : depth0)) != null ? stack1.boards : stack1)) != null ? stack1.length : stack1), {"name":"if","hash":{},"fn":this.program(11, data),"inverse":this.program(14, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "				<h2>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Debug info", {"name":"t","hash":{},"data":data})))
    + "</h2>\n				<code>ID:&nbsp;"
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.id : stack1), depth0))
    + "<br>Key:&nbsp;";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.error_data : depth0)) != null ? stack1.key : stack1), {"name":"if","hash":{},"fn":this.program(16, data),"inverse":this.program(18, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</code>\n			</div>\n		</div>\n	";
},"11":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "					<p>\n						"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "This note belongs to these boards:", {"name":"t","hash":{},"data":data})))
    + "\n					</p>\n					<ul>\n";
  stack1 = helpers.each.call(depth0, ((stack1 = (depth0 != null ? depth0.error_data : depth0)) != null ? stack1.boards : stack1), {"name":"each","hash":{},"fn":this.program(12, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "					</ul>\n";
},"12":function(depth0,helpers,partials,data) {
  var lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "							<li>"
    + escapeExpression(lambda(depth0, depth0))
    + "</li>\n";
},"14":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "					"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "This note is not in any boards.", {"name":"t","hash":{},"data":data})))
    + "\n";
},"16":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression;
  return escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.error_data : depth0)) != null ? stack1.key : stack1), depth0));
  },"18":function(depth0,helpers,partials,data) {
  return "No key found";
  },"20":function(depth0,helpers,partials,data) {
  var stack1;
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.empty : depth0), {"name":"if","hash":{},"fn":this.program(21, data),"inverse":this.program(23, data),"data":data});
  if (stack1 != null) { return stack1; }
  else { return ''; }
  },"21":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "\n		<p class=\"empty\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "(empty note)", {"name":"t","hash":{},"data":data})))
    + "</p>\n";
},"23":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "		<div class=\"content text\">\n";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.type : stack1), "password", {"name":"equal","hash":{},"fn":this.program(24, data),"inverse":this.program(31, data),"data":data}));
  if (stack1 != null) { buffer += stack1; }
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.has_body : depth0), {"name":"if","hash":{},"fn":this.program(34, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "		</div>\n		";
},"24":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "				<h1 class=\"main-title password\">\n					<a href=\"#\" rel=\"password\">\n						"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "lock", {"name":"icon","hash":{},"data":data})))
    + "\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.title : stack1), {"name":"if","hash":{},"fn":this.program(25, data),"inverse":this.program(27, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "					</a>\n				</h1>\n				<div class=\"show-password\">\n					<form class=\"standard-form\">\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.username : stack1), {"name":"if","hash":{},"fn":this.program(29, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "						<input type=\"password\" name=\"password\" value=\"********\" readonly>\n					</form>\n				</div>\n";
},"25":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, buffer = "							";
  stack1 = lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.title : stack1), depth0);
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"27":function(depth0,helpers,partials,data) {
  return "							Password\n";
  },"29":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "							<input type=\"text\" name=\"username\" value=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.username : stack1), depth0))
    + "\" readonly>\n";
},"31":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.title : stack1), {"name":"if","hash":{},"fn":this.program(32, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"32":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, buffer = "					<h1 class=\"main-title\">";
  stack1 = lambda(((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.title : stack1), depth0);
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</h1>\n";
},"34":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "				<div class=\"body\">\n					";
  stack1 = ((helpers.markdown || (depth0 && depth0.markdown) || helperMissing).call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.text : stack1), {"name":"markdown","hash":{},"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n				</div>\n";
},"36":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda, buffer = "	<div class=\"info-container\">\n		<div class=\"preview\">\n			<ul>\n				<li>"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "board", {"name":"icon","hash":{},"data":data})))
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.boards : stack1)) != null ? stack1.length : stack1), depth0))
    + "</li>\n				<li>"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "tag", {"name":"icon","hash":{},"data":data})))
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.tags : stack1)) != null ? stack1.length : stack1), depth0))
    + "</li>\n			</ul>\n\n			<div class=\"info\">\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.have_boards : depth0), {"name":"if","hash":{},"fn":this.program(37, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.tags : stack1)) != null ? stack1.length : stack1), {"name":"if","hash":{},"fn":this.program(41, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "			</div>\n		</div>\n	</div>\n";
},"37":function(depth0,helpers,partials,data) {
  var stack1, buffer = "					<div class=\"info-list clear\">\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.boards : depth0)) != null ? stack1.length : stack1), {"name":"if","hash":{},"fn":this.program(38, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "					</div>\n";
},"38":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "							<ul>\n								<li>"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "board", {"name":"icon","hash":{},"data":data})))
    + "</li>\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.boards : depth0), {"name":"each","hash":{},"fn":this.program(39, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "							</ul>\n";
},"39":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "									<li>"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "</li>\n";
},"41":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "					<div class=\"info-list clear\">\n						<ul>\n							<li>"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "tag", {"name":"icon","hash":{},"data":data})))
    + "</li>\n";
  stack1 = helpers.each.call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.tags : stack1), {"name":"each","hash":{},"fn":this.program(42, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "						</ul>\n					</div>\n";
},"42":function(depth0,helpers,partials,data) {
  var lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "								<li>"
    + escapeExpression(lambda(depth0, depth0))
    + "</li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"content","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.note : depth0)) != null ? stack1.color_name : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.has_file : depth0), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n<div class=\"note-gutter\">\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.crypto_error : depth0), {"name":"if","hash":{},"fn":this.program(10, data),"inverse":this.program(20, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n</div>\n\n";
  stack1 = helpers['if'].call(depth0, false, {"name":"if","hash":{},"fn":this.program(36, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['notes/types/file'] = template({"1":function(depth0,helpers,partials,data) {
  return "";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.note || (depth0 && depth0.note) || helperMissing).call(depth0, (depth0 != null ? depth0.note : depth0), {"name":"note","hash":{
    'info': ((depth0 != null ? depth0.show_info : depth0))
  },"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n\n";
},"useData":true});
templates['notes/types/image'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, buffer = "	<div class=\"backing\">\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.name : stack1), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.program(8, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n	<div class=\"header-backing hide\">&nbsp;</div>\n";
},"2":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.blob_url : stack1), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.program(5, data),"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"3":function(depth0,helpers,partials,data) {
  var stack1, helper, lambda=this.lambda, escapeExpression=this.escapeExpression, functionType="function", helperMissing=helpers.helperMissing;
  return "				<a href=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.blob_url : stack1), depth0))
    + "\" target=\"_blank\">\n					<img width=\""
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.meta : stack1)) != null ? stack1.width : stack1), depth0))
    + "\" height=\""
    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.meta : stack1)) != null ? stack1.height : stack1), depth0))
    + "\" src=\""
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.blob_url : stack1), depth0))
    + "\" alt=\""
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "\">\n				</a>\n";
},"5":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "				<a href=\"#open\" rel=\"download\">\n					<span ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.img_height : stack1), {"name":"if","hash":{},"fn":this.program(6, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + ">\n						"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "image", {"name":"icon","hash":{},"data":data})))
    + "\n					</span>\n				</a>\n";
},"6":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "class=\"has-size\" style=\"padding-top: "
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.file : depth0)) != null ? stack1.img_height : stack1), depth0))
    + "%;\"";
},"8":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<a href=\""
    + escapeExpression(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"url","hash":{},"data":data}) : helper)))
    + "\" target=\"_blank\">\n				<img src=\""
    + escapeExpression(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"url","hash":{},"data":data}) : helper)))
    + "\" alt=\""
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "\" />\n			</a>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.note || (depth0 && depth0.note) || helperMissing).call(depth0, (depth0 != null ? depth0.note : depth0), {"name":"note","hash":{
    'info': ((depth0 != null ? depth0.show_info : depth0))
  },"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['notes/types/link'] = template({"1":function(depth0,helpers,partials,data) {
  return "";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.note || (depth0 && depth0.note) || helperMissing).call(depth0, (depth0 != null ? depth0.note : depth0), {"name":"note","hash":{
    'info': ((depth0 != null ? depth0.show_info : depth0))
  },"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n\n";
},"useData":true});
templates['notes/types/password'] = template({"1":function(depth0,helpers,partials,data) {
  return "";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.note || (depth0 && depth0.note) || helperMissing).call(depth0, (depth0 != null ? depth0.note : depth0), {"name":"note","hash":{
    'info': ((depth0 != null ? depth0.show_info : depth0))
  },"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n\n";
},"useData":true});
templates['notes/types/text'] = template({"1":function(depth0,helpers,partials,data) {
  return "";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.note || (depth0 && depth0.note) || helperMissing).call(depth0, (depth0 != null ? depth0.note : depth0), {"name":"note","hash":{
    'info': ((depth0 != null ? depth0.show_info : depth0))
  },"fn":this.program(1, data),"inverse":this.noop,"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n\n";
},"useData":true});
templates['notes/view'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"content","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n";
},"useData":true});
templates['settings/delete_account'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<p class=\"warn\">\n	"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Are you sure you want to delete your account and all your data <em>forever</em>?", {"name":"t","hash":{},"data":data})))
    + "\n</p>\n\n<div class=\"buttons\">\n	<div class=\"button login\">\n		<input type=\"submit\" class=\"button\" value=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Yes, delete my account", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"7\">\n	</div>\n</div>\n\n";
},"useData":true});
templates['settings/index'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<ul class=\"item-list\">\n	<li>\n		<a href=\"/settings/password\">\n			"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "next", {"name":"icon","hash":{},"data":data})))
    + "\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Change password", {"name":"t","hash":{},"data":data})))
    + "\n		</a>\n	</li>\n	<li>\n		<a href=\"/settings/delete-account\">\n			"
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "next", {"name":"icon","hash":{},"data":data})))
    + "\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Delete my account", {"name":"t","hash":{},"data":data})))
    + "\n		</a>\n	</li>\n</ul>\n<ul class=\"item-list\">\n	<li>\n		<a href=\"#wipe\">\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Clear local data", {"name":"t","hash":{},"data":data})))
    + "\n		</a>\n	</li>\n</ul>\n\n<div class=\"info\">\n	<p>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Client version: <em>{{version}}</em>", {"name":"t","hash":{
    'version': ((depth0 != null ? depth0.version : depth0))
  },"data":data})))
    + "</p>\n</div>\n\n";
},"useData":true});
templates['settings/password'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"section\">\n	<h3>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Confirm your current login", {"name":"t","hash":{},"data":data})))
    + "</h3>\n	<input type=\"text\" name=\"cur_username\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Current username", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"1\" autocorrect=\"off\" autocapitalize=\"none\">\n	<input type=\"password\" name=\"cur_password\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Current passphrase", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"2\">\n</div>\n\n<div class=\"section\">\n	<h3>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Enter a new password", {"name":"t","hash":{},"data":data})))
    + "</h3>\n	<input type=\"text\" name=\"new_username\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "New username", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"3\" autocorrect=\"off\" autocapitalize=\"none\">\n	<input type=\"password\" name=\"new_password\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "New passphrase", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"4\">\n	<input type=\"password\" name=\"new_confirm\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Confirm passphrase", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"5\">\n</div>\n\n<div class=\"buttons\">\n	<div class=\"button login\">\n		<input type=\"submit\" class=\"button\" value=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Save", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"7\">\n	</div>\n	<p class=\"load\">\n		"
    + escapeExpression(((helpers.svg || (depth0 && depth0.svg) || helperMissing).call(depth0, "loading", {"name":"svg","hash":{},"data":data})))
    + "\n	</p>\n</div>\n\n\n";
},"useData":true});
templates['sync/index'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"page content\">\n	<h1>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Coming soon!", {"name":"t","hash":{},"data":data})))
    + "</h1>\n	<p>\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "In an upcoming release, you will be able to see pending profile changes and file uploads/downloads that are in progress.", {"name":"t","hash":{},"data":data})))
    + "\n	</p>\n</div>\n";
},"useData":true});
templates['users/index'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div class=\"user-main clear\">\n	<div class=\"login-main\">\n	</div>\n	<div class=\"join-main\">\n	</div>\n</div>\n\n";
  },"useData":true});
templates['users/join'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "	<div class=\"autologin\">\n		<label>\n			<input type=\"checkbox\" name=\"autologin\" value=\"1\" ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.autologin : depth0), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + ">\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Stay logged in", {"name":"t","hash":{},"data":data})))
    + "\n		</label>\n	</div>\n";
},"2":function(depth0,helpers,partials,data) {
  return "checked";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", buffer = "<input type=\"text\" name=\"username\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Email address", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"4\" autocomplete=\"off\" autocorrect=\"off\" autocapitalize=\"none\">\n<input type=\"password\" name=\"password\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Passphrase", {"name":"t","hash":{},"data":data})))
    + "\" autocomplete=\"off\" tabindex=\"5\">\n<input type=\"password\" name=\"confirm\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Confirm passphrase", {"name":"t","hash":{},"data":data})))
    + "\" autocomplete=\"off\" tabindex=\"6\">\n<div class=\"strength\">\n	<div class=\"progress-bar\">\n		<div class=\"inner\">&nbsp;</div>\n	</div>\n	<p>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Passphrase strength: ", {"name":"t","hash":{},"data":data})))
    + "<span class=\"status\"></span></p>\n</div>\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_autologin : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n<div class=\"buttons\">\n	<div class=\"button join\">\n		<input type=\"submit\" class=\"button\" value=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Join", {"name":"t","hash":{},"data":data})))
    + "\">\n	</div>\n	<p class=\"load\">\n		"
    + escapeExpression(((helpers.svg || (depth0 && depth0.svg) || helperMissing).call(depth0, "loading", {"name":"svg","hash":{},"data":data})))
    + "\n	</p>\n	<p>\n		<a href=\"/users/login\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Login to an existing account", {"name":"t","hash":{},"data":data})))
    + "</a>\n	</p>\n</div>\n\n<a class=\"open-settings\" href=\"#settings\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Advanced settings", {"name":"t","hash":{},"data":data})))
    + " "
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "more", {"name":"icon","hash":{},"data":data})))
    + "</a>\n<p class=\"settings\">\n	<label for=\"inp_server\">\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Turtl server", {"name":"t","hash":{},"data":data})))
    + "\n		<input type=\"text\" name=\"server\" value=\""
    + escapeExpression(((helper = (helper = helpers.server || (depth0 != null ? depth0.server : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"server","hash":{},"data":data}) : helper)))
    + "\" placeholder=\"https://api.turtl.it/api\">\n	</label>\n</p>\n\n";
},"useData":true});
templates['users/login'] = template({"1":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "	<div class=\"autologin\">\n		<label>\n			<input type=\"checkbox\" name=\"autologin\" value=\"1\" ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.autologin : depth0), {"name":"if","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + ">\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Stay logged in", {"name":"t","hash":{},"data":data})))
    + "\n		</label>\n	</div>\n";
},"2":function(depth0,helpers,partials,data) {
  return "checked";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", buffer = "<input type=\"text\" name=\"username\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Username", {"name":"t","hash":{},"data":data})))
    + "\" tabindex=\"1\" autocomplete=\"off\" autocorrect=\"off\" autocapitalize=\"none\">\n<input type=\"password\" name=\"password\" placeholder=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Passphrase", {"name":"t","hash":{},"data":data})))
    + "\" autocomplete=\"off\" tabindex=\"2\">\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.show_autologin : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\n<div class=\"buttons\">\n	<div class=\"button login\">\n		<input type=\"submit\" class=\"button\" value=\""
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Login", {"name":"t","hash":{},"data":data})))
    + "\">\n	</div>\n	<p class=\"load\">\n		"
    + escapeExpression(((helpers.svg || (depth0 && depth0.svg) || helperMissing).call(depth0, "loading", {"name":"svg","hash":{},"data":data})))
    + "\n	</p>\n	<p>\n		<a href=\"/users/welcome\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Create an account", {"name":"t","hash":{},"data":data})))
    + "</a>\n	</p>\n</div>\n\n<a class=\"open-settings\" href=\"#settings\">"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Advanced settings", {"name":"t","hash":{},"data":data})))
    + " "
    + escapeExpression(((helpers.icon || (depth0 && depth0.icon) || helperMissing).call(depth0, "more", {"name":"icon","hash":{},"data":data})))
    + "</a>\n<p class=\"settings\">\n	<label for=\"inp_server\">\n		"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Turtl server", {"name":"t","hash":{},"data":data})))
    + "\n		<input type=\"text\" name=\"server\" value=\""
    + escapeExpression(((helper = (helper = helpers.server || (depth0 != null ? depth0.server : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"server","hash":{},"data":data}) : helper)))
    + "\" placeholder=\"https://api.turtl.it/api\">\n	</label>\n</p>\n\n";
},"useData":true});
templates['users/welcome'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"interface\">\n	<div class=\"confirm-text\">\n		<h2>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "A note on how Turtl works", {"name":"t","hash":{},"data":data})))
    + "</h2>\n		<p>\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Your account username and password together act as the \"key\" that locks and unlocks your data.", {"name":"t","hash":{},"data":data})))
    + "\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "We don't store your login info anywhere, so <em class=\"error\">you need to remember your login</em> or keep it in a safe place (like a password manager).", {"name":"t","hash":{},"data":data})))
    + "\n		</p>\n		<p>\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "Turtl has no \"Lost password\" feature. If you lose your login, your profile is gone forever!", {"name":"t","hash":{},"data":data})))
    + "\n		</p>\n		<p>\n			"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "It can be helpful to use your email address as your username.", {"name":"t","hash":{},"data":data})))
    + "\n		</p>\n	</div>\n\n	<div class=\"buttons\">\n		<div class=\"button confirm\">\n			<span>"
    + escapeExpression(((helpers.t || (depth0 && depth0.t) || helperMissing).call(depth0, "I will remember my login!", {"name":"t","hash":{},"data":data})))
    + "</span>\n		</div>\n	</div>\n</div>\n\n";
},"useData":true});
})();