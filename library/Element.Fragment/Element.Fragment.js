Browser.Fragment = window.DocumentFragment;

var Fragment = function(){
	return document.newFragment.apply(document, arguments);
};

if (Browser.Fragment) Fragment.prototype = Browser.Fragment.prototype;

new Type('Fragment', Fragment);

if (!Browser.Fragment){
	Fragment.parent = Object;

	Fragment.Prototype = {'$family': Function.from('fragment').hide()};

	Fragment.mirror(function(name, method){
		Fragment.Prototype[name] = method;
	});
}

Fragment.implement({
	
	adopt: function(){
		var elements = Array.flatten(arguments), length = elements.length;
		for (var i = 0; i < length; i++){
			var element = document.id(elements[i], true);
			if (element) this.appendChild(element);
		}
	}
	
});

Document.implement({
	
	newFragment: function(){
		return document.id(this.createDocumentFragment());
	}
	
});

if (!document.createDocumentFragment().contains) Fragment.implement('contains', Element.prototype.contains);

(function(){

var methods = ['appendText','grab','inject','replaces','wraps','getFirst','getLast','getChildren','getWindow','getDocument','getElementById','empty','clone','getElements','getElement'], i;

for (i=0; name=methods[i++];) Fragment.implement(name, Element.prototype[name]);

})();