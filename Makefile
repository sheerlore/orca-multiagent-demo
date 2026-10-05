.PHONY: all check test lint format format-check build dev clean

all: check

check:
	npm run check

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

build:
	npm run build

dev:
	npm run dev

clean:
	rm -rf dist coverage
