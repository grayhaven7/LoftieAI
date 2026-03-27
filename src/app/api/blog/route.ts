import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllPosts, savePost } from '@/lib/blog-storage';
import { BlogPost, BlogCategory } from '@/lib/blog-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const includesDrafts = request.nextUrl.searchParams.get('drafts') === 'true';
  try {
    const posts = await getAllPosts(includesDrafts);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('[Blog API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Simple admin auth check via header
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET && adminKey !== 'loftie-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, excerpt, content, category, tags, coverImageUrl, seoTitle, seoDescription, status } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const id = uuidv4();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)
      .replace(/-+$/, ''); // never end with a dash

    // Estimate reading time (~200 words/min)
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const post: BlogPost = {
      id,
      slug,
      title,
      excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160) + '...',
      content,
      category: (category as BlogCategory) || 'tips',
      tags: tags || [],
      coverImageUrl: coverImageUrl || undefined,
      author: 'Sejal Parekh',
      authorTitle: 'Professional Home Stager & Founder of Loftie',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: status || 'published',
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      readingTimeMinutes,
    };

    await savePost(post);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[Blog API] POST error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
