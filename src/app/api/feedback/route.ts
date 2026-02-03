import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Feedback } from '@/lib/types';
import { getTransformation, saveTransformation } from '@/lib/storage';

const LOCAL_FEEDBACK_PATH = path.join(process.cwd(), 'data', 'feedback.json');

function useLocalStorage(): boolean {
  const isVercel = process.env.VERCEL === '1';
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  return !hasBlobToken && !isVercel;
}

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

function ensureLocalDir(): void {
  const dataDir = path.dirname(LOCAL_FEEDBACK_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// POST - Save new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transformationId, helpful, comment } = body;

    if (!transformationId) {
      return NextResponse.json(
        { error: 'transformationId is required' },
        { status: 400 }
      );
    }

    const feedback: Feedback = {
      id: uuidv4(),
      transformationId,
      helpful: helpful ?? null,
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };

    if (useLocalStorage()) {
      ensureLocalDir();
      let feedbackList: Feedback[] = [];
      if (fs.existsSync(LOCAL_FEEDBACK_PATH)) {
        const data = fs.readFileSync(LOCAL_FEEDBACK_PATH, 'utf-8');
        feedbackList = JSON.parse(data);
      }
      feedbackList.push(feedback);
      fs.writeFileSync(LOCAL_FEEDBACK_PATH, JSON.stringify(feedbackList, null, 2));
    } else {
      const token = getBlobToken();
      if (!token) {
        throw new Error('BLOB_READ_WRITE_TOKEN not configured');
      }

      // Store each feedback as its own file
      await put(`feedback/${feedback.id}.json`, JSON.stringify(feedback, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        token,
      });
    }

    console.log(`Saved feedback ${feedback.id} for transformation ${transformationId}`);

    // Also update the transformation record with feedback data
    try {
      const transformation = await getTransformation(transformationId);
      if (transformation) {
        transformation.feedbackHelpful = helpful ?? null;
        transformation.feedbackComment = comment || '';
        transformation.feedbackSubmittedAt = feedback.createdAt;
        await saveTransformation(transformation);
        console.log(`Updated transformation ${transformationId} with feedback`);
      }
    } catch (updateError) {
      console.error('Failed to update transformation with feedback:', updateError);
      // Don't fail the request - feedback was still saved separately
    }

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}

// GET - List all feedback (for admin review)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (useLocalStorage()) {
      ensureLocalDir();
      if (fs.existsSync(LOCAL_FEEDBACK_PATH)) {
        const data = fs.readFileSync(LOCAL_FEEDBACK_PATH, 'utf-8');
        const feedbackList = JSON.parse(data) as Feedback[];
        return NextResponse.json({
          feedback: feedbackList.slice(0, limit),
          total: feedbackList.length,
        });
      }
      return NextResponse.json({ feedback: [], total: 0 });
    }

    const token = getBlobToken();
    if (!token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    const { blobs } = await list({
      prefix: 'feedback/',
      limit,
      token,
    });

    const feedbackList = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (response.ok) {
            return await response.json() as Feedback;
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const validFeedback = feedbackList.filter((f): f is Feedback => f !== null);

    return NextResponse.json({
      feedback: validFeedback,
      total: validFeedback.length,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
