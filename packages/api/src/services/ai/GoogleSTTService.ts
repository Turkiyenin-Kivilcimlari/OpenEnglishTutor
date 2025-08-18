import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

class GoogleSTTService {
  private client: SpeechClient;
  private config: google.cloud.speech.v1.IRecognitionConfig;

  constructor() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const keyFile = process.env.GOOGLE_CLOUD_KEY_FILE;

    if (!projectId || !keyFile) {
      throw new Error('Google Cloud configuration variables (GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_KEY_FILE) are not set in environment variables.');
    }

    const credentialsPath = path.resolve(process.cwd(), keyFile);
    console.log(`Attempting to load Google Cloud credentials from: ${credentialsPath}`);

    // This environmental variable is recognized by the @google-cloud libraries
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    this.client = new SpeechClient({
      projectId: projectId,
      keyFilename: credentialsPath, // Explicitly provide keyFilename
    });

    this.config = {
      encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3, // Assuming MP3, adjust if different
      sampleRateHertz: 16000, // Common sample rate, adjust if necessary
      languageCode: 'en-US', // Default language, can be overridden
      audioChannelCount: 1, // Mono audio assumed, adjust if stereo
      enableAutomaticPunctuation: true,
    };
  }

  /**
   * Transcribes an audio file from a given URL or Buffer.
   * @param audioContent - Base64 encoded audio content or a direct Buffer.
   * @param opts - Transcription options (e.g., languageCode, sampleRateHertz).
   * @returns The transcribed text.
   */
  public async transcribeAudio(
    audioContent: string | Buffer,
    opts?: {
      languageCode?: string;
      sampleRateHertz?: number;
      encoding?: google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
    }
  ): Promise<string> {
    try {
      const audio = typeof audioContent === 'string' ? { content: audioContent } : { content: audioContent.toString('base64') };

      const request = {
        audio: audio,
        config: {
          ...this.config,
          ...opts,
        },
      };

      const [response] = await this.client.recognize(request);
      const transcription = response.results
        ?.map(result => result.alternatives?.[0]?.transcript)
        .filter(Boolean)
        .join('\n');

      if (!transcription) {
        throw new Error('No transcription results found.');
      }

      return transcription;
    } catch (error) {
      console.error('Error transcribing audio with Google STT API:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to transcribe audio: ${error.message}`);
      }
      throw new Error(`An unknown error occurred during audio transcription.`);
    }
  }
}

export const googleSTTService = new GoogleSTTService();