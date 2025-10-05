# ElevenLabs API Setup Guide

## Getting Your API Key

1. **Sign up for ElevenLabs**: Go to [https://elevenlabs.io](https://elevenlabs.io) and create an account
2. **Navigate to API Keys**: Go to your profile settings and find the "API Keys" section
3. **Create a new API key**: Click "Create API Key" and give it a descriptive name
4. **Copy your API key**: Save it securely - you'll need it for the next step

## Setting Up the Environment

1. **Create a `.env` file** in the root directory of your project:
   ```bash
   touch .env
   ```

2. **Add your API key** to the `.env` file:
   ```
   VITE_ELEVENLABS_API_KEY=your_actual_api_key_here
   ```

3. **Restart your development server**:
   ```bash
   npm run dev
   ```

## API Usage Limits

- **Free Tier**: 10,000 characters per month
- **Paid Plans**: Higher limits available
- **Rate Limits**: 100 requests per minute

## Troubleshooting

### Common Issues:

1. **"API key not configured" error**:
   - Make sure your `.env` file is in the root directory
   - Ensure the variable name is exactly `VITE_ELEVENLABS_API_KEY`
   - Restart your development server after adding the key

2. **"Invalid API key" error**:
   - Double-check your API key is correct
   - Make sure there are no extra spaces or characters
   - Verify your ElevenLabs account is active

3. **"Quota exceeded" error**:
   - You've reached your monthly character limit
   - Consider upgrading your ElevenLabs plan
   - Wait for the next billing cycle

4. **Audio not playing**:
   - Check your browser's audio settings
   - Ensure your browser allows autoplay
   - Try clicking the play button manually

## Voice Options

The app includes 6 pre-configured voices:
- **Rachel** (Female) - Professional, clear
- **Antoni** (Male) - Warm, friendly  
- **Domi** (Male) - Energetic, expressive
- **Bella** (Female) - Soft, gentle
- **Antoni** (Male) - Alternative Antoni voice
- **Elli** (Female) - Young, vibrant

## Advanced Configuration

You can customize voice settings in the TextToSpeech component:
- **Stability**: Controls consistency (0.0 - 1.0)
- **Similarity Boost**: Controls voice similarity (0.0 - 1.0)  
- **Style**: Controls expressiveness (0.0 - 1.0)
- **Speaker Boost**: Enhances speaker characteristics

## Security Notes

- **Never commit your `.env` file** to version control
- **Keep your API key private** - don't share it publicly
- **Use environment variables** in production deployments
- **Consider using a proxy server** for production to hide your API key from client-side code
