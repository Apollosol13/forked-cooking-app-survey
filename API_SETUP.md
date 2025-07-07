# API Setup Instructions

## API Keys Setup

### OpenAI API Key (for recipe text generation)
1. **Get your OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

### Replicate API Token (for high-quality food images)
1. **Get your Replicate API Token:**
   - Go to https://replicate.com/account/api-tokens
   - Create a new API token
   - Copy the token (starts with `r8_`)

2. **Add both API keys to your project:**
   - Open the `.env.local` file in the project root
   - Replace the placeholders with your actual keys:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   VITE_REPLICATE_API_TOKEN=r8_your-actual-token-here
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

## Features Included

- **Recipe Generation**: Uses GPT-3.5-turbo to create custom recipes
- **High-Quality Food Images**: Uses Replicate's SDXL model for professional food photography
- **Error Handling**: Graceful fallbacks if API calls fail
- **Secure**: API keys stored in environment variables

## Security Notes

- ⚠️ **Never commit your `.env.local` file to version control**
- For production, move API calls to a backend server
- The current setup uses `dangerouslyAllowBrowser: true` for development only

## Troubleshooting

- If you see "OpenAI API key not configured" error, check your `.env.local` file
- Make sure you have sufficient OpenAI credits
- Image generation is optional - recipes will work without images 