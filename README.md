# Pinterest Automation Platform

Automated Pinterest pin generation system with AI-powered image generation, description writing, and keyword optimization.

**Live Production:** [https://warmingautomation.flexiglob.com](https://warmingautomation.flexiglob.com)

## Features

- **AI Image Generation** - Generate Pinterest-optimized images using Seedream, OpenAI DALL-E, or other AI models
- **Smart Templates** - Apply text overlays, logos, and backgrounds to generated images
- **Keyword Research** - AI-powered keyword and hashtag generation for Pinterest SEO
- **Batch Processing** - Generate multiple pins at once with customizable quantities
- **Image Description** - Automatic Pinterest-friendly descriptions and titles
- **CSV Export** - Export pins in Pinterest bulk upload format
- **Template Management** - Create, edit, and manage reusable text/logo templates
- **API Key Management** - Full CRUD operations for API keys with show/hide sensitive values
- **Prompt Management** - Create and edit prompts for image descriptions, generation, and keyword search
- **Model Presets** - Quick model selection for OpenAI (including gpt-4-vision-preview), Seedream, and Deepseek
- **Generation History** - Track all your pin generations with preview and download
- **Multi-User Support** - User authentication and isolated workspaces

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Image Processing**: Sharp
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL (if running without Docker)

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/anassBenhima/accounts_warming_automation.git
   cd accounts_warming_automation
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker compose exec app npx prisma migrate dev
   ```

5. **Seed the database**
   ```bash
   docker compose exec app npx prisma db seed
   ```

6. **Access the application**
   - Application: http://localhost:3333
   - Default admin credentials:
     - Email: `admin@gmail.com`
     - Password: `admin@123@blogging`

## Production Deployment

### 1. Prepare Environment

```bash
# Copy production environment template
cp .env.prod .env

# Edit .env with your production values
nano .env
```

Required environment variables:
- \`DATABASE_URL\` - PostgreSQL connection string (use \`postgres\` as hostname for Docker Compose)
  - Example: \`postgresql://postgres:postgres@postgres:5432/pinterest_automation?schema=public\`
- \`POSTGRES_USER\`, \`POSTGRES_PASSWORD\`, \`POSTGRES_DB\` - Database credentials
- \`NEXTAUTH_URL\` - Your production domain URL (e.g., \`https://warmingautomation.flexiglob.com\`)
- \`NEXTAUTH_SECRET\` - Generate with: \`openssl rand -base64 32\`
- \`PORT\` - Application port (default: 3333)

Optional production API keys (will be seeded into database):
- \`PROD_SEEDREAM_API_KEY\` / \`PROD_SEEDREAM_MODEL\` - Seedream image generation API
- \`PROD_DEEPSEEK_API_KEY\` / \`PROD_DEEPSEEK_MODEL\` - Deepseek keyword search API
- \`PROD_OPENAI_SEARCH_API_KEY\` / \`PROD_OPENAI_SEARCH_MODEL\` - OpenAI search API
- \`PROD_OPENAI_DESC_API_KEY\` / \`PROD_OPENAI_DESC_MODEL\` - OpenAI image description API

Note: API keys can also be added via the UI after deployment

### 2. Deploy

Run the automated deployment script:

```bash
./deploy-prod.sh
```

This script will:
- Build Docker images
- Run database migrations
- Seed database with admin user and default prompts/API keys
- Start containers
- Verify application health

### 3. Manual Deployment

Alternatively, deploy manually:

```bash
# Build and start
docker compose -f docker compose.prod.yml up -d --build

# Run migrations
docker compose -f docker compose.prod.yml exec app npx prisma migrate deploy

# Check status
docker compose -f docker compose.prod.yml ps
```

## Production Health Check

The deployment script automatically checks application health. To manually verify:

```bash
# Check if application is responding
curl http://localhost:3333

# View logs
docker compose -f docker compose.prod.yml logs -f app

# Check container status
docker compose -f docker compose.prod.yml ps
```

## Management Commands

```bash
# View logs
docker compose -f docker compose.prod.yml logs -f

# Restart application
docker compose -f docker compose.prod.yml restart app

# Stop all services
docker compose -f docker compose.prod.yml down

# Rebuild and restart
docker compose -f docker compose.prod.yml up -d --build
```

## Database Migrations

```bash
# Development - Create and apply migration
docker compose exec app npx prisma migrate dev --name migration_name

# Production - Apply migrations
docker compose -f docker compose.prod.yml exec app npx prisma migrate deploy

# View migration status
docker compose exec app npx prisma migrate status
```

## Project Structure

```
.
├── app/                      # Next.js app directory
│   ├── (auth)/              # Authentication pages
│   ├── (dashboard)/         # Dashboard pages
│   └── api/                 # API routes
├── components/              # React components
├── lib/                     # Utility libraries
│   └── services/           # Business logic services
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Prisma schema
│   └── migrations/         # Database migrations
├── public/                 # Static files
│   ├── uploads/           # User uploaded images
│   └── generated/         # Generated images
├── docker compose.yml     # Development Docker config
├── docker compose.prod.yml # Production Docker config
├── Dockerfile             # Docker image definition
├── deploy-prod.sh         # Production deployment script
└── .env.prod             # Production environment template
```

## Configuration

### API Keys Management

Add your API keys in the dashboard:
1. Navigate to **API Keys** page
2. Add keys for:
   - Image Generation (Seedream, OpenAI, etc.)
   - Keyword Search (OpenAI, Deepseek)
   - Image Description (OpenAI, Deepseek)

### Template Management

Create reusable templates:
- **LOGO** - Add your logo to images
- **TEXT** - Add text overlays
- **TEXT_WITH_BACKGROUND** - Text with colored background bars

## Troubleshooting

### Application won't start

```bash
# Check logs
docker compose logs app

# Rebuild containers
docker compose down
docker compose up -d --build
```

### Database connection issues

```bash
# Check database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify DATABASE_URL in .env
```

### Font rendering issues (squares instead of text)

The Dockerfile includes all necessary fonts. If you see squares:
```bash
# Rebuild with no cache
docker compose build --no-cache app
docker compose up -d
```

## Features Documentation

### Image Generation Flow

1. **Upload Reference Image** (optional)
2. **Select API Keys** - For image generation, keyword search, and descriptions
3. **Configure Models** - Choose AI models with preset options
4. **Set Image Dimensions** - Customize output size
5. **Select Templates** - Apply logos/text overlays
6. **Generate Batch** - Specify quantity and process

### Toast Notifications

All user actions provide feedback via toast notifications:
- Success confirmations
- Error messages
- Processing status updates

### Model Presets

Quick-select common models:
- **Seedream**: seedream-4-0-250828, seedream-3-5-250815
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo
- **Deepseek**: deepseek-chat, deepseek-coder

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Private project - All rights reserved

## Support

For issues or questions, please open an issue on GitHub.
