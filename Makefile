.PHONY: install spellcheck link-check all


spellcheck:spellcheck-pdf
	npx cspell "**/*.{html,css,js}" "assets/*.txt" --verbose

spellcheck-pdf:
	bash ./pdf2txt.sh

link-check:
	npx linkinator ./index.html

install:
	npm install

all: spellcheck link-check
#
# Dependencies for spellchecking PDF and DOCX:
#   - pdftotext (install via 'brew install poppler' on macOS)
