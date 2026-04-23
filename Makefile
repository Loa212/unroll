.PHONY: help db-up db-down db-reset

# Display available make commands
help:
	@echo "Available commands:"
	@echo "  make help     - Show this help message"
	@echo "  make db-up    - Start the PostgreSQL service"
	@echo "  make db-down  - Stop the PostgreSQL container"
	@echo "  make db-reset - Remove all containers and volumes"

# Start the PostgreSQL service defined in docker-compose.yml
db-up:
	docker compose up -d postgres

# Stop the PostgreSQL container but keep the volume
db-down:
	docker compose stop postgres

# Remove all Compose-managed containers & volumes (database included)
db-reset:
	docker compose down -v
