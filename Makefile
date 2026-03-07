.PHONY: install spellcheck spellcheck-pdf link-check syntax-check ts-build config-check unit-test check start live stop

install:
	npm install
	cd api && npm install

spellcheck:spellcheck-pdf
	npx cspell "**/*.{html,css,js}" "assets/*.txt" --verbose

spellcheck-pdf:
	bash ./pdf2txt.sh

link-check:
	npx linkinator ./index.html

syntax-check:
	@set -e; \
	FILES="api/chat/index.js api/experience/index.js api/admin/index.js api/auth/index.js api/_shared/auth.js"; \
	for FILE in $$FILES; do \
		if [ -f "$$FILE" ]; then \
			node --check "$$FILE"; \
		fi; \
	done

ts-build:
	npm run build:ts

config-check:
	@node -e "const fs=require('fs'); const files=['package.json','cspell.json','staticwebapp.config.json','swa-cli.config.json']; for (const f of files) { if (fs.existsSync(f)) JSON.parse(fs.readFileSync(f,'utf8')); }"

unit-test:
	cd api && npm test -- --runInBand

check:
	@echo "==> [1/6] Running spellcheck"
	@$(MAKE) spellcheck
	@echo "==> [2/6] Building TypeScript frontend assets"
	@$(MAKE) ts-build
	@echo "==> [3/6] Running JavaScript syntax checks"
	@$(MAKE) syntax-check
	@echo "==> [4/6] Validating JSON/config files"
	@$(MAKE) config-check
	@echo "==> [5/6] Running API unit tests"
	@$(MAKE) unit-test
	@echo "==> [6/6] Running link check"
	@$(MAKE) link-check
	@echo "==> Quality checks complete"
#
# Dependencies for spellchecking PDF and DOCX:
#   - pdftotext (install via 'brew install poppler' on macOS)
start:
	@mkdir -p .azurite
	@npx -y azurite --silent --location .azurite --debug .azurite/debug.log >/dev/null 2>&1 & \
	AZURITE_PID=$$!; \
	trap 'kill $$AZURITE_PID >/dev/null 2>&1 || true' EXIT INT TERM; \
	npx swa start --config swa-cli.config.json --config-name me-local

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
	kill -CONT $$PIDS >/dev/null 2>&1 || true; \
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
	kill -CONT $$STILL_RUNNING >/dev/null 2>&1 || true; \
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
		echo "Escalating to SIGKILL..."; \
		kill -KILL $$STILL_RUNNING >/dev/null 2>&1 || true; \
		sleep 1; \
	fi; \
	STILL_RUNNING=""; \
	for PID in $$PIDS; do \
		if kill -0 $$PID >/dev/null 2>&1; then \
			STILL_RUNNING="$$STILL_RUNNING $$PID"; \
		fi; \
	done; \
	if [ -n "$$STILL_RUNNING" ]; then \
		LISTENERS=""; \
		for PORT in 4280 7071 10000 10001 10002; do \
			FOUND=$$(lsof -tiTCP:$$PORT -sTCP:LISTEN || true); \
			if [ -n "$$FOUND" ]; then \
				LISTENERS="$$LISTENERS $$FOUND"; \
			fi; \
		done; \
		if [ -z "$$LISTENERS" ]; then \
			echo "App ports are clear; ignoring defunct process entries:$$STILL_RUNNING"; \
			echo "Local app stack stopped."; \
			exit 0; \
		fi; \
		echo "Unable to stop processes:$$STILL_RUNNING"; \
		exit 1; \
	fi; \
	echo "Local app stack stopped.";
