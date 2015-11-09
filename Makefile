NODE := $(shell which node)
LESSC := node_modules/.bin/lessc
HANDLEBARS := node_modules/.bin/handlebars
POSTCSS := scripts/postcss.js


lessfiles := $(shell find css/ -name "*.less")
cssfiles := $(lessfiles:%.less=%.css)
handlebars := $(shell find views/ -name "*.hbs")
allcss = $(shell find css/ -name "*.css" \
		 	| grep -v '\(jquery-ui\|perfect-scrollbar\)')
alljs = $(shell find {config,controllers,handlers,library,models} -name "*.js" \
			| grep -v '(ignore|\.thread\.)')

.PHONY: all

all: $(cssfiles) library/templates.js .build/postcss index.html

%.css: %.less
	@echo "- Less:" $< "->" $@
	@$(LESSC) --include-path=css/ $< > $@

library/templates.js: $(handlebars)
	@echo "- Handlebars: " $?
	@$(HANDLEBARS) -r views -e "hbs" -n "Templates" -f $@ $^
	@sed -i '1s/^/var Templates = {};\n/' $@

.build/postcss: $(allcss) $(cssfiles)
	@echo "- Post CSS" $^
	@$(NODE) $(POSTCSS) --use autoprefixer --replace $^
	@touch $@

index.html: $(allcss) $(alljs) $(cssfiles) .build/postcss
	@echo "- Gen index: " $?
	@./scripts/gen-index

