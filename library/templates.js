this["TurtlTemplates"] = this["TurtlTemplates"] || {};

this["TurtlTemplates"]["boards/edit"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<h1>"
    + escapeExpression(((helper = (helper = helpers.action || (depth0 != null ? depth0.action : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"action","hash":{},"data":data}) : helper)))
    + " board</h1>\n";
},"useData":true});

this["TurtlTemplates"]["boards/index"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div class=\"boards\"></div>\n\n";
  },"useData":true});

this["TurtlTemplates"]["boards/item"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "<div class=\"board-actions\"></div>\n\n<h2>"
    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.board : depth0)) != null ? stack1.title : stack1), depth0))
    + "</h2>\n<p>0 notes</p>\n\n";
},"useData":true});

this["TurtlTemplates"]["boards/list"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<ul class=\"item-list\"></ul>\n";
  },"useData":true});

this["TurtlTemplates"]["modules/actions"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "	<a href=\"#action\" rel=\"main\"><img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/action.svg", {"name":"asset","hash":{},"data":data})))
    + "\" alt=\"action\"></a>\n";
},"3":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "	<a href=\"#action\" rel=\"open\"><img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/action.svg", {"name":"asset","hash":{},"data":data})))
    + "\" alt=\"action\"></a>\n	<ul>\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.actions : depth0), {"name":"each","hash":{},"fn":this.program(4, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</ul>\n";
},"4":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<li><a href=\"#"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" rel=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\">"
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helperMissing=helpers.helperMissing, buffer = "";
  stack1 = ((helpers.equal || (depth0 && depth0.equal) || helperMissing).call(depth0, ((stack1 = (depth0 != null ? depth0.actions : depth0)) != null ? stack1.length : stack1), 1, {"name":"equal","hash":{},"fn":this.program(1, data),"inverse":this.program(3, data),"data":data}));
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"useData":true});

this["TurtlTemplates"]["modules/form_layout"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<div class=\"button-row clear\">\n				<div class=\"button submit\">\n					<span>"
    + escapeExpression(((helper = (helper = helpers.action || (depth0 != null ? depth0.action : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"action","hash":{},"data":data}) : helper)))
    + "</span>\n				</div>\n				<div class=\"button cancel\">\n					<span>Cancel</span>\n				</div>\n			</div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div class=\""
    + escapeExpression(((helper = (helper = helpers.formclass || (depth0 != null ? depth0.formclass : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"formclass","hash":{},"data":data}) : helper)))
    + " clear interface\">\n	<form class=\"standard-form\">\n		";
  stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"content","hash":{},"data":data}) : helper));
  if (stack1 != null) { buffer += stack1; }
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.buttons : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "		<input type=\"submit\" value=\"submit\" style=\"display:none;\">\n	</form>\n</div>\n\n";
},"useData":true});

this["TurtlTemplates"]["modules/header"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<a class=\"logo\" href=\"#\">\n	<img src=\""
    + escapeExpression(((helpers.asset || (depth0 && depth0.asset) || helperMissing).call(depth0, "/images/template/logo.svg", {"name":"asset","hash":{},"data":data})))
    + "\">\n	<icon>&#9776;</icon>\n</a>\n<h1><em>Turtl</em></h1>\n<div class=\"actions\"></div>\n";
},"useData":true});

