.PHONY: e2e install install-ci e2e lint spellcheck unit-test coverage check evals start stop backup-db deploy-db run-sql-file install-sqlcmd dump-schema restore-db gh-sync-env clean


install:
	@# Local developer install: allow generating/updating the lockfile.
	@npm install --workspaces --legacy-peer-deps --include=dev

install-ci:
	@# CI install: require root package-lock.json and perform reproducible install
	@if [ ! -f package-lock.json ]; then \
		echo "package-lock.json missing; aborting CI install"; exit 1; \
	fi
	@npm ci --workspaces --legacy-peer-deps --include=dev
	
lint:spellcheck
	@# If running in CI, require eslint to be present (fail fast).
	@if [ -n "$$CI" ]; then \
		if [ ! -x ./node_modules/.bin/eslint ]; then \
			echo "eslint not found in ./node_modules/.bin — CI must install devDependencies (run 'make install-ci')"; exit 1; \
		fi; \
	else \
		if [ ! -x ./node_modules/.bin/eslint ]; then \
			echo "eslint missing locally; running 'make install' to restore devDependencies"; \
			$(MAKE) install; \
		fi; \
	fi
	@npx prettier --write "**/*.{jsx,js,json,md,css,html}"
	@npm run lint --silent --

spellcheck:
	npx cspell "frontend-react/*.{html,css,jsx,js,tsx, ts}" "api/**/*.js" --verbose

unit-test: evals
	@echo "==> Running eval tests (no coverage)"
	@npm run test:evals || true
	@echo "==> Running UI tests (frontend-react) with coverage"
	@npm run test:ui || true
	@echo "==> Running API tests with coverage"
	@npm --prefix api run coverage || true

coverage: unit-test


check:

	@echo "==> Running lint/spellcheck"
	make lint
	@echo "==> Building frontend"
	@$(MAKE) build-frontend
	@echo "==> Running evals, unit tests and coverage"
	@$(MAKE) coverage
	@echo "==> Quality checks complete"

evals:
	@echo "Running eval runner (fit + chat)"
	npm run test:evals

build-frontend:
	@echo "Building frontend (frontend-react)"
	@npm --prefix frontend-react run build || { echo "Frontend build failed (frontend-react)."; exit 1; }
e2e:
	bash scripts/run-e2e.sh
	
start:
	@mkdir -p .azurite
	# Load .env.local into environment for child processes (single source of truth)
	if [ -f .env.local ]; then \
		set -a; . .env.local; set +a; \
	fi; \
	@npx -y azurite --silent --location .azurite --debug .azurite/debug.log >/dev/null 2>&1 & \
	AZURITE_PID=$$!; \
	REACT_WATCH_PID=""; \
	trap 'kill $$AZURITE_PID $$REACT_WATCH_PID >/dev/null 2>&1 || true' EXIT INT TERM; \
	# Ensure DEBUG_DB is enabled for local Functions host unless explicitly disabled
	if [ -z "$$DEBUG_DB" ]; then \
		export DEBUG_DB=1; \
	fi; \
	# Build and serve React frontend by default.
	echo "Building React frontend (frontend-react/dist)..."; \
	# Run the frontend build and fail loudly with a helpful message if it errors
	# (avoids masking failures with `|| true`).
	npm --prefix frontend-react run build || { echo "Frontend build failed — see frontend-react build output"; exit 1; }; \
	echo "Watching React frontend for changes (frontend-react/dist)..."; \
	# Start watch in background; swallow non-zero from the backgrounded watcher only
	npm --prefix frontend-react run build:watch >/dev/null 2>&1 & \
	REACT_WATCH_PID=$$!; \
	echo "Starting local SWA emulator from frontend-react/dist with api/"; \
	npx @azure/static-web-apps-cli@latest start frontend-react/dist --api-location api --port 4280

stop:
	@set -e; \
	PIDS=""; \
	for PORT in 4280 7071 10000 10001 10002 5173 4173; do \
		FOUND=$$(lsof -tiTCP:$$PORT -sTCP:LISTEN || true); \
		if [ -n "$$FOUND" ]; then \
			PIDS="$$PIDS $$FOUND"; \
		fi; \
	done; \
	PIDS=$$(printf "%s\n" $$PIDS | tr ' ' '\n' | sed '/^$$/d' | sort -u | tr '\n' ' '); \
	if [ -z "$$PIDS" ]; then \
		echo "No local SWA/Functions/Azurite/Vite processes are listening on app ports."; \
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
		for PORT in 4280 7071 10000 10001 10002 5173 4173; do \
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
	@echo "Backing up database '$(TARGET_DB)' to db/*.bacpac (requires ADMIN_DATABASE_ADO in .env.local)"
	@if [ ! -f .env.local ]; then echo ".env.local not found; create .env.local with ADMIN_DATABASE_ADO set"; exit 1; fi; \
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
	@echo "Exporting database schema to db/schema.sql (requires ADMIN_DATABASE_ADO in .env.local)"
	@bash scripts/dump-schema.sh db/schema.sql

restore-db: install-sqlcmd
	@# Usage: make restore-db BACPAC=path/to/file.bacpac TARGET_DB=target_db_name
	@if [ -z "$(BACPAC)" ] || [ -z "$(TARGET_DB)" ]; then \
		echo "Usage: make restore-db BACPAC=path/to/file.bacpac TARGET_DB=target_db_name"; exit 1; \
	fi; \
	printf "About to restore BACPAC '%s' into database '%s'\n" "$(BACPAC)" "$(TARGET_DB)"; \
	printf "This is destructive. Proceed? Type 'yes' to continue: "; read ans; \
	if [ "$$ans" != "yes" ]; then echo "Aborted."; exit 1; fi; \
	@echo "Restoring BACPAC '$(BACPAC)' into database '$(TARGET_DB)' (server from .env.local ADMIN_DATABASE_ADO)"; \
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



clean:
	@echo "Cleaning node_modules, build artifacts and caches..."
	@rm -rf node_modules frontend-react/node_modules
	@rm -f frontend-react/package-lock.json
	@rm -rf frontend-react/dist coverage .azurite .vite .cache
	@echo "Running 'npm cache verify' (use --force to aggressively clean)"
	@npm cache verify || true
	@echo "Clean complete. To reinstall, run: 'make install' or 'make install-ci'"
