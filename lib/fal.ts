import { fal } from '@fal-ai/client';

export interface FalImageGenerationParams {
  prompt: string;
  modelName: string;
  imageSize?:
    | 'square_hd'
    | 'square'
    | 'portrait_4_3'
    | 'portrait_16_9'
    | 'landscape_4_3'
    | 'landscape_16_9'
    | { width: number; height: number };
  numImages?: number; // 1-4
  numInferenceSteps?: number; // 1-50
  guidanceScale?: number; // 1-20
  seed?: number;
  outputFormat?: 'jpeg' | 'png';
  enableSafetyChecker?: boolean;
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
    fal.config({
      credentials: apiKey,
    });
  }

  /**
   * Generate image using fal.ai API
   */
  public async generateImage(
    params: FalImageGenerationParams
  ): Promise<FalGenerationResponse> {
    const {
      prompt,
      modelName,
      imageSize = 'landscape_4_3',
      numImages = 1,
      numInferenceSteps = 28,
      guidanceScale = 3.5,
      seed,
      outputFormat = 'jpeg',
      enableSafetyChecker = true,
    } = params;

    try {
      // Configure model-specific parameters
      const input: any = {
        prompt,
        num_images: numImages,
        output_format: outputFormat,
        enable_safety_checker: enableSafetyChecker,
      };

      // Add optional parameters based on model
      if (modelName.includes('flux')) {
        // FLUX models use width/height directly (not image_size)
        if (typeof imageSize === 'object' && 'width' in imageSize && 'height' in imageSize) {
          input.width = imageSize.width;
          input.height = imageSize.height;
        } else {
          // If preset string provided, use image_size
          input.image_size = imageSize;
        }
        input.num_inference_steps = numInferenceSteps;
        input.guidance_scale = guidanceScale;
        if (seed) input.seed = seed;
      } else if (modelName.includes('imagen')) {
        // Imagen uses aspect_ratio presets
        input.aspect_ratio = typeof imageSize === 'string' ? imageSize : '1:1';
        if (seed) input.seed = seed;
      } else if (modelName.includes('recraft')) {
        // Recraft uses size parameter
        input.size = typeof imageSize === 'string' ? imageSize : '1024x1024';
        if (seed) input.seed = seed;
      } else if (modelName.includes('hidream') || modelName.includes('qwen')) {
        // HiDream and Qwen use image_size
        if (typeof imageSize === 'string') {
          input.image_size = imageSize;
        } else {
          input.image_size = imageSize;
        }
        input.num_inference_steps = numInferenceSteps;
        input.guidance_scale = guidanceScale;
        if (seed) input.seed = seed;
      } else {
        // Default: use image_size
        if (typeof imageSize === 'string') {
          input.image_size = imageSize;
        } else {
          input.image_size = imageSize;
        }
      }

      // Use subscribe for real-time generation
      const result = await fal.subscribe(modelName, {
        input,
        logs: false,
        onQueueUpdate: (update: any) => {
          if (update.status === 'IN_PROGRESS') {
            console.log('Generation in progress...');
          }
        },
      });

      return result.data as FalGenerationResponse;
    } catch (error: any) {
      console.error('fal.ai generation error:', error);
      throw new Error(
        `Failed to generate image with fal.ai: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Generate image using queue (async approach)
   */
  public async generateImageAsync(
    params: FalImageGenerationParams
  ): Promise<{ requestId: string }> {
    const {
      prompt,
      modelName,
      imageSize = 'landscape_4_3',
      numImages = 1,
      numInferenceSteps = 28,
      guidanceScale = 3.5,
      seed,
      outputFormat = 'jpeg',
      enableSafetyChecker = true,
    } = params;

    try {
      const input: any = {
        prompt,
        image_size: imageSize,
        num_images: numImages,
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        output_format: outputFormat,
        enable_safety_checker: enableSafetyChecker,
      };

      if (seed) input.seed = seed;

      const { request_id } = await fal.queue.submit(modelName, { input });

      return { requestId: request_id };
    } catch (error: any) {
      console.error('fal.ai queue submission error:', error);
      throw new Error(
        `Failed to queue image generation: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Check status of queued generation
   */
  public async getQueueStatus(
    modelName: string,
    requestId: string
  ): Promise<any> {
    try {
      const status = await fal.queue.status(modelName, {
        requestId,
        logs: false,
      });

      return status;
    } catch (error: any) {
      console.error('fal.ai queue status error:', error);
      throw new Error(
        `Failed to get queue status: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Get result of queued generation
   */
  public async getQueueResult(
    modelName: string,
    requestId: string
  ): Promise<FalGenerationResponse> {
    try {
      const result = await fal.queue.result(modelName, {
        requestId,
      });

      return result.data as FalGenerationResponse;
    } catch (error: any) {
      console.error('fal.ai queue result error:', error);
      throw new Error(
        `Failed to get queue result: ${error.message || 'Unknown error'}`
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
  ): string | { width: number; height: number } {
    // FLUX models prefer preset sizes
    if (modelName.includes('flux')) {
      const aspectRatio = width / height;
      if (aspectRatio === 1) return 'square_hd';
      if (aspectRatio > 1.2 && aspectRatio < 1.4) return 'landscape_4_3';
      if (aspectRatio > 1.7 && aspectRatio < 1.8) return 'landscape_16_9';
      if (aspectRatio < 0.8 && aspectRatio > 0.7) return 'portrait_4_3';
      if (aspectRatio < 0.6) return 'portrait_16_9';
      return 'landscape_4_3'; // default
    }

    // Other models can use custom dimensions
    return { width, height };
  }
}

// Export singleton instance
export const falService = FalService.getInstance();
export default falService;
