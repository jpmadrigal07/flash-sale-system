# Flash Sale System

A high-concurrency system for running limited-time product sales without overselling inventory.

Flash sales create a short window of extreme demand: many shoppers compete for a small stock in seconds. This project focuses on keeping that purchase path correct under load — reserving stock atomically, rejecting excess demand quickly, and recording successful orders exactly once.

## Goals

- Publish a sale catalog with a defined start and end window
- Reserve inventory atomically so concurrent checkouts cannot oversell
- Create an order only after a successful reservation
- Keep checkout idempotent so retries do not consume extra stock
- Serve hot-item reads from cache while a transactional store remains the source of truth

## Status

This repository is being initialized. Application code, tests, and setup instructions will land in follow-up commits.

## License

MIT
