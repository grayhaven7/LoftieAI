export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // HTML content
  category: BlogCategory;
  tags: string[];
  coverImageUrl?: string;
  author: string;
  authorTitle: string;
  publishedAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  readingTimeMinutes: number;
}

export type BlogCategory =
  | 'decluttering'
  | 'home-staging'
  | 'organization'
  | 'room-guides'
  | 'lifestyle'
  | 'tips';

export const BLOG_CATEGORIES: { value: BlogCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Posts' },
  { value: 'decluttering', label: 'Decluttering' },
  { value: 'home-staging', label: 'Home Staging' },
  { value: 'organization', label: 'Organization' },
  { value: 'room-guides', label: 'Room Guides' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'tips', label: 'Tips & Tricks' },
];
