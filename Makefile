.PHONY: install spellcheck link-check check start live stop

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
start:
	@mkdir -p .azurite
	@npx -y azurite --silent --location .azurite --debug .azurite/debug.log >/dev/null 2>&1 & \
	AZURITE_PID=$$!; \
	trap 'kill $$AZURITE_PID >/dev/null 2>&1 || true' EXIT INT TERM; \
	npx swa start . --api-location api

live: start

stop:
	@set -e; \
	PIDS=""; \
	for PORT in 4280 7071 10000 10001 10002; do \
		FOUND=$$(lsof -tiTCP:$$PORT -sTCP:LISTEN || true); \
		if [ -n "$$FOUND" ]; then \
			PIDS="$$PIDS $$FOUND"; \
		fi; \
	done; \
	PIDS=$$(printf "%s\n" $$PIDS | tr ' ' '\n' | sed '/^$$/d' | sort -u | tr '\n' ' '); \
	if [ -z "$$PIDS" ]; then \
		echo "No local SWA/Functions/Azurite processes are listening on app ports."; \
		exit 0; \
	fi; \
	echo "Stopping local app processes: $$PIDS"; \
	kill -INT $$PIDS >/dev/null 2>&1 || true; \
	for _ in 1 2 3 4 5; do \
		sleep 1; \
		STILL_RUNNING=""; \
		for PID in $$PIDS; do \
			if kill -0 $$PID >/dev/null 2>&1; then \
				STILL_RUNNING="$$STILL_RUNNING $$PID"; \
			fi; \
		done; \
		if [ -z "$$STILL_RUNNING" ]; then \
			echo "Local app stack stopped."; \
			exit 0; \
		fi; \
	done; \
	echo "Processes still running after SIGINT:$$STILL_RUNNING"; \
	kill -TERM $$STILL_RUNNING >/dev/null 2>&1 || true; \
	for _ in 1 2 3 4 5; do \
		sleep 1; \
		NEXT=""; \
		for PID in $$STILL_RUNNING; do \
			if kill -0 $$PID >/dev/null 2>&1; then \
				NEXT="$$NEXT $$PID"; \
			fi; \
		done; \
		STILL_RUNNING="$$NEXT"; \
		if [ -z "$$STILL_RUNNING" ]; then \
			echo "Local app stack stopped."; \
			exit 0; \
		fi; \
	done; \
	STILL_RUNNING=""; \
	for PID in $$PIDS; do \
		if kill -0 $$PID >/dev/null 2>&1; then \
			STILL_RUNNING="$$STILL_RUNNING $$PID"; \
		fi; \
	done; \
	if [ -n "$$STILL_RUNNING" ]; then \
		echo "Processes still running after SIGINT and SIGTERM:$$STILL_RUNNING"; \
		echo "Use 'kill -9' manually if you want to force-stop them."; \
		exit 1; \
	fi; \
	echo "Local app stack stopped.";
