.PHONY: all clean watch

NODE := $(shell which node)
LESSC := node_modules/.bin/lessc
HANDLEBARS := node_modules/.bin/handlebars
POSTCSS := scripts/postcss.js


lessfiles := $(shell find css/ -name "*.less")
cssfiles := $(lessfiles:%.less=%.css)
handlebars := $(shell find views/ -name "*.hbs")
allcss = $(shell find css/ -name "*.css" \
			| grep -v 'reset.css')
alljs = $(shell echo "main.js" \
			&& find {config,controllers,handlers,library,models,turtl} -name "*.js" \
			| grep -v '(ignore|\.thread\.)')
testsjs = $(shell find tests/{data,tests} -name "*.js")

all: $(cssfiles) library/templates.js library/svg-icons.js .build/postcss index.html

%.css: %.less
	@echo "- LESS:" $< "->" $@
	@$(LESSC) --include-path=css/ $< > $@

library/templates.js: $(handlebars)
	@echo "- Handlebars: " $?
	@$(HANDLEBARS) -r views -e "hbs" -n "TurtlTemplates" -f $@ $^
	@echo 'var TurtlTemplates = {};' > .build/templates.js
	@cat $@ >> .build/templates.js
	@mv .build/templates.js $@

library/svg-icons.js:
	@./scripts/index-icons

.build/postcss: $(allcss) $(cssfiles)
	@echo "- postcss:" $?
	@$(NODE) $(POSTCSS) --use autoprefixer --replace $?
	@touch $@

index.html: $(allcss) $(alljs) $(cssfiles) library/templates.js views/layouts/default.html .build/postcss scripts/include.sh scripts/gen-index
	@echo "- index.html: " $?
	@./scripts/gen-index

tests/index.html: $(testsjs) index.html tests/scripts/gen-index
	@echo "- tests/index.html: " $?
	@./tests/scripts/gen-index

clean:
	rm -f $(allcss)
	rm -f library/templates.js
	rm -f library/svg-icons.js
	rm -f .build/*
	rm -f index.html

watch:
	@./scripts/watch

