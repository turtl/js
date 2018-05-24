.PHONY: all clean watch locale-template

SHELL := /bin/bash

# set our build directory
BUILD := build
export BUILD

CSS_STATIC_PATH ?= '../..'

export SHELL := /bin/bash

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
			&& find {config,controllers,handlers,lib,models} -name "*.js" \
			| grep -v '(ignore|\.thread\.)')
locales = $(shell find locales -name "*.js")

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
# script generation
################################################################################

$(BUILD)/lib/app/svg-icons.js: $(allsvg) scripts/index-icons
	@echo "- SVG: " $?
	@test -d "$(@D)" || mkdir -p "$(@D)"
	@./scripts/index-icons > $@

$(BUILD)/lib/app/lib-permissions.js: node_modules/turtl-lib-permissions/process.js
	@echo "- lib-permissions.js"
	@cp $? $@
	@echo "(function() {" >> $@
	@echo -n "var permdata = " >> $@
	@cat node_modules/turtl-lib-permissions/permissions.json >> $@
	@echo "Composer.object.merge(Permissions, Permissions.process(permdata))" >> $@
	@echo "})();" >> $@

$(BUILD)/lib/app/locales.js: $(locales) scripts/build-locales
	@echo "- Locales: " $?
	@test -d "$(@D)" || mkdir -p "$(@D)"
	@./scripts/build-locales > $@

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
	@echo '"A lot of people are laughing at the heels on your shoes"' > $@
	@echo '"I'"'"'m not gonna be wearing the shoes, am I?!"' >> $@

################################################################################
# index
################################################################################

index.html: $(alljs) $(cssfiles) $(cssvndout) $(BUILD)/lib/app/svg-icons.js $(BUILD)/lib/app/templates.js $(BUILD)/lib/app/lib-permissions.js $(BUILD)/lib/app/locales.js views/layouts/default.html $(BUILD)/postcss scripts/include.sh scripts/gen-index
	@echo "- index.html: " $?
	@./scripts/gen-index > $@

min.index.html: $(alljs) $(cssfiles) $(cssvndout) $(BUILD)/lib/app/svg-icons.js $(BUILD)/lib/app/templates.js $(BUILD)/lib/app/lib-permissions.js views/layouts/default.html $(BUILD)/postcss scripts/include.sh scripts/gen-index
	@echo "- index.html: " $?
	@./scripts/gen-minified-index

minify: $(cssfiles) lib/app/templates.js lib/app/svg-icons.js $(BUILD)/lib/app/lib-permissions.js $(BUILD)/postcss min.index.html

################################################################################
# locale utils
################################################################################

locales/locale.js.template: $(alljs) scripts/gen-i18n-template
	@echo "- Building $@: " $?
	@./scripts/gen-i18n-template > $@

locale-template: locales/locale.js.template

################################################################################
# util
################################################################################

clean:
	rm -rf $(BUILD)
	rm -f index.html

watch:
	@$(NODE) ./scripts/fswatch

