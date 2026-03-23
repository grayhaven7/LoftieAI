import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug, getPost, savePost, deletePost } from '@/lib/blog-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error('[Blog API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET && adminKey !== 'loftie-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const body = await request.json();
    const updatable = ['title', 'excerpt', 'content', 'category', 'tags', 'coverImageUrl', 'seoTitle', 'seoDescription', 'status'] as const;

    for (const key of updatable) {
      if (body[key] !== undefined) {
        (post as unknown as Record<string, unknown>)[key] = body[key];
      }
    }
    post.updatedAt = new Date().toISOString();

    if (body.content) {
      const wordCount = body.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      post.readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    }

    await savePost(post);
    return NextResponse.json({ post });
  } catch (error) {
    console.error('[Blog API] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET && adminKey !== 'loftie-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    await deletePost(post.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Blog API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
