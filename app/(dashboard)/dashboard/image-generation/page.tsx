import PromptManager from '@/components/PromptManager';

const presetTemplates = [
  {
    name: 'Pinterest Quote Design',
    template: `Create a visually stunning Pinterest quote image:
- Clean, modern design with elegant typography
- Inspirational or motivational theme
- Soft, aesthetic color palette (pastels, neutrals, or bold contrasts)
- Minimalist background with subtle textures or gradients
- Professional, high-quality appearance
- Optimized for vertical Pinterest format (2:3 ratio)
- Include decorative elements like florals, geometric shapes, or abstract patterns`,
  },
  {
    name: 'Product Mockup',
    template: `Generate a professional product mockup image:
- Clean, minimalist background (white, gray, or soft color)
- Professional studio lighting with soft shadows
- High-quality, photorealistic rendering
- Modern aesthetic with attention to detail
- Vertical orientation suitable for Pinterest
- Sharp focus on the product
- Professional commercial photography style`,
  },
  {
    name: 'Lifestyle & Aesthetic',
    template: `Create an aesthetic lifestyle image for Pinterest:
- Cozy, inviting atmosphere with warm lighting
- Beautiful composition with balanced elements
- Trendy, Instagram-worthy aesthetic
- Soft natural colors or curated color palette
- Include lifestyle elements (coffee, books, plants, decor)
- Vertical format optimized for Pinterest
- Professional photography quality with depth of field`,
  },
  {
    name: 'Infographic Style',
    template: `Design an informative Pinterest infographic:
- Clean, organized layout with clear hierarchy
- Professional color scheme (2-3 complementary colors)
- Modern, readable typography
- Visual elements like icons, charts, or illustrations
- Vertical format ideal for Pinterest scrolling
- Balanced white space for readability
- Eye-catching header with clear topic
- Professional, polished design aesthetic`,
  },
  {
    name: 'Food Photography',
    template: `Create an appetizing food photography image:
- Professional overhead or 45-degree angle shot
- Natural lighting with soft shadows
- Beautiful plating and composition
- Warm, inviting color tones
- Garnishes and styling elements
- Subtle background with complementary props
- High-quality, magazine-worthy appearance
- Vertical Pinterest-friendly format`,
  },
  {
    name: 'DIY/Craft Tutorial',
    template: `Generate a DIY or craft tutorial image:
- Step-by-step visual layout or before/after showcase
- Bright, clear lighting with vibrant colors
- Organized, uncluttered composition
- Hands or tools in action (optional)
- Vertical format for Pinterest
- Professional yet approachable aesthetic
- Clear focus on the craft/project
- Inspiring and achievable appearance`,
  },
];

export default function ImageGenerationPage() {
  return (
    <PromptManager
      title="Image Generation Prompts"
      description="Manage prompts for AI image generation"
      apiEndpoint="/api/image-generation-prompt"
      presetTemplates={presetTemplates}
    />
  );
}
