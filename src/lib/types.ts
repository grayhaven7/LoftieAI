export interface RoomTransformation {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  combinedImageUrl?: string; // Side-by-side before/after for social sharing
  declutteringPlan: string;
  audioUrl?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  accessedAt?: string; // Last time user accessed the results
  status: 'processing' | 'completed' | 'failed';
  originalImageBase64?: string; // Stored temporarily for processing
  processingStartedAt?: number; // Timestamp when processing began to prevent concurrent runs
  blobUrl?: string; // Direct Vercel Blob URL for faster retrieval
  // User controls
  creativityLevel?: 'strict' | 'balanced' | 'creative'; // How creative the AI can be
  keepItems?: string; // Items the user wants to preserve
  browserId?: string; // Browser fingerprint for ownership
  // Feedback tracking
  feedbackHelpful?: boolean | null; // Was this transformation helpful?
  feedbackComment?: string; // User's feedback comment
  feedbackSubmittedAt?: string; // When feedback was submitted
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

