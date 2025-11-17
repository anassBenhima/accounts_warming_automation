import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface HTMLTemplateParams {
  templatePath: string;
  imageReplacements: Record<string, string>; // e.g., { "{image_1}": "/generated/image1.png", "{image_2}": "/generated/image2.png" }
  width?: number;
  height?: number;
}

export interface HTMLTemplateResult {
  screenshotPath: string; // Path to the generated screenshot
  htmlContent: string; // Processed HTML content
}

class HTMLTemplateService {
  private static instance: HTMLTemplateService;

  private constructor() {}

  public static getInstance(): HTMLTemplateService {
    if (!HTMLTemplateService.instance) {
      HTMLTemplateService.instance = new HTMLTemplateService();
    }
    return HTMLTemplateService.instance;
  }

  /**
   * Parse HTML template and replace image placeholders
   */
  public async parseTemplate(
    templatePath: string,
    imageReplacements: Record<string, string>
  ): Promise<string> {
    try {
      // Read HTML template file
      const fullTemplatePath = path.join(process.cwd(), 'public', templatePath);
      let htmlContent = await fs.readFile(fullTemplatePath, 'utf-8');

      // Replace all image placeholders with actual image paths
      for (const [placeholder, imagePath] of Object.entries(imageReplacements)) {
        // Convert relative path to absolute file:// URL for Puppeteer
        const absoluteImagePath = path.join(process.cwd(), 'public', imagePath);
        const imageUrl = `file://${absoluteImagePath}`;

        // Replace placeholder with image tag or URL depending on context
        // Support both {placeholder} in src attributes and standalone placeholders
        htmlContent = htmlContent.replace(
          new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
          imageUrl
        );
      }

      return htmlContent;
    } catch (error) {
      console.error('Error parsing HTML template:', error);
      throw new Error(`Failed to parse HTML template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render HTML template to screenshot using Puppeteer
   */
  public async renderToScreenshot(
    params: HTMLTemplateParams
  ): Promise<HTMLTemplateResult> {
    let browser;
    try {
      const {
        templatePath,
        imageReplacements,
        width = 1000,
        height = 1500,
      } = params;

      // Parse template and replace placeholders
      const htmlContent = await this.parseTemplate(templatePath, imageReplacements);

      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      });

      const page = await browser.newPage();

      // Set viewport size
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 1,
      });

      // Set HTML content
      await page.setContent(htmlContent, {
        waitUntil: ['load', 'networkidle0'],
      });

      // Generate screenshot
      const screenshotFilename = `html_template_${randomUUID()}.png`;
      const screenshotPath = path.join(process.cwd(), 'public', 'generated', screenshotFilename) as `${string}.png`;

      await page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: false,
      });

      await browser.close();

      return {
        screenshotPath: `/generated/${screenshotFilename}`,
        htmlContent,
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error rendering HTML template:', error);
      throw new Error(`Failed to render HTML template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract placeholders from HTML template
   * Returns array of placeholders like ["{image_1}", "{image_2}"]
   */
  public async extractPlaceholders(templatePath: string): Promise<string[]> {
    try {
      const fullTemplatePath = path.join(process.cwd(), 'public', templatePath);
      const htmlContent = await fs.readFile(fullTemplatePath, 'utf-8');

      // Match all placeholders in the format {image_N} or {anything}
      const placeholderRegex = /\{[^}]+\}/g;
      const matches = htmlContent.match(placeholderRegex);

      // Return unique placeholders
      return matches ? Array.from(new Set(matches)) : [];
    } catch (error) {
      console.error('Error extracting placeholders:', error);
      throw new Error(`Failed to extract placeholders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate HTML template file
   */
  public async validateTemplate(templatePath: string): Promise<boolean> {
    try {
      const fullTemplatePath = path.join(process.cwd(), 'public', templatePath);
      const stats = await fs.stat(fullTemplatePath);

      if (!stats.isFile()) {
        throw new Error('Template path is not a file');
      }

      const htmlContent = await fs.readFile(fullTemplatePath, 'utf-8');

      // Basic validation: check if it's HTML-like content
      if (!htmlContent.includes('<html') && !htmlContent.includes('<!DOCTYPE')) {
        throw new Error('Template does not appear to be a valid HTML file');
      }

      return true;
    } catch (error) {
      console.error('Error validating template:', error);
      return false;
    }
  }
}

// Export singleton instance
export const htmlTemplateService = HTMLTemplateService.getInstance();
export default htmlTemplateService;
