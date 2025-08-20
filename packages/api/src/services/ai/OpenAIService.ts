import OpenAI from 'openai';
import dotenv from 'dotenv';
import {
  AIOverallEvaluation,
  IELTSWritingAIEvaluation,
  IELTSSpeakingAIEvaluation,
  TOEFLWritingAIEvaluation,
  TOEFLSpeakingAIEvaluation,
} from '@openenglishttutor/shared/types';

dotenv.config();

class OpenAIService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    this.openai = new OpenAI({ apiKey });
    this.model = 'gpt-4o'; // Or another suitable GPT-4 model
  }

  private async callOpenAI(prompt: string, maxTokens: number = 2000): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI API returned no content.');
      }
      return content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get response from OpenAI: ${error.message}`);
      }
      throw new Error(`An unknown error occurred while calling OpenAI API.`);
    }
  }

  public async evaluateText(
    prompt: string,
    evaluationType: 'ielts_writing' | 'ielts_speaking' | 'toefl_writing' | 'toefl_speaking'
  ): Promise<AIOverallEvaluation> {
    const maxTokens = 2000; // Adjust max tokens based on expected response length
    let schema: object;

    switch (evaluationType) {
      case 'ielts_writing':
        schema = {
          type: "object",
          properties: {
            overallScore: { type: "number", description: "Overall IELTS writing band score (0-9)" },
            feedback: { type: "string", description: "Detailed feedback for the writing task" },
            suggestions: { type: "string", description: "Suggestions for improvement" },
            criteriaScores: {
              type: "object",
              properties: {
                taskAchievement: { type: "number", description: "Score for Task Achievement (0-9)" },
                coherenceCohesion: { type: "number", description: "Score for Coherence & Cohesion (0-9)" },
                lexicalResource: { type: "number", description: "Score for Lexical Resource (0-9)" },
                grammaticalRange: { type: "number", description: "Score for Grammatical Range & Accuracy (0-9)" },
              },
              required: ["taskAchievement", "coherenceCohesion", "lexicalResource", "grammaticalRange"]
            },
            rawAIAssessment: { type: "object", description: "Raw AI response for auditing" }
          },
          required: ["overallScore", "feedback", "suggestions", "criteriaScores"]
        };
        break;
      case 'ielts_speaking':
        schema = {
          type: "object",
          properties: {
            overallScore: { type: "number", description: "Overall IELTS speaking band score (0-9)" },
            feedback: { type: "string", description: "Detailed feedback for the speaking task" },
            suggestions: { type: "string", description: "Suggestions for improvement" },
            criteriaScores: {
              type: "object",
              properties: {
                fluencyCoherence: { type: "number", description: "Score for Fluency & Coherence (0-9)" },
                lexicalResource: { type: "number", description: "Score for Lexical Resource (0-9)" },
                grammaticalRange: { type: "number", description: "Score for Grammatical Range & Accuracy (0-9)" },
                pronunciation: { type: "number", description: "Score for Pronunciation (0-9)" },
              },
              required: ["fluencyCoherence", "lexicalResource", "grammaticalRange", "pronunciation"]
            },
            transcription: { type: "string", description: "The transcribed text of the original audio" },
            rawAIAssessment: { type: "object", description: "Raw AI response for auditing" }
          },
          required: ["overallScore", "feedback", "suggestions", "criteriaScores", "transcription"]
        };
        break;
      case 'toefl_writing':
        schema = {
          type: "object",
          properties: {
            overallScore: { type: "number", description: "Overall TOEFL writing score (0-5)" },
            feedback: { type: "string", description: "Detailed feedback for the writing task" },
            suggestions: { type: "string", description: "Suggestions for improvement" },
            criteriaScores: {
              type: "object",
              properties: {
                development: { type: "number", description: "Score for Development (0-5)" },
                organization: { type: "number", description: "Score for Organization (0-5)" },
                languageUse: { type: "number", description: "Score for Language Use (0-5)" },
              },
              required: ["development", "organization", "languageUse"]
            },
            rawAIAssessment: { type: "object", description: "Raw AI response for auditing" }
          },
          required: ["overallScore", "feedback", "suggestions", "criteriaScores"]
        };
        break;
      case 'toefl_speaking':
        schema = {
          type: "object",
          properties: {
            overallScore: { type: "number", description: "Overall TOEFL speaking score (0-4)" },
            feedback: { type: "string", description: "Detailed feedback for the speaking task" },
            suggestions: { type: "string", description: "Suggestions for improvement" },
            criteriaScores: {
              type: "object",
              properties: {
                delivery: { type: "number", description: "Score for Delivery (0-4)" },
                languageUse: { type: "number", description: "Score for Language Use (0-4)" },
                topicDevelopment: { type: "number", description: "Score for Topic Development (0-4)" },
              },
              required: ["delivery", "languageUse", "topicDevelopment"]
            },
            transcription: { type: "string", description: "The transcribed text of the original audio" },
            rawAIAssessment: { type: "object", description: "Raw AI response for auditing" }
          },
          required: ["overallScore", "feedback", "suggestions", "criteriaScores", "transcription"]
        };
        break;
      default:
        throw new Error(`Unsupported evaluation type: ${evaluationType}`);
    }

    const fullPrompt = `${prompt}\n\nProvide the response in JSON format according to the following schema:\n${JSON.stringify(schema, null, 2)}`;
    const jsonResponse = await this.callOpenAI(fullPrompt, maxTokens);
    
    try {
      const parsedResponse = JSON.parse(jsonResponse);
      // Validate parsedResponse against the schema (basic validation)
      if (typeof parsedResponse.overallScore !== 'number' || !parsedResponse.feedback || !parsedResponse.suggestions || !parsedResponse.criteriaScores) {
        throw new Error('Parsed AI response is missing required fields.');
      }
      return { ...parsedResponse, rawAIAssessment: jsonResponse };
    } catch (parseError: unknown) {
      console.error('Error parsing OpenAI response:', parseError);
      if (parseError instanceof Error) {
        throw new Error(`Failed to parse AI response: ${parseError.message}. Raw response: ${jsonResponse}`);
      }
      throw new Error(`An unknown error occurred while parsing AI response. Raw response: ${jsonResponse}`);
    }
  }
}

export const openAIService = new OpenAIService();