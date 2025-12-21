export interface RoomTransformation {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  declutteringPlan: string;
  userEmail?: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
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

