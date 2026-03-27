.PHONY: clean install spellcheck spellcheck-pdf link-check syntax-check unit-test check start stop db-export backup-db migrate-db profile-data-db deploy-db profile-data-backup profile-data-upload pre-migration-schema migrate-db post-migration-schema verify-migration rollback-db verify-schema run-sql-file print-table

install:
	npm install
	cd api && npm install

lint:
	@npx eslint@8 "api/**/*.js" "assets/js/**/*.js" --ext .js --ignore-pattern "**/__tests__/**" --ignore-pattern "**/*.test.js" --fix

spellcheck:
	npx cspell "**/*.{html,css,js,ts}" "assets/*.txt" "api/**/*.js" --verbose

link-check:
	npx linkinator ./index.html ./admin.html ./auth.html ./experience-ai.html ./fit-ai.html

unit-test:
	@echo "Running top-level tests"
	npm test
	@echo "Running API tests"
	cd api && npm test -- --runInBand

check:
	@echo "==> [1/4] Running spellcheck"
	@$(MAKE) spellcheck
	@echo "==> [2/4] Running lint"
	@$(MAKE) lint
	@echo "==> [3/4] Running unit tests"
	@$(MAKE) unit-test
	@echo "==> [4/4] Running link check"
	@$(MAKE) link-check
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
	npx swa start --config swa-cli.config.json --config-name me-local

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

backup-db:
	@echo "Backing up Azure SQL database to db/export.bacpac (requires sqlpackage)"
	@set -e; \
	if [ ! -f .env.local ]; then echo ".env.local not found; create .env.local with AZURE_SQL_CONN set"; exit 1; fi; \
	AZURE_SQL_CONN_LINE=$$(grep -E '^AZURE_SQL_CONN=' .env.local || true); \
	if [ -z "$$AZURE_SQL_CONN_LINE" ]; then echo "AZURE_SQL_CONN not found in .env.local; please add it (wrap in quotes if it contains semicolons)"; exit 1; fi; \
	AZURE_SQL_CONN=$$(echo "$$AZURE_SQL_CONN_LINE" | sed -E 's/^AZURE_SQL_CONN=//; s/^"(.*)"$$/\1/'); \
	if [ -z "$$AZURE_SQL_CONN" ]; then echo "AZURE_SQL_CONN in .env.local is empty; please set it"; exit 1; fi; \
	if ! command -v sqlpackage >/dev/null 2>&1; then echo "sqlpackage not found. Install Microsoft SQLPackage to export bacpac."; exit 1; fi; \
	TIMESTAMP=$$(date +%Y%m%d%H%M%S); \
	echo "Exporting to db/backup-$$TIMESTAMP.bacpac"; \
	sqlpackage /Action:Export /SourceConnectionString:"$$AZURE_SQL_CONN" /TargetFile:db/backup-$$TIMESTAMP.bacpac || (echo "sqlpackage export failed"; exit 1); \
	mv db/backup-$$TIMESTAMP.bacpac db/export.bacpac; \
	echo "Backup complete: db/export.bacpac"

deploy-db:
	@echo "Starting base schema deploy: will run db/schema_azure.sql"
	@printf "Are you sure you want to deploy the base schema? Type 'yes' to continue: "; \
	read CONFIRM; \
	if [ "$${CONFIRM}" != "yes" ]; then echo "Aborting deploy-db."; exit 1; fi; \
	@set -e; \
	$(MAKE) run-sql-file file=db/schema_azure.sql || { echo "schema apply failed"; exit 1; }; \
	echo "Database deployment complete."

run-sql-file:
	@echo "Running SQL file: $(file)"
	@bash scripts/run-sql-file.sh $(file)

install-sqlcmd:
	@echo "Running sqlcmd installer script scripts/install-sqlcmd.sh"
	@bash scripts/install-sqlcmd.sh
	@echo "Ensuring sqlpackage is installed (for bacpac export/import)"
	@bash scripts/install-sqlpackage.sh || echo "sqlpackage installer failed; please install sqlpackage manually if you need backup/restore"