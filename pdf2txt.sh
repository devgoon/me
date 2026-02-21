#!/bin/bash
# Convert all PDF files in assets/ and subdirectories to text
find assets/ -type f -name '*.pdf' | while read -r f; do
  txt_file="${f%.pdf}.txt"
  pdftotext "$f" "$txt_file"
done
