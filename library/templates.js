this["TurtlTemplates"] = this["TurtlTemplates"] || {};

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