# Quick Start Guide

## Setup Instructions

1. **Install Dependencies** (Already done)
   ```bash
   npm install
   ```

2. **Configure Database**
   - Edit the `.env` file with your MySQL credentials:
     ```
     DB_HOST=localhost
     DB_PORT=3306
     DB_USERNAME=root
     DB_PASSWORD=your_password
     DB_DATABASE=xerosite
     ```

3. **Create Database**
   - Open MySQL and create the database:
     ```sql
     CREATE DATABASE xerosite;
     ```

4. **Run the Application**
   ```bash
   # Development mode with auto-reload
   npm run start:dev

   # Or production mode
   npm run start:prod
   ```

5. **Test the Application**
   - Open your browser or use curl to test:
     ```
     http://localhost:3000/health
     ```
   - You should see a JSON response indicating the application is running

## Project Structure

```
src/
├── common/                  # Shared resources
│   ├── dto/                 # Data Transfer Objects
│   │   └── response.dto.ts  # Standard response format
│   └── entities/            # Base entities
│       └── base.entity.ts   # Base entity with timestamps
├── config/                  # Configuration files
│   └── database.config.ts   # Database configuration
├── modules/                 # Feature modules
│   └── health/              # Health check module
│       ├── health.controller.ts
│       ├── health.module.ts
│       └── health.service.ts
├── app.module.ts            # Root application module
└── main.ts                  # Application entry point
```

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with watch
- `npm run start:prod` - Start in production mode
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint and fix code

## Next Steps

Now that the basic framework is set up, you can:

1. **Create new modules** - Add business logic modules (users, products, etc.)
2. **Add authentication** - Implement JWT or session-based auth
3. **Create entities** - Define your database models
4. **Add middleware** - Logging, error handling, etc.
5. **API documentation** - Add Swagger/OpenAPI documentation

## Creating a New Module

To add a new module (e.g., "users"):

1. Create the module structure:
   ```
   src/modules/users/
   ├── users.module.ts
   ├── users.controller.ts
   ├── users.service.ts
   └── entities/
       └── user.entity.ts
   ```

2. Import the new module in `app.module.ts`

3. The base entity provides common fields (id, createdAt, updatedAt, deletedAt)

## Important Notes

- The database is configured to auto-sync in development mode (synchronize: true)
- Remember to disable auto-sync in production
- All entities should extend the BaseEntity class
- Use ResponseDto for consistent API responses
