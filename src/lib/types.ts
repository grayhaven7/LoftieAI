export interface RoomTransformation {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  declutteringPlan: string;
  audioUrl?: string;
  userEmail?: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  originalImageBase64?: string; // Stored temporarily for processing
  processingStartedAt?: number; // Timestamp when processing began to prevent concurrent runs
  // User controls
  creativityLevel?: 'strict' | 'balanced' | 'creative'; // How creative the AI can be
  keepItems?: string; // Items the user wants to preserve
}

export interface TransformationRequest {
  imageBase64: string;
  userEmail?: string;
  creativityLevel?: 'strict' | 'balanced' | 'creative';
  keepItems?: string;
}

export interface TransformationResponse {
  id: string;
  afterImageUrl: string;
  declutteringPlan: string;
}

