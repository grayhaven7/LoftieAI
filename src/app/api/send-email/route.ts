import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTransformation } from '@/lib/storage';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const { transformationId, email } = await request.json();

    if (!transformationId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const transformation = await getTransformation(transformationId);
    if (!transformation) {
      return NextResponse.json(
        { error: 'Transformation not found' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resend = getResendClient();

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Loftie AI <onboarding@resend.dev>',
      to: email,
      subject: '✨ Your Room Transformation is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDF8F3;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #9CAF88 0%, #7A9166 100%); border-radius: 50%; margin-bottom: 16px;"></div>
              <h1 style="font-size: 28px; color: #3A3A3A; margin: 0; font-weight: 500;">Your Space, Transformed ✨</h1>
            </div>

            <!-- Content Card -->
            <div style="background: #FEFCFA; border-radius: 24px; padding: 32px; box-shadow: 0 4px 24px rgba(58, 58, 58, 0.06);">
              <p style="color: #8A8A8A; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Great news! Your room transformation is complete. Take a look at what your space could become with a little decluttering magic.
              </p>

              <!-- Before/After Images -->
              <div style="margin-bottom: 24px;">
                <p style="color: #3A3A3A; font-weight: 500; margin-bottom: 8px;">Before:</p>
                <img src="${baseUrl}${transformation.beforeImageUrl}" alt="Before" style="width: 100%; border-radius: 16px; margin-bottom: 16px;">
                
                <p style="color: #3A3A3A; font-weight: 500; margin-bottom: 8px;">After:</p>
                <img src="${baseUrl}${transformation.afterImageUrl}" alt="After" style="width: 100%; border-radius: 16px;">
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${baseUrl}/results/${transformation.id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #9CAF88 0%, #7A9166 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 500; font-size: 16px;">
                  View Your Full Plan →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; color: #8A8A8A; font-size: 14px;">
              <p>Made with 💚 by Loftie AI</p>
              <p style="margin-top: 8px;">Transform your space, transform your life</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

