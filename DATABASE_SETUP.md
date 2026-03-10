# Database Setup Instructions

## Quick Setup Guide

Follow these steps to get your database ready:

### 1. Choose Your Database Option

#### Option A: Use a Free Cloud Database (Easiest)

**Supabase (Recommended):**
1. Go to https://supabase.com/
2. Sign up for a free account
3. Create a new project
4. Wait for the project to be created (takes ~2 minutes)
5. Go to Project Settings > Database
6. Copy the "Connection string" (URI format)
7. Paste it into your `.env` file as `DATABASE_URL`

**Railway:**
1. Go to https://railway.app/
2. Sign up with GitHub
3. Click "New Project" > "Provision PostgreSQL"
4. Click on the PostgreSQL service
5. Go to "Connect" tab
6. Copy the "Postgres Connection URL"
7. Paste it into your `.env` file as `DATABASE_URL`

#### Option B: Local PostgreSQL

If you have PostgreSQL installed locally:
1. Open your PostgreSQL client or terminal
2. Create a new database: `createdb letschat`
3. Update `.env` with your local connection string:
   ```
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/letschat?schema=public"
   ```

### 2. Update Environment Variables

Edit the `.env` file and replace the database URL:

```env
DATABASE_URL="your_connection_string_here"
NEXTAUTH_SECRET="your-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Generate Prisma Client

Run this command:
```bash
npm run db:generate
```

### 4. Push Database Schema

This creates all the tables in your database:
```bash
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

### 6. Test the Application

1. Open http://localhost:3000
2. Click "Sign up" and create an account
3. After signing up, you'll be automatically logged in
4. Create another account (in a different browser or incognito) to test chatting

## Troubleshooting

**Error: "Can't reach database server"**
- Check that your DATABASE_URL is correct
- For cloud databases, check your internet connection
- For local PostgreSQL, ensure the service is running

**Error: "P1001: Can't reach database server"**
- Your connection string might be wrong
- Check if you need to add SSL parameters for cloud databases:
  ```
  DATABASE_URL="postgresql://...?sslmode=require"
  ```

**Error: "relation does not exist"**
- Run `npm run db:push` to create the tables
- Or try `npm run db:migrate` to create a migration

## Useful Commands

- `npm run db:studio` - Open Prisma Studio to view/edit data
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Regenerate Prisma Client
- `npm run db:migrate` - Create and run migrations

## Next Steps

After setup:
1. The app will be available at http://localhost:3000
2. Sign up with an email and password
3. Create multiple users to test the chat
4. Send messages between users
5. Enjoy your chat app!
