import PromptManager from '@/components/PromptManager';

const presetTemplates = [
  {
    name: 'Pinterest Keyword Research',
    template: `Analyze the given topic and generate Pinterest-optimized keywords:
- Identify 15-20 high-volume Pinterest search terms
- Include long-tail keywords (3-5 words)
- Add seasonal and trending variations
- Suggest niche-specific keywords
- Include related hashtags popular on Pinterest
- Focus on keywords with high engagement potential
- Consider visual search terms users would type

Format: Return as a comma-separated list of keywords, ranked by relevance.`,
  },
  {
    name: 'SEO Keyword Generator',
    template: `Generate comprehensive SEO keywords for the given topic:
- Primary keywords (high volume, high competition)
- Secondary keywords (medium volume, medium competition)
- Long-tail keywords (low competition, specific intent)
- LSI (Latent Semantic Indexing) keywords
- Question-based keywords
- Local search variations (if applicable)
- Include search intent categories (informational, transactional, navigational)

Format: Categorize keywords by type and search volume.`,
  },
  {
    name: 'Trending Topics Finder',
    template: `Identify trending keywords and topics in the given niche:
- Current trending searches and hashtags
- Seasonal trends and upcoming opportunities
- Rising search terms with growing interest
- Popular variations and related topics
- Viral content themes in this niche
- Emerging micro-trends
- Celebrity or influencer-driven trends

Focus on keywords with momentum and growth potential.`,
  },
  {
    name: 'Content Gap Analysis',
    template: `Analyze keyword gaps and opportunities in the given topic:
- Underserved keywords with decent search volume
- Questions people are asking but not getting answers
- Comparison keywords (X vs Y, best X for Y)
- "How to" and tutorial-focused keywords
- Pain point and problem-solving keywords
- Buyer intent keywords
- Keywords competitors are missing

Identify high-opportunity, low-competition keywords.`,
  },
  {
    name: 'Hashtag Strategy',
    template: `Create a comprehensive hashtag strategy for the given topic:
- High-volume popular hashtags (100k+ uses)
- Medium-volume niche hashtags (10k-100k uses)
- Low-volume specific hashtags (1k-10k uses)
- Branded and campaign-specific hashtags
- Trending and seasonal hashtags
- Community and engagement-focused hashtags
- Mix of broad and niche tags for maximum reach

Provide 20-30 hashtags categorized by volume and purpose.`,
  },
  {
    name: 'Audience Intent Keywords',
    template: `Generate keywords based on user search intent for the given topic:
- Informational intent: "what is", "how to", "guide", "tutorial"
- Navigational intent: brand names, specific sites/services
- Transactional intent: "buy", "price", "discount", "review"
- Commercial investigation: "best", "top", "vs", "comparison"
- Problem-solving intent: "fix", "solve", "help", "why"
- Inspiration-seeking: "ideas", "inspiration", "examples"

Categorize keywords by user intent and provide 5-10 per category.`,
  },
];

export default function KeywordSearchPage() {
  return (
    <PromptManager
      title="Keyword Search Prompts"
      description="Manage prompts for keyword and trend research"
      apiEndpoint="/api/keyword-search-prompt"
      promptType="keyword-search-prompt"
      presetTemplates={presetTemplates}
    />
  );
}
