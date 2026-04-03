.PHONY: install lint spellcheck link-check unit-test coverage check start stop backup-db deploy-db run-sql-file install-sqlcmd dump-schema restore-db gh-sync-env

install:
	npm install
	cd api && npm install

# CI-friendly install: install only runtime (non-dev) dependencies
# Use `make install-ci` in CI to avoid devDependencies being installed.
install-ci:
	npm ci --omit=dev
	cd api && npm ci --omit=dev

lint:
	@# Auto-format with Prettier, then run ESLint autofix
	@npx prettier --write "**/*.{js,json,md,css,html}"
	@npx eslint "api/**/*.js" "frontend/assets/js/**/*.js" --ignore-pattern "**/__tests__/**" --ignore-pattern "**/*.test.js" --fix

spellcheck:
	npx cspell "**/*.{html,css,js,ts}" "frontend/assets/*.txt" "api/**/*.js" --verbose

link-check:
	npx linkinator ./frontend/index.html ./frontend/admin.html ./frontend/auth.html ./frontend/experience.html ./frontend/fit.html

unit-test:
	@echo "Running top-level tests"
	npm test

coverage:
	@echo "Running repository tests with coverage (console summary)"
	@npm run coverage

check:
	@echo "==> [1/5] Running spellcheck"
	@$(MAKE) spellcheck
	@echo "==> [2/5] Running lint"
	@$(MAKE) lint
	@echo "==> [3/5] Running link check"
	@$(MAKE) link-check
	@echo "==> [4/5] Running unit tests"
	@$(MAKE) unit-test
	@echo "==> [5/5] Running code coverage check"
	@$(MAKE) coverage
	@echo "==> Quality checks complete"

start:
	@mkdir -p .azurite
	@npx -y azurite --silent --location .azurite --debug .azurite/debug.log >/dev/null 2>&1 & \
	AZURITE_PID=$$!; \
	trap 'kill $$AZURITE_PID >/dev/null 2>&1 || true' EXIT INT TERM; \
	# Load .env.local into environment for child processes (single source of truth)
	if [ -f .env.local ]; then \
		set -a; . .env.local; set +a; \
	fi; \
	# Ensure DEBUG_DB is enabled for local Functions host unless explicitly disabled
	if [ -z "$$DEBUG_DB" ]; then \
		export DEBUG_DB=1; \
	fi; \
	# Prepare swa-dist locally (like CI) and start the emulator from swa-dist
	# Start the SWA emulator directly from the frontend directory (no swa-dist copy)
	echo "Starting local SWA emulator from frontend/ with api/"; \
	npx @azure/static-web-apps-cli@latest start frontend --api-location api --port 4280

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
	echo "Local app stack stopped."

backup-db: install-sqlcmd
	@# Usage: make backup-db TARGET_DB=database_name
	@if [ -z "$(TARGET_DB)" ]; then \
		echo "Usage: make backup-db TARGET_DB=database_name"; exit 1; \
	fi
	@echo "Backing up database '$(TARGET_DB)' to db/*.bacpac (requires DATABASE_ADO in .env.local)"
	@if [ ! -f .env.local ]; then echo ".env.local not found; create .env.local with DATABASE_ADO set"; exit 1; fi; \
	./scripts/backup-db.sh "$(TARGET_DB)" || (echo "backup script failed"; exit 1)

run-sql-file:
	@# Usage: make run-sql-file file=path/to/sql
	@if [ -z "$(file)" ]; then echo "Usage: make run-sql-file file=path/to/sql"; exit 1; fi; \
	printf "About to run SQL file: %s\n" "$(file)"; \
	printf "Proceed? Type 'yes' to continue: "; read ans; \
	if [ "$$ans" != "yes" ]; then echo "Aborted."; exit 1; fi; \
	@echo "Running SQL file: $(file)"; \
	bash scripts/run-sql-file.sh "$(file)"

install-sqlcmd:
	@echo "Running sqlcmd installer script scripts/install-sqlcmd.sh"
	@bash scripts/install-sqlcmd.sh
	@echo "Ensuring sqlpackage is installed (for bacpac export/import)"
	@bash scripts/install-sqlpackage.sh || echo "sqlpackage installer failed; please install sqlpackage manually if you need backup/restore"


dump-schema: install-sqlcmd
	@echo "Exporting database schema to db/schema.sql (requires DATABASE_ADO in .env.local)"
	@bash scripts/dump-schema.sh db/schema.sql

restore-db: install-sqlcmd
	@# Usage: make restore-db BACPAC=path/to/file.bacpac TARGET_DB=target_db_name
	@if [ -z "$(BACPAC)" ] || [ -z "$(TARGET_DB)" ]; then \
		echo "Usage: make restore-db BACPAC=path/to/file.bacpac TARGET_DB=target_db_name"; exit 1; \
	fi; \
	printf "About to restore BACPAC '%s' into database '%s'\n" "$(BACPAC)" "$(TARGET_DB)"; \
	printf "This is destructive. Proceed? Type 'yes' to continue: "; read ans; \
	if [ "$$ans" != "yes" ]; then echo "Aborted."; exit 1; fi; \
	@echo "Restoring BACPAC '$(BACPAC)' into database '$(TARGET_DB)' (server from .env.local DATABASE_ADO)"; \
	./scripts/restore-db.sh "$(BACPAC)" "$(TARGET_DB)"

gh-sync-env:
	@# Usage: make gh-sync-env REPO=owner/repo ENV_FILE=.env.local
	@ENV_FILE=${ENV_FILE:-.env.local}; \
	REPO_FROM_MAKE="$(REPO)"; \
	if [ -n "$$REPO_FROM_MAKE" ]; then \
		REPO="$$REPO_FROM_MAKE"; \
	else \
		REPO=""; \
	fi; \
	if [ -z "$$REPO" ]; then \
		echo "No REPO specified; attempting to detect via gh..."; \
		REPO=$$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true); \
		if [ -z "$$REPO" ]; then \
			echo "Specify REPO=owner/repo"; exit 1; \
		fi; \
	fi; \
	printf "About to sync env vars from %s to %s. This will create/update Secrets/Variables.\n" "$$ENV_FILE" "$$REPO"; \
	printf "Proceed? Type 'yes' to continue: "; read ans; \
	if [ "$$ans" != "yes" ]; then echo "Aborted."; exit 1; fi; \
	./scripts/gh-sync-env-to-gh.sh --env-file "$$ENV_FILE" --repo "$$REPO"