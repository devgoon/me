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
	@echo "Backing up database..."
	@DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	TIMESTAMP=$$(date +%Y%m%d%H%M%S) ; \
	pg_dump --no-owner --no-acl --format=plain --file=db/backup-$$TIMESTAMP.sql "$$DB_URL" ; \
	mv db/backup-$$TIMESTAMP.sql db/export.sql

deploy-db:
	@echo "Starting full database deployment workflow..."
	@set -e; \
	# Dump pre-migration schema, backup, and profile data in parallel
	$(MAKE) pre-migration-schema backup-db profile-data-backup || { $(MAKE) rollback-db; exit 1; }; \
	# Run migration and dump post-migration schema
	$(MAKE) migrate-db post-migration-schema || { $(MAKE) rollback-db; exit 1; }; \
	# Verify migration and upload profile data
	$(MAKE) verify-migration profile-data-upload || { $(MAKE) rollback-db; exit 1; }; \
	echo "Database deployment complete."

run-sql-file:
	@echo "Running SQL file: $(file)"
	@set -a; . .env.local; set +a; \
	db_url=$$DATABASE_URL; \
	if [ -z "$$db_url" ]; then echo "DATABASE_URL not set"; exit 1; fi; \
	psql "$$db_url" -f $(file)