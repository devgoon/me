.PHONY: install spellcheck link-check all


spellcheck:
	npx cspell "**/*.{html,css,js}"

link-check:
	npx linkinator ./index.html


install:
	npm install

all: spellcheck link-check
