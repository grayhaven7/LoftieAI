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
}

export interface TransformationRequest {
  imageBase64: string;
  userEmail?: string;
}

export interface TransformationResponse {
  id: string;
  afterImageUrl: string;
  declutteringPlan: string;
}

