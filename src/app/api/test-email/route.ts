import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    // Check if environment variables are set
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY is not configured',
        env: {
          hasApiKey: false,
          hasEmailFrom: !!emailFrom,
        }
      }, { status: 500 });
    }

    // Check API key format
    if (!apiKey.startsWith('re_')) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY has invalid format (should start with re_)',
        env: {
          hasApiKey: true,
          apiKeyFormat: 'invalid',
          hasEmailFrom: !!emailFrom,
        }
      }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    // Try to send a test email to yourself
    const testResult = await resend.emails.send({
      from: emailFrom || 'Loftie AI <onboarding@resend.dev>',
      to: 'delivered@resend.dev', // Resend's test email
      subject: 'Test Email from Loftie AI',
      html: '<p>This is a test email to verify Resend integration.</p>',
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully!',
      testResult,
      env: {
        hasApiKey: true,
        apiKeyFormat: 'valid',
        hasEmailFrom: !!emailFrom,
        emailFrom: emailFrom || 'onboarding@resend.dev',
      }
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.response?.data || error,
      env: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        hasEmailFrom: !!process.env.EMAIL_FROM,
      }
    }, { status: 500 });
  }
}
