# Quick Start Guide for Let's Chat

## 🚀 Getting Started (5 minutes)

### Step 1: Update Database URL (REQUIRED)

Open the `.env` file and replace the DATABASE_URL with your PostgreSQL connection string.

**Quick Option - Free Cloud Database:**
- Go to [Supabase](https://supabase.com/) or [Railway](https://railway.app/)
- Create a free account and new PostgreSQL database
- Copy the connection string
- Paste it in `.env` file

Example:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[HOST]/postgres"
```

### Step 2: Set Up Database

Run these commands in order:

```bash
npm run db:generate
npm run db:push
```

### Step 3: Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 4: Create Account & Chat

1. Click "Sign up" and create an account
2. Open another browser (or incognito window)
3. Create a second account
4. Go back to first account, click "New Chat"
5. Select the user you just created
6. Start chatting!

## 📝 Notes

- Messages update automatically every 2 seconds
- You can create multiple accounts to test
- All data is stored in your PostgreSQL database
- Use `npm run db:studio` to view database contents

## ❓ Having Issues?

Check [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed troubleshooting.

**Common Fix:**
If you get database errors, make sure:
1. Your DATABASE_URL is correct in `.env`
2. You ran `npm run db:push` to create tables
3. Your PostgreSQL database is accessible

---

**Need help?** Read the full [README.md](./README.md)
