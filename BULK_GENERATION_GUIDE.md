# Bulk Generation Guide

## Overview
The bulk generation system now supports two modes:

### Mode 1: Auto-Generate (Legacy)
Provide minimal information and let AI generate everything.

### Mode 2: Variations from Your Content (NEW)
Provide your own content and generate unique variations with the same meaning but different phrasing.

---

## CSV Format

### Required Columns (Both Modes):
- `keywords` - Comma-separated keywords
- `imageUrl` - URL to the source image
- `quantity` - Number of pins to generate

### Optional Columns (Mode 2 - New Feature):
- `title` - Your base title
- `description` - Your base description
- `altText` - Your base alt text

---

## Example CSV Files

### Mode 1: Auto-Generate (Legacy)
```csv
keywords,imageUrl,quantity
"food,recipe,cooking,delicious","https://example.com/image1.jpg",5
"healthy,nutrition,wellness","https://example.com/image2.jpg",3
```

**What happens:**
1. AI describes your image
2. AI generates titles, descriptions, keywords from scratch
3. Images are generated
4. Alt text is generated

---

### Mode 2: Your Content + Variations (NEW)
```csv
keywords,imageUrl,title,description,altText,quantity
"chocolate cake,dessert,baking","https://example.com/cake.jpg","Decadent Chocolate Cake Recipe","Try this amazing chocolate cake recipe that's moist, rich, and absolutely delicious! Perfect for any occasion.","Rich chocolate layer cake with frosting",10
"pasta,italian,dinner","https://example.com/pasta.jpg","Authentic Italian Pasta","Learn how to make authentic Italian pasta from scratch. Simple ingredients, incredible flavor!","Homemade pasta with tomato sauce",8
```

**What happens:**
1. AI generates 10 (or 8) **unique variations** of your content:
   - Each title has the SAME MEANING but different wording
   - Each description has the SAME MEANING but rephrased
   - Keywords include YOUR keywords + 2-3 NEW related ones
   - Alt text rephrased with same meaning
2. Images are generated for each variation
3. All alt text is embedded in image metadata

---

## How Variations Work

### Input Example:
```
Title: "Decadent Chocolate Cake Recipe"
Description: "Try this amazing chocolate cake recipe..."
Keywords: "chocolate cake, dessert, baking"
Alt Text: "Rich chocolate layer cake with frosting"
Quantity: 3
```

### AI Generates 3 Variations:

**Variation 1:**
- Title: "Ultimate Chocolate Layer Cake Guide"
- Description: "Discover how to create an incredibly moist chocolate cake..."
- Keywords: ["chocolate cake", "dessert", "baking", "layer cake", "homemade"]
- Alt Text: "Multi-layered chocolate cake with chocolate icing"

**Variation 2:**
- Title: "Perfect Chocolate Cake Every Time"
- Description: "Master the art of baking a rich, delicious chocolate cake..."
- Keywords: ["chocolate cake", "dessert", "baking", "chocolate", "recipe"]
- Alt Text: "Decadent chocolate dessert with creamy frosting"

**Variation 3:**
- Title: "Moist Chocolate Cake Recipe"
- Description: "Create an absolutely delicious chocolate cake that's perfect..."
- Keywords: ["chocolate cake", "dessert", "baking", "moist cake", "easy recipe"]
- Alt Text: "Homemade chocolate cake layers with rich frosting"

---

## Best Practices

### For Mode 2 (Variations):

1. **Write Clear Base Content:**
   - Title: 30-70 characters, descriptive
   - Description: 150-250 characters, include benefit
   - Alt Text: Under 125 characters, describe visual elements
   - Keywords: 3-5 core keywords

2. **Let AI Add Variety:**
   - AI will rephrase everything differently
   - AI will add related keywords
   - Same meaning, different words

3. **Request Right Quantity:**
   - Request 5-10 variations for best results
   - Each variation will be unique

4. **Alt Text in Metadata:**
   - Alt text is automatically embedded in image EXIF data
   - Visible in output popup
   - Accessible for screen readers

---

## API Response Tracking

All API responses are now tracked in the database for debugging:
- Image description calls
- Content variation generation
- Image generation
- Alt text generation

Query `bulkGenerationRow.apiResponses` to see full API call details.

---

## Migration from Old Format

### Old CSV (Still Works):
```csv
keywords,imageUrl,quantity
"food,recipe","https://example.com/img.jpg",5
```

### New CSV (Recommended):
```csv
keywords,imageUrl,title,description,altText,quantity
"food,recipe","https://example.com/img.jpg","My Recipe Title","Description here","Alt text here",5
```

Both formats are supported! The system automatically detects which mode to use.

---

## Technical Details

### Detection Logic:
```
IF (title AND description AND altText are provided)
  → Use Mode 2 (Generate Variations)
ELSE
  → Use Mode 1 (Legacy Auto-Generate)
```

### AI Models Used:
- **Content Variations:** DeepSeek or OpenAI (your choice)
- **Image Generation:** fal.ai with batch processing
- **Temperature:** 0.9 (high variation)

---

## Troubleshooting

**Q: My variations are too similar**
A: The AI uses temperature 0.9 for maximum variation. If still too similar, try providing more specific base content.

**Q: Can I mix both modes?**
A: Yes! Some rows can have title/description/altText, others can omit them.

**Q: Where is alt text stored?**
A: In database (`bulkGeneratedPin.altText`) and embedded in image EXIF metadata.

**Q: How many variations can I request?**
A: Up to 50 per row, but 5-10 is recommended for best quality and uniqueness.

---

## Next Steps

1. Prepare your CSV with new columns
2. Upload via Bulk Generation page
3. Select your API keys and models
4. Start generation
5. View results with embedded alt text
