# Loftie AI 🏠✨

AI-powered decluttering and home styling MVP. Upload a photo of your cluttered room and get a photorealistic "after" image with clutter removed and light styling added, plus step-by-step guidance to achieve that look.

## Features

- **📸 Upload Page** - Drag & drop or click to upload a room photo
- **🤖 AI Image Generation** - Transforms cluttered rooms into styled, decluttered spaces using OpenAI DALL-E
- **📋 Decluttering Plan** - GPT-4 generates personalized step-by-step guidance in a warm, friendly tone
- **🎧 Voice Option** - Text-to-speech with female voice (OpenAI TTS or ElevenLabs)
- **👤 Admin View** - Simple dashboard to see all before/after uploads
- **📧 Email Results** - Send the before/after and plan to user's email via Resend

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS** for styling
- **OpenAI API** for image generation (DALL-E 3) and GPT-4o for analysis
- **Framer Motion** for animations
- **Resend** for transactional emails
- **ElevenLabs** (optional) for premium voice TTS

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo>
cd loftie-ai
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Required: Resend API Key (for emails)
RESEND_API_KEY=re_your-resend-api-key

# Email from address (must be verified in Resend, or use default)
EMAIL_FROM=hello@loftie.ai

# Optional: ElevenLabs API Key (for premium voice)
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Base URL (update for production)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Pages

- `/` - Main upload page
- `/results/[id]` - Results page with before/after and decluttering plan
- `/admin` - Admin dashboard to view all transformations

## API Routes

- `POST /api/transform` - Transforms an uploaded image
- `GET /api/transformations` - Lists all transformations
- `GET /api/transformations/[id]` - Gets a single transformation
- `POST /api/tts` - Converts text to speech
- `POST /api/send-email` - Sends results via email

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Important Notes for Production

1. **Storage**: The current implementation uses file-based JSON storage. For production, consider:
   - Vercel Blob for image storage
   - PostgreSQL (Vercel Postgres or Supabase) for data
   - AWS S3 for scalable image storage

2. **Email Domain**: Set up a custom sending domain in Resend for professional emails

3. **Rate Limiting**: Consider adding rate limiting for the transform endpoint

## Cost Estimation

Per transformation:
- **DALL-E 3 HD**: ~$0.08 per image
- **GPT-4o Vision**: ~$0.01 per analysis
- **OpenAI TTS**: ~$0.015 per 1K characters
- **Resend Email**: Free up to 3K/month

**Total**: ~$0.10-0.15 per transformation

## License

MIT
