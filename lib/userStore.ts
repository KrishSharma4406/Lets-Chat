// In-memory user storage (shared between register endpoint and auth)
// In production, replace with a real database (MongoDB, PostgreSQL, etc.)

export interface User {
  id: string
  email: string
  name: string
  image: string
  passwordHash: string
  createdAt?: Date
}

export const allUsers: User[] = [
  {
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    passwordHash: '$2a$10$V1EiGh9r2Z7YqVVPYkjqj.OqE9EYl9QHD.xKfVvTUKV3TMlXXZBu2', // "password"
    createdAt: new Date(),
  },
  {
    id: '2',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    passwordHash: '$2a$10$V1EiGh9r2Z7YqVVPYkjqj.OqE9EYl9QHD.xKfVvTUKV3TMlXXZBu2', // "password"
    createdAt: new Date(),
  },
]

export function findUserByEmail(email: string): User | undefined {
  return allUsers.find(u => u.email === email)
}

export function addUser(user: User): User {
  allUsers.push(user)
  return user
}

export function getUserById(id: string): User | undefined {
  return allUsers.find(u => u.id === id)
}
