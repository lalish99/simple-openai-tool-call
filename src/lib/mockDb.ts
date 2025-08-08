export type User = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
};

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  tags?: string[];
};

type DbSnapshot = {
  users: User[];
  products: Product[];
};

// Initial seeds
const initialUsers: User[] = [
  { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', status: 'active' },
  { id: 'u2', name: 'Alan Turing', email: 'alan@example.com', status: 'inactive' },
];

const initialProducts: Product[] = [
  { id: 'p1', name: 'iPhone 15', price: 999, stock: 5, tags: ['phone'] },
  { id: 'p2', name: 'Pixel 8', price: 799, stock: 7, tags: ['phone'] },
];

let users: User[] = JSON.parse(JSON.stringify(initialUsers));
let products: Product[] = JSON.parse(JSON.stringify(initialProducts));

export function snapshot(): DbSnapshot {
  return {
    users: JSON.parse(JSON.stringify(users)),
    products: JSON.parse(JSON.stringify(products)),
  };
}

export function resetDb(): DbSnapshot {
  users = JSON.parse(JSON.stringify(initialUsers));
  products = JSON.parse(JSON.stringify(initialProducts));
  return snapshot();
}

export function searchUser(userId: string): User | null {
  return users.find(u => u.id === userId) || null;
}

export function searchUsersByName(nameQuery: string): User[] {
  const q = nameQuery.trim().toLowerCase();
  if (!q) return [];
  return users.filter(u => u.name.toLowerCase().includes(q));
}

export function updateUserRecord(
  userId: string,
  field: keyof User,
  value: string
): User | null {
  const target = users.find(u => u.id === userId);
  if (!target) return null;
  if (!(field in target)) return null;
  // naive validation for email
  if (field === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    throw new Error('Invalid email format');
  }
  (target as any)[field] = value;
  return target;
}

export function searchProduct(productName: string): Product[] {
  const name = productName.toLowerCase();
  return products.filter(p => p.name.toLowerCase().includes(name));
}

export function listUsers(): User[] {
  return users;
}

export function listProducts(): Product[] {
  return products;
}


