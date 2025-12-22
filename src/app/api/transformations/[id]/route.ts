import { NextRequest, NextResponse } from 'next/server';
import { getTransformation } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transformation = await getTransformation(id);

    if (!transformation) {
      return NextResponse.json(
        { error: 'Transformation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformation);
  } catch (error) {
    console.error('Error fetching transformation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformation' },
      { status: 500 }
    );
  }
}




