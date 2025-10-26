# Xerosite Backend

A NestJS backend application with MySQL database integration.

## Description

This is a basic NestJS framework with MySQL database support. The application is ready for additional features to be added.

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your MySQL database credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=xerosite
```

3. Create the database in MySQL:
```sql
CREATE DATABASE xerosite;
```

## Running the app

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## API Documentation

The application runs on `http://localhost:3000` by default.

### Health Check
- `GET /health` - Check if the application is running

## Project Structure

```
src/
├── config/          # Configuration files
│   └── database.config.ts
├── common/          # Common utilities, guards, interceptors
│   ├── dto/         # Data Transfer Objects
│   └── entities/    # Base entities
├── modules/         # Feature modules
│   └── health/      # Health check module
└── main.ts          # Application entry point
```

## License

MIT
