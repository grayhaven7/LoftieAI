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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const resend = getResendClient();

    // Format the decluttering plan for HTML
    const formattedPlan = transformation.declutteringPlan
      ? transformation.declutteringPlan
          .split('\n')
          .filter(line => line.trim())
          .map(line => `<p style="margin-bottom: 8px;">${line}</p>`)
          .join('')
      : '';

    const result = await resend.emails.send({
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
              <div style="margin-bottom: 32px;">
                <div style="margin-bottom: 20px;">
                  <p style="color: #3A3A3A; font-weight: 600; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Before:</p>
                  <img src="${transformation.beforeImageUrl}" alt="Before" style="width: 100%; border-radius: 16px; border: 1px solid #EEEEEE;">
                </div>
                
                <div>
                  <p style="color: #3A3A3A; font-weight: 600; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">After:</p>
                  <img src="${transformation.afterImageUrl}" alt="After" style="width: 100%; border-radius: 16px; border: 1px solid #EEEEEE;">
                </div>
              </div>

              <!-- Decluttering Plan -->
              ${formattedPlan ? `
              <div style="background-color: #F9F9F9; border-radius: 16px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #9CAF88;">
                <h2 style="font-size: 18px; color: #3A3A3A; margin-top: 0; margin-bottom: 16px; font-weight: 600;">Your Decluttering Plan:</h2>
                <div style="color: #555555; font-size: 15px; line-height: 1.6;">
                  ${formattedPlan}
                </div>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="${baseUrl}/results/${transformation.id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #9CAF88 0%, #7A9166 100%); color: white !important; text-decoration: none; padding: 18px 36px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(156, 175, 136, 0.3);">
                  View Full Transformation →
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

    console.log('Email sent successfully:', result);
    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error: any) {
    console.error('Email error:', error);
    const errorMessage = error?.message || 'Failed to send email';
    const errorDetails = error?.response?.data || error;
    console.error('Error details:', errorDetails);

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

