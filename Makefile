.PHONY: clean install spellcheck spellcheck-pdf link-check syntax-check unit-test check start stop db-export backup-db migrate-db profile-data-db deploy-db profile-data-backup profile-data-upload pre-migration-schema migrate-db post-migration-schema verify-migration rollback-db verify-schema run-sql-file print-table

install:
	npm install
	cd api && npm install

spellcheck:spellcheck-pdf
	npx cspell "**/*.{html,css,js,ts}" "assets/*.txt" "api/**/*.js" --verbose

spellcheck-pdf:
	bash ./pdf2txt.sh

link-check:
	npx linkinator ./index.html ./admin.html ./auth.html ./experience-ai.html ./fit-ai.html

unit-test:
	@echo "Running top-level tests"
	npm test
	@echo "Running API tests"
	cd api && npm test -- --runInBand

check:
	@echo "==> [1/3] Running spellcheck"
	@$(MAKE) spellcheck
	@echo "==> [2/3] Running API unit tests"
	@$(MAKE) unit-test
	@echo "==> [3/3] Running link check"
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

profile-data-backup:
	@echo "Creating profile data backup..."
	@DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	pg_dump --no-owner --no-acl --format=plain --file=db/export.sql $$DB_URL

profile-data-upload:
	@echo "Uploading profile data from db/export.sql..."
	@if [ ! -f db/export.sql ]; then \
		echo "ERROR: db/export.sql not found. Skipping upload."; \
		exit 0; \
	fi; \
	DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	psql $$DB_URL < db/export.sql 2>/dev/null

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

 
pre-migration-schema:
	@echo "Dumping pre-migration database schema to db/pre-migration-schema.sql..."
	@DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	pg_dump --schema-only --no-owner --no-acl --file=db/pre-migration-schema.sql $$DB_URL

migrate-db:
	@echo "Running migrations (verbose)..."
	@DATABASE_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) npx node-pg-migrate up --envPath=.env.local -m migrations --verbose

post-migration-schema:
	@echo "Dumping post-migration database schema to db/post-migration-schema.sql..."
	@DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	pg_dump --schema-only --no-owner --no-acl --file=db/post-migration-schema.sql $$DB_URL

verify-migration:
	@echo "Comparing pre- and post-migration schemas (ignoring pg_dump metadata)..."
	@grep -vE '^--|^\\restrict|^\\unrestrict|^SET |^SELECT |^COMMENT |^ALTER |^\\connect' db/pre-migration-schema.sql > db/pre-migration-schema.struct.sql
	@grep -vE '^--|^\\restrict|^\\unrestrict|^SET |^SELECT |^COMMENT |^ALTER |^\\connect' db/post-migration-schema.sql > db/post-migration-schema.struct.sql
	@diff -u db/pre-migration-schema.struct.sql db/post-migration-schema.struct.sql || (echo "\nSCHEMA MISMATCH: Rolling back from latest backup..." && $(MAKE) rollback-db && exit 1)
	@echo "\nSCHEMA MATCH: Migration successful."

rollback-db:
	@echo "Ensuring recent backup before rollback..."
	$(MAKE) backup-db
	@echo "Dropping all tables before restore..."
	@DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	TABLES=$$(psql $$DB_URL -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public';") ; \
	for T in $$TABLES; do psql $$DB_URL -c "DROP TABLE IF EXISTS \"$$T\" CASCADE;"; done
	@echo "Restoring database from latest backup..."
	@LATEST_BACKUP=$$(ls -t db/backup-*.sql | head -n 1) ; \
	DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	psql $$DB_URL < $$LATEST_BACKUP
	@echo "Validating restored data..."
	@TABLES=$$(psql $$DB_URL -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public';") ; \
	for T in $$TABLES; do echo "Table $$T: $$(psql $$DB_URL -Atc 'SELECT COUNT(*) FROM "'$$T'";') rows"; done

verify-schema:
	@echo "Dumping current database schema to db/live-schema.sql..."
	@DB_URL=$$(grep DATABASE_URL .env.local | cut -d '=' -f2- | tr -d '\n' | xargs) ; \
	pg_dump --schema-only --no-owner --no-acl --file=db/live-schema.sql $$DB_URL
	@echo "Diffing db/live-schema.sql against db/schema.sql..."
	@diff -u db/schema.sql db/live-schema.sql || (echo "\nSCHEMA MISMATCH: Migration did not produce expected schema." && exit 1)
	@echo "\nSCHEMA MATCH: Migration successful."

run-sql-file:
	@echo "Running SQL file: $(file)"
	@set -a; . .env.local; set +a; \
	db_url=$$DATABASE_URL; \
	if [ -z "$$db_url" ]; then echo "DATABASE_URL not set"; exit 1; fi; \
	psql "$$db_url" -f $(file)

print-table:
	@table=$(TABLE); \
	if [ -z "$$table" ]; then \
		echo "Usage: make print-table TABLE=<table_name>"; exit 1; \
	fi; \
	if [ -f .env.local ]; then \
		set -a; . .env.local; set +a; \
	fi; \
	psql "$${DATABASE_URL}" -c "SELECT * FROM $$table LIMIT 50;"

# Usage examples:
#  Run a SQL file using the DATABASE_URL from .env.local:
#    make run-sql-file file=./migrations/skills-update.sql
#
#  Run with an explicit `DATABASE_URL` (overrides .env.local):
#    DATABASE_URL="postgres://user:pass@host:5432/db" make run-sql-file file=./migrations/skills-update.sql
#
# Notes:
#  - The target loads `DATABASE_URL` from .env.local if present; you can override it
#    by exporting `DATABASE_URL` or prefixing the make command as shown above.
#  - The `file` variable is required and is passed to `psql -f $(file)`.
#  - Preview the SQL before running:
#      head -n 50 ./migrations/skills-update.sql
#  - To ensure atomic updates, wrap statements in your SQL file with
#    `BEGIN;` and `COMMIT;` (or run inside a transaction in psql).