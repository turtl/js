.PHONY: all clean watch

SHELL := /bin/bash

# set our build directory
BUILD := build
export BUILD

CSS_STATIC_PATH ?= '../..'

NODE := $(shell which node)
LESSC := node_modules/.bin/lessc
HANDLEBARS := node_modules/.bin/handlebars
POSTCSS := scripts/postcss.js


lessfiles := $(shell find css/ -name "*.less")
cssfiles := $(subst css/,$(BUILD)/css/,$(lessfiles:%.less=%.css))
cssvnd := $(shell find css/vnd/ -name '*.css')
cssvndout = $(subst css/,$(BUILD)/css/,$(cssvnd:%.less=%.css))
handlebars := $(shell find views/ -name "*.hbs")
allsvg = $(shell find images/site/icons/ -name "*.svg")
alljs = $(shell echo "main.js" \
			&& find {config,controllers,handlers,locales,lib,models,turtl} -name "*.js" \
			| grep -v '(ignore|\.thread\.)')
testsjs = $(shell find tests/{data,tests} -name "*.js")

all: index.html

################################################################################
# templates
################################################################################

$(BUILD)/lib/app/templates.js: $(handlebars)
	@echo "- Handlebars: " $?
	@test -d "$(@D)" || mkdir -p "$(@D)"
	@$(HANDLEBARS) -r views -e "hbs" -n "TurtlTemplates" -f $@ $^
	@echo 'var TurtlTemplates = {};' > $(BUILD)/templates.js
	@cat $@ >> $(BUILD)/templates.js
	@mv $(BUILD)/templates.js $@

################################################################################
# CSS
################################################################################

$(BUILD)/css/vnd/%.css: css/vnd/%.css
	@echo "- CSS (vnd): $< -> $@"
	@test -d "$(@D)" || mkdir -p "$(@D)"
	@cp $< $@

$(BUILD)/css/%.css: css/%.less
	@echo "- Less: $< -> $@"
	@test -d "$(@D)" || mkdir -p "$(@D)"
	@$(LESSC) --include-path=css/ --modify-var="static='${CSS_STATIC_PATH}'" $< > $@

$(BUILD)/postcss: $(cssfiles) $(cssvndout)
	@echo "- postcss:" $?
	@$(NODE) $(POSTCSS) --use autoprefixer --replace $?
	@touch $@

################################################################################
# icons
################################################################################

$(BUILD)/lib/app/svg-icons.js: $(allsvg) scripts/index-icons
	@echo "- SVG: " $?
	@test -d "$(@D)" || mkdir -p "$(@D)"
	@./scripts/index-icons > $@

################################################################################
# index
################################################################################

index.html: $(alljs) $(cssfiles) $(cssvndout) $(BUILD)/lib/app/svg-icons.js $(BUILD)/lib/app/templates.js views/layouts/default.html $(BUILD)/postcss scripts/include.sh scripts/gen-index
	@echo "- index.html: " $?
	@./scripts/gen-index > $@

tests/index.html: $(testsjs) index.html tests/scripts/gen-index
	@echo "- tests/index.html: " $?
	@./tests/scripts/gen-index

min.index.html: $(alljs) $(cssfiles) $(cssvndout) $(BUILD)/lib/app/svg-icons.js $(BUILD)/lib/app/templates.js views/layouts/default.html $(BUILD)/postcss scripts/include.sh scripts/gen-index
	@echo "- index.html: " $?
	@./scripts/gen-minified-index

minify: $(cssfiles) lib/app/templates.js lib/app/svg-icons.js $(BUILD)/postcss min.index.html

################################################################################
# util
################################################################################

clean:
	rm -rf $(BUILD)
	rm -f index.html

watch:
	@$(NODE) ./scripts/fswatch

