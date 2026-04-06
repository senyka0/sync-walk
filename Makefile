DOCKER_COMPOSE ?= docker compose
DEV_FILE = -f docker-compose.dev.yml
PROD_FILE = -f docker-compose.yml

.PHONY: dev dev-down dev-up prod prod-down prod-up down migrate seed logs backup deploy

dev-down:
	$(DOCKER_COMPOSE) $(DEV_FILE) down

dev-up:
	$(DOCKER_COMPOSE) $(DEV_FILE) up --build

dev: dev-down dev-up

prod-down:
	$(DOCKER_COMPOSE) $(PROD_FILE) down

prod-up:
	$(DOCKER_COMPOSE) $(PROD_FILE) up -d --build

prod: prod-down prod-up

down: dev-down

migrate:
	$(DOCKER_COMPOSE) $(DEV_FILE) exec api alembic upgrade head

migration:
	$(DOCKER_COMPOSE) $(DEV_FILE) exec api alembic revision --autogenerate -m '$(msg)'

seed:
	$(DOCKER_COMPOSE) $(DEV_FILE) exec api python -m app.utils.seed

logs:
	$(DOCKER_COMPOSE) $(DEV_FILE) logs -f api nextjs

logs-api:
	$(DOCKER_COMPOSE) $(DEV_FILE) logs -f api

logs-frontend:
	$(DOCKER_COMPOSE) $(DEV_FILE) logs -f nextjs

backup:
	bash scripts/backup-db.sh

deploy:
	bash scripts/deploy.sh

shell-api:
	$(DOCKER_COMPOSE) $(DEV_FILE) exec api bash

shell-db:
	$(DOCKER_COMPOSE) $(DEV_FILE) exec postgres psql -U syncwalk -d syncwalk

prod-migrate:
	$(DOCKER_COMPOSE) $(PROD_FILE) exec api alembic upgrade head

prod-logs:
	$(DOCKER_COMPOSE) $(PROD_FILE) logs -f api nextjs nginx