this["TurtlTemplates"]["modules/item-actions"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<h2>"
    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))
    + "</h2>\n";
},"3":function(depth0,helpers,partials,data) {
  var stack1, buffer = "			<div class=\"row\">\n				<ul>\n";
  stack1 = helpers.each.call(depth0, depth0, {"name":"each","hash":{},"fn":this.program(4, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "				</ul>\n			</div>\n";
},"4":function(depth0,helpers,partials,data) {
  var helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda;
  return "						<li><a href=\"#"
    + escapeExpression(((helpers.sluggify || (depth0 && depth0.sluggify) || helperMissing).call(depth0, depth0, {"name":"sluggify","hash":{},"data":data})))
    + "\" rel=\""
    + escapeExpression(((helpers.sluggify || (depth0 && depth0.sluggify) || helperMissing).call(depth0, depth0, {"name":"sluggify","hash":{},"data":data})))
    + "\">"
    + escapeExpression(lambda(depth0, depth0))
    + "</a></li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "<div class=\"item-actions\">\n	<a href=\"#actions\"><icon>&#9206;</icon></a>\n	<div class=\"overlay\">&nbsp;</div>\n	<div class=\"menu\">\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.title : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.actions : depth0), {"name":"each","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "	</div>\n</div>\n\n";
},"useData":true});

this["TurtlTemplates"]["modules/sidebar"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div class=\"overlay\"></div>\n<div class=\"inner\">\n	<div class=\"gutter\">\n		hello\n	</div>\n</div>\n";
  },"useData":true});

this["TurtlTemplates"]["users/index"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div class=\"user-main clear\">\n	<div class=\"login-main\">\n	</div>\n	<div class=\"join-main\">\n	</div>\n</div>\n\n";
  },"useData":true});

this["TurtlTemplates"]["users/join"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "";
  stack1 = helpers.unless.call(depth0, (depth0 != null ? depth0.promo : depth0), {"name":"unless","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "	<div class=\"promo ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.promo : depth0), {"name":"if","hash":{},"fn":this.program(4, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\">\n		Promo code: <input type=\"text\" name=\"promo\" value=\""
    + escapeExpression(((helper = (helper = helpers.promo || (depth0 != null ? depth0.promo : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"promo","hash":{},"data":data}) : helper)))
    + "\" placeholder=\"Promo code\" tabindex=\"7\">\n	</div>\n";
},"2":function(depth0,helpers,partials,data) {
  return "		<a class=\"open-promo\" href=\"#open-promo\">Have a promo code?</a>\n";
  },"4":function(depth0,helpers,partials,data) {
  return "open";
  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "<input type=\"text\" name=\"username\" placeholder=\"Username\" tabindex=\"4\">\n<input type=\"password\" name=\"password\" placeholder=\"Password\" tabindex=\"5\">\n<input type=\"password\" name=\"confirm\" placeholder=\"Confirm password\" tabindex=\"6\">\n<!--\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.enable_promo : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "-->\n<div class=\"button join\">\n	<span>Join</span>\n</div>\n<p>\n	<a href=\"/users/login\">Login to an existing account</a>\n</p>\n\n";
},"useData":true});

this["TurtlTemplates"]["users/login"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<input type=\"text\" name=\"username\" placeholder=\"Username\" tabindex=\"1\">\n<input type=\"password\" name=\"password\" placeholder=\"Password\" tabindex=\"2\">\n\n<div class=\"button login\">\n	<span>Login</span>\n</div>\n\n<p>\n	<a href=\"/users/welcome\">Create an account</a>\n</p>\n\n";
  },"useData":true});

this["TurtlTemplates"]["users/welcome"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div class=\"interface\">\n	<div class=\"confirm-text\">\n		<h2>A note on how Turtl works</h2>\n		<p>\n			The username and password you use to create your Turtl account not\n			only lets you log in, but also acts as the \"key\" that locks and\n			unlocks your data.\n		</p>\n		<p>\n			For your security, your login and key are never stored anywhere in\n			the app or on Turtl's servers, and Turtl has no \"Forgot password\"\n			feature.\n		</p>\n		<p>\n			<em class=\"error\">You need to\n			remember your login</em> or keep it in a safe place (like a\n			password manager). If you lose it, your profile is lost!\n		</p>\n	</div>\n\n	<div class=\"button confirm\">\n		<span><icon>&#10003;</icon> I will remember my login!</span>\n	</div>\n</div>\n\n";
  },"useData":true});