.PHONY: install spellcheck link-check accessibility all


spellcheck:
	npx cspell "**/*.{html,css,js}" --exclude "assets/**" --exclude ".github/**" --exclude ".git/**"

link-check:
	npx linkinator ./index.html

accessibility:
	pa11y ./index.html

install:
	npm install

all: spellcheck link-check accessibility
