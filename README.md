# Let's Chat - Modern Chat Application

A real-time chat application built with Next.js, PostgreSQL, and Prisma.

## Features

✨ **Core Features:**
- User authentication (sign up & login)
- Real-time messaging
- One-on-one conversations
- Group chat support
- Message history
- User list and search
- Responsive design (mobile & desktop)
- Beautiful modern UI

🔐 **Security:**
- Password hashing with bcrypt
- NextAuth.js authentication
- Protected API routes
- Secure session management

📱 **User Experience:**
- Clean, intuitive interface
- Real-time message updates
- Auto-scrolling chat
- Conversation list with last message preview
- Timestamp for messages
- Professional gradient avatars

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **State Management:** Zustand
- **Date Formatting:** date-fns

## Database Schema

The application uses a relational database with the following models:

- **User:** User accounts with authentication
- **Conversation:** Chat conversations (individual or group)
- **ConversationParticipant:** Many-to-many relationship between users and conversations
- **Message:** Chat messages with sender and conversation references
- **SeenMessage:** Track which users have seen which messages

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ and npm
- PostgreSQL database

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up PostgreSQL Database

You need a PostgreSQL database. You can either:

**Option A: Local PostgreSQL**
- Install PostgreSQL on your machine
- Create a new database: `createdb letschat`

**Option B: Cloud Database (Recommended for quick start)**
- Use a free service like [Supabase](https://supabase.com/), [Railway](https://railway.app/), or [Neon](https://neon.tech/)
- Create a new PostgreSQL database
- Get your connection string

### 3. Configure Environment Variables

Update the `.env` file with your database connection string:

```env
# Database - Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/letschat?schema=public"

# NextAuth - Change the secret in production!
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**Important:** 
- Replace the DATABASE_URL with your actual PostgreSQL connection string
- Generate a secure NEXTAUTH_SECRET for production (you can use: `openssl rand -base64 32`)

### 4. Initialize the Database

Generate Prisma Client and push the schema to your database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

Alternatively, you can create a migration:

```bash
npm run db:migrate
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign Up:** Create a new account with your name, email, and password
2. **Login:** Sign in with your credentials
3. **Start Chatting:** 
   - Click "New Chat" to see available users
   - Select a user to start a conversation
   - Type your message and hit send!
4. **Real-time Updates:** Messages update every 2 seconds automatically

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
app/
├── app/
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── register/      # User registration
│   │   ├── conversations/ # Chat conversations
│   │   └── users/         # User list
│   ├── auth/              # Authentication pages
│   ├── chat/              # Chat interface
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── chat/              # Chat components
│   │   ├── ConversationList.tsx
│   │   ├── ChatWindow.tsx
│   │   └── UserList.tsx
│   ├── AuthForm.tsx       # Login/signup form
│   └── AuthProvider.tsx   # Session provider
├── lib/
│   ├── prisma.ts          # Prisma client
│   └── auth.ts            # NextAuth configuration
├── prisma/
│   └── schema.prisma      # Database schema
└── types/
    └── next-auth.d.ts     # TypeScript definitions
```

## Features in Detail

### Authentication
- Secure password hashing with bcrypt
- Session-based authentication with NextAuth.js
- Protected routes and API endpoints

### Messaging
- Send and receive text messages
- Real-time message polling (updates every 2 seconds)
- Message history with timestamps
- Auto-scroll to latest messages

### Conversations
- Create one-on-one chats
- Support for group conversations (extensible)
- Conversation list with last message preview
- Sort by most recent activity

### User Interface
- Responsive design for mobile and desktop
- Modern gradient color scheme
- Smooth animations and transitions
- Clean, professional appearance
- Avatar initials for user identification

## Future Enhancements

Possible improvements:
- WebSocket support for real-time updates (Socket.IO already included)
- Image/file sharing
- Message reactions and emojis
- Typing indicators
- Online/offline status
- Message search
- Push notifications
- Voice/video calls
- Message editing and deletion
- Read receipts

## Troubleshooting

**Database Connection Issues:**
- Verify your DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall/network settings

**Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Next.js cache: `rm -rf .next`
- Regenerate Prisma client: `npm run db:generate`

**Authentication Issues:**
- Verify NEXTAUTH_SECRET is set
- Clear browser cookies and try again
- Check that the user exists in the database

## Database Management

View and manage your database with Prisma Studio:

```bash
npm run db:studio
```

This opens a GUI at http://localhost:5555 where you can view and edit data.

## Contributing

Feel free to contribute to this project by:
1. Forking the repository
2. Creating a feature branch
3. Making your changes
4. Submitting a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review the Prisma and Next.js documentation
3. Open an issue on GitHub

---

**Happy Chatting! 💬**
