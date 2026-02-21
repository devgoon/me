.PHONY: install spellcheck link-check all


spellcheck:
	npx cspell "**/*.{html,css,js}"

spellcheck-pdf:
	bash ./pdf2txt.sh
	@files=$$(find assets/ -type f -name '*.txt'); \
	if [ -n "$$files" ]; then \
	  npx cspell $$files; \
	else \
	  echo "No .txt files found for spellchecking."; \
	fi

link-check:
	npx linkinator ./index.html


install:
	npm install

all: spellcheck link-check spellcheck-pdf
#
# Dependencies for spellchecking PDF and DOCX:
#   - pdftotext (install via 'brew install poppler' on macOS)
