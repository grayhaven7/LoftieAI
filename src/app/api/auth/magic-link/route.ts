import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { getUserByEmail, saveUser, saveMagicLinkToken } from '@/lib/storage';
import { MagicLinkToken } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email } = await request.json();

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await getUserByEmail(normalizedEmail);
    const now = new Date().toISOString();

    if (!user) {
      user = {
        id: uuidv4(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        createdAt: now,
        lastLoginAt: now,
      };
      await saveUser(user);
    } else {
      // Update name if provided (user might update it)
      user.firstName = firstName.trim();
      user.lastName = lastName.trim();
      await saveUser(user);
    }

    // Create magic link token (15 min expiry)
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const tokenData: MagicLinkToken = {
      token: tokenId,
      email: normalizedEmail,
      createdAt: now,
      expiresAt,
      used: false,
    };
    await saveMagicLinkToken(tokenData);

    // Build magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const magicLink = `${baseUrl}/api/auth/verify?token=${tokenId}`;

    // Send magic link email via Resend
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = process.env.EMAIL_FROM || 'Loftie AI <onboarding@resend.dev>';

    const result = await resend.emails.send({
      from: fromAddress,
      to: normalizedEmail,
      subject: 'Your Loftie Login Link',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDF8F3;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #9CAF88 0%, #7A9166 100%); border-radius: 50%; margin-bottom: 16px;"></div>
              <h1 style="font-size: 24px; color: #3A3A3A; margin: 0; font-weight: 500;">Welcome to Loftie</h1>
            </div>

            <div style="background: #FEFCFA; border-radius: 24px; padding: 32px; box-shadow: 0 4px 24px rgba(58, 58, 58, 0.06);">
              <p style="color: #8A8A8A; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hi ${user.firstName}, click the button below to sign in to Loftie. This link expires in 15 minutes.
              </p>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${magicLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #9CAF88 0%, #7A9166 100%); color: white !important; text-decoration: none; padding: 18px 36px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(156, 175, 136, 0.3);">
                  Sign In to Loftie
                </a>
              </div>

              <p style="color: #B0B0B0; font-size: 13px; line-height: 1.5; text-align: center;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px; color: #8A8A8A; font-size: 14px;">
              <p>Made with love by Loftie AI</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (result.error) {
      console.error('Magic link email error:', result.error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
