import { NextRequest, NextResponse } from 'next/server';
import {
  getSettingsAsync,
  saveSettings,
  resetToDefaults,
  validatePassword,
  DEFAULT_PROMPTS,
  DEFAULT_MODELS,
  DEFAULT_BIO,
  DEFAULT_HEADLINES,
  AVAILABLE_MODELS,
  PROMPT_VARIABLES,
} from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    // Check password from header
    const password = request.headers.get('x-settings-password');
    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getSettingsAsync();
    
    return NextResponse.json({
      settings,
      defaults: {
        prompts: DEFAULT_PROMPTS,
        models: DEFAULT_MODELS,
        bio: DEFAULT_BIO,
        headlines: DEFAULT_HEADLINES,
      },
      availableModels: AVAILABLE_MODELS,
      promptVariables: PROMPT_VARIABLES,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check password from header
    const password = request.headers.get('x-settings-password');
    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, prompts, models, bio, headlines } = body;

    if (action === 'reset') {
      const settings = await resetToDefaults();
      return NextResponse.json({
        success: true,
        settings,
        message: 'Settings reset to defaults',
      });
    }

    // Update settings
    const settings = await saveSettings({ prompts, models, bio, headlines });
    
    return NextResponse.json({
      success: true,
      settings,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to save settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Validate password endpoint
export async function PUT(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { valid: false, error: 'Password required' },
        { status: 400 }
      );
    }

    const isValid = validatePassword(password);
    
    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('Error validating password:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}



