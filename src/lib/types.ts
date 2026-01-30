export interface RoomTransformation {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  declutteringPlan: string;
  audioUrl?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  originalImageBase64?: string; // Stored temporarily for processing
  processingStartedAt?: number; // Timestamp when processing began to prevent concurrent runs
  blobUrl?: string; // Direct Vercel Blob URL for faster retrieval
  // User controls
  creativityLevel?: 'strict' | 'balanced' | 'creative'; // How creative the AI can be
  keepItems?: string; // Items the user wants to preserve
  browserId?: string; // Browser fingerprint for ownership
}

export interface TransformationRequest {
  imageBase64: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  creativityLevel?: 'strict' | 'balanced' | 'creative';
  keepItems?: string;
  browserId?: string;
}

export interface TransformationResponse {
  id: string;
  afterImageUrl: string;
  declutteringPlan: string;
}

export interface Feedback {
  id: string;
  transformationId: string;
  helpful: boolean | null;
  comment: string;
  createdAt: string;
}

