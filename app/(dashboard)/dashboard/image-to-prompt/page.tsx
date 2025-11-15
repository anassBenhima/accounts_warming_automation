import PromptManager from '@/components/PromptManager';

const presetTemplates = [
  {
    name: 'Detailed Description',
    template: `Analyze this image and provide a comprehensive description including:
- Main subject and focal point
- Colors, lighting, and mood
- Composition and perspective
- Style and artistic elements
- Background and context
- Any text or notable details

Create a detailed description that could be used to recreate this image.`,
  },
  {
    name: 'Pinterest Pin Description',
    template: `Analyze this image and create a Pinterest-optimized description:
- Identify the main subject/theme
- Describe the visual style and aesthetic
- Note colors, composition, and mood
- Highlight any unique or eye-catching elements
- Suggest relevant Pinterest categories

Format the output as a clear, engaging description suitable for a Pinterest pin.`,
  },
  {
    name: 'Image to Image Prompt',
    template: `Convert this image into a detailed image generation prompt:
- Describe the subject matter precisely
- Include style descriptors (realistic, artistic, minimalist, etc.)
- Specify colors and lighting conditions
- Mention composition and framing
- Add quality keywords (high resolution, detailed, professional)

Output should be a complete prompt ready for image generation AI.`,
  },
  {
    name: 'SEO-Focused Description',
    template: `Analyze this image and create an SEO-optimized description:
- Identify the main subject/topic
- List relevant keywords and themes
- Describe visual elements that users might search for
- Note the style, color scheme, and mood
- Suggest search terms this image would rank for

Focus on creating searchable, keyword-rich content.`,
  },
];

export default function ImageToPromptPage() {
  return (
    <PromptManager
      title="Image to Prompt"
      description="Manage prompts for AI image description"
      apiEndpoint="/api/image-to-prompt"
      showLlmType={true}
      presetTemplates={presetTemplates}
    />
  );
}
