import { put, list, del } from '@vercel/blob';
import { BlogPost } from './blog-types';

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

export async function getAllPosts(includesDrafts = false): Promise<BlogPost[]> {
  const token = getBlobToken();
  if (!token) return [];

  try {
    const allBlobs: Awaited<ReturnType<typeof list>>['blobs'] = [];
    let cursor: string | undefined;
    do {
      const result = await list({ prefix: 'blog/', limit: 1000, cursor, token });
      allBlobs.push(...result.blobs);
      cursor = result.cursor;
    } while (cursor);

    const posts = await Promise.all(
      allBlobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url, { cache: 'no-store' });
          if (!res.ok) return null;
          return (await res.json()) as BlogPost;
        } catch {
          return null;
        }
      })
    );

    return posts
      .filter((p): p is BlogPost => p !== null && (includesDrafts || p.status === 'published'))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch (error) {
    console.error('[Blog] Error fetching posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string, includeDrafts = false): Promise<BlogPost | null> {
  const posts = await getAllPosts(includeDrafts);
  return posts.find((p) => p.slug === slug) || null;
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const token = getBlobToken();
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: `blog/${id}.json`, limit: 1, token });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as BlogPost;
  } catch (error) {
    console.error(`[Blog] Error fetching post ${id}:`, error);
    return null;
  }
}

export async function savePost(post: BlogPost): Promise<void> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  await put(`blog/${post.id}.json`, JSON.stringify(post, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    token,
    cacheControlMaxAge: 0,
  });
}

export async function deletePost(id: string): Promise<void> {
  const token = getBlobToken();
  if (!token) return;

  try {
    const { blobs } = await list({ prefix: `blog/${id}.json`, token });
    for (const blob of blobs) {
      await del(blob.url, { token });
    }
  } catch (error) {
    console.error(`[Blog] Error deleting post ${id}:`, error);
  }
}

export async function saveBlogImage(base64Data: string, filename: string): Promise<string> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  let base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  base64 = base64.replace(/[\s\r\n]+/g, '');
  while (base64.length % 4 !== 0) base64 += '=';

  const buffer = Buffer.from(base64, 'base64');
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const blob = await put(`blog-images/${filename}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    token,
    cacheControlMaxAge: 31536000,
  });

  return blob.url;
}
