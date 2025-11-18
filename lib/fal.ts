import axios from 'axios';

export interface FalImageGenerationParams {
  prompt: string;
  modelName: string;
  width?: number;
  height?: number;
  numImages?: number; // 1-4
  numInferenceSteps?: number; // 1-50
  seed?: number;
}

export interface FalImageResult {
  url: string;
  width: number;
  height: number;
  contentType: string;
}

export interface FalGenerationResponse {
  images: FalImageResult[];
  prompt: string;
  seed: number;
  hasNsfwConcepts?: boolean[];
  timings?: Record<string, number>;
}

class FalService {
  private static instance: FalService;
  private apiKey: string = '';

  private constructor() {}

  public static getInstance(): FalService {
    if (!FalService.instance) {
      FalService.instance = new FalService();
    }
    return FalService.instance;
  }

  /**
   * Configure fal client with API key
   */
  public configure(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Generate image using fal.ai queue API with polling
   */
  public async generateImage(
    params: FalImageGenerationParams
  ): Promise<FalGenerationResponse> {
    const {
      prompt,
      modelName,
      width = 1000,
      height = 1500,
      numImages = 1,
      numInferenceSteps = 30,
      seed = Math.floor(Math.random() * 100000),
    } = params;

    if (!this.apiKey) {
      throw new Error('fal.ai API key not configured. Call configure() first.');
    }

    try {
      // Step 1: Submit the generation request
      const requestData = {
        prompt,
        width,
        height,
        num_inference_steps: numInferenceSteps,
        num_images: numImages,
        seed,
      };

      console.log(`Submitting fal.ai request for model: ${modelName}`);

      const submitResponse = await axios.post(
        `https://queue.fal.run/${modelName}`,
        requestData,
        {
          headers: {
            'Authorization': `key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { request_id, status_url, response_url } = submitResponse.data;
      console.log(`Request submitted. ID: ${request_id}, polling status...`);

      // Step 2: Poll the status URL until complete
      const maxAttempts = 60; // Max 5 minutes (60 attempts * 5 seconds)
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;

        try {
          const statusResponse = await axios.get(status_url, {
            headers: {
              'Authorization': `key ${this.apiKey}`,
            },
          });

          const { status } = statusResponse.data;
          console.log(`Attempt ${attempts}: Status = ${status}`);

          if (status === 'COMPLETED') {
            // Step 3: Fetch the final result
            const resultResponse = await axios.get(response_url, {
              headers: {
                'Authorization': `key ${this.apiKey}`,
              },
            });

            console.log('Generation completed successfully');
            return resultResponse.data as FalGenerationResponse;
          } else if (status === 'FAILED') {
            throw new Error('fal.ai generation failed');
          }
          // Continue polling if status is IN_QUEUE or IN_PROGRESS
        } catch (pollError: any) {
          console.error('Error polling status:', pollError.message);
          // Continue polling despite errors
        }
      }

      throw new Error('fal.ai generation timed out after 5 minutes');
    } catch (error: any) {
      console.error('fal.ai generation error:', error.response?.data || error.message);
      throw new Error(
        `Failed to generate image with fal.ai: ${error.response?.data?.detail || error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Get recommended image size for model
   */
  public getRecommendedImageSize(
    modelName: string,
    width: number,
    height: number
  ): { width: number; height: number } {
    // For flux-pro models, we use custom dimensions directly
    return { width, height };
  }
}

// Export singleton instance
export const falService = FalService.getInstance();
export default falService;
