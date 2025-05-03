# Eventia - IPL Ticketing Platform

This is the monorepo for the Eventia project, an event ticketing platform with a focus on IPL matches.

## Project Structure

This project uses a monorepo approach where the root directory manages both the frontend and backend code.

-   **Frontend:** Located in the `src/` directory. It's built with Next.js using the App Router and TypeScript.
-   **Backend:** Located in the `server/` directory. It's built with Express.js and TypeScript.
-   **Database:** Uses Prisma as the ORM with a database provider (e.g., PostgreSQL, MySQL, MongoDB - check `prisma/schema.prisma`).
-   **Shared:** Code shared between frontend and backend can potentially reside in `src/lib/` or a dedicated shared folder if needed later.

Dependencies for both frontend and backend are managed in the single `package.json` file in the root directory.

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm, yarn, or pnpm
-   A database instance compatible with your Prisma setup.
-   Git

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd eventia # Or your project directory name
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```

3.  **Set up environment variables:**
    -   Copy `.env.development.example` (if it exists) or create `.env.development` and `.env.production` files.
    -   Populate these files with necessary variables like database connection strings, JWT secrets, API keys, etc. Refer to `server/index.ts` and other relevant files for required variables.
    Example `.env.development`:
    ```env
    # Database (Example for PostgreSQL)
    DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

    # JWT
    ACCESS_TOKEN_SECRET="your_super_secret_access_token_key_dev"
    REFRESH_TOKEN_SECRET="your_super_secret_refresh_token_key_dev"
    ACCESS_TOKEN_EXPIRATION="15m"
    REFRESH_TOKEN_EXPIRATION="7d"

    # Backend Port
    PORT=3001

    # Frontend (Next.js) Port (handled by `next dev -p`)

    # Add other necessary variables (e.g., GenAI API Key)
    # GOOGLE_GENAI_API_KEY=...
    ```

4.  **Set up the database:**
    -   Ensure your database server is running.
    -   Run Prisma migrations:
        ```bash
        npx prisma migrate dev
        ```
    -   (Optional) Seed the database if seed scripts are available:
        ```bash
        # npx prisma db seed (if configured)
        ```

### Running the Development Servers

You need to run both the frontend (Next.js) and backend (Express) servers concurrently.

1.  **Run the Backend Server:**
    ```bash
    npm run dev:server
    ```
    This typically runs on `http://localhost:3001` (or the port specified in `.env`).

2.  **Run the Frontend Server:**
    Open a *new terminal window* and run:
    ```bash
    npm run dev
    ```
    This typically runs on `http://localhost:9002` (as configured in `package.json`).

3.  **Access the application:**
    Open your browser to `http://localhost:9002`.

## Available Scripts

-   `npm run dev`: Starts the Next.js frontend development server (with Turbopack).
-   `npm run dev:server`: Starts the Express backend development server using `ts-node-dev` for auto-restarts.
-   `npm run build`: Builds both the frontend and backend for production.
-   `npm run start`: Starts the Next.js production server (requires `npm run build` first).
-   `npm run start:server`: Starts the compiled Express backend production server (requires `npm run build` first).
-   `npm run lint`: Runs ESLint checks.
-   `npm run format`: Formats code using Prettier.
-   `npm run typecheck`: Runs TypeScript checks for the frontend.
-   `npm run prisma:generate`: Generates the Prisma client.
-   `npm run prisma:migrate`: Runs database migrations.
-   `npm run prisma:studio`: Opens Prisma Studio for database browsing.

## Code Quality

-   **TypeScript:** Used throughout the project for type safety.
-   **ESLint:** Configured for code linting (`.eslintrc.json`). Run with `npm run lint`.
-   **Prettier:** Configured for code formatting (`.prettierrc.json`). Run with `npm run format`.

## Next Steps

Refer to the `/memory-bank/implementation-plan.md` for the step-by-step development plan.
