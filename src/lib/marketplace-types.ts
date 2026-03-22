export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number | null; // null = free
  category: MarketplaceCategory;
  location: string; // city or zip
  imageUrl: string;
  status: 'active' | 'sold' | 'removed';
  sellerId: string;
  sellerFirstName: string;
  sellerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketplaceCategory =
  | 'furniture'
  | 'clothes'
  | 'books'
  | 'electronics'
  | 'kitchen'
  | 'decor'
  | 'other';

export const CATEGORIES: { value: MarketplaceCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '🏠' },
  { value: 'furniture', label: 'Furniture', emoji: '🛋️' },
  { value: 'clothes', label: 'Clothes', emoji: '👕' },
  { value: 'books', label: 'Books', emoji: '📚' },
  { value: 'electronics', label: 'Electronics', emoji: '💻' },
  { value: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { value: 'decor', label: 'Decor', emoji: '🖼️' },
  { value: 'other', label: 'Other', emoji: '📦' },
];
