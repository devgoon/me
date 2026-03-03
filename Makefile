.PHONY: install spellcheck link-check check live

install:
	npm install

spellcheck:spellcheck-pdf
	npx cspell "**/*.{html,css,js}" "assets/*.txt" --verbose

spellcheck-pdf:
	bash ./pdf2txt.sh

link-check:
	npx linkinator ./index.html

check: spellcheck link-check
#
# Dependencies for spellchecking PDF and DOCX:
#   - pdftotext (install via 'brew install poppler' on macOS)
live:
	npx http-server -p 8000 --silent
