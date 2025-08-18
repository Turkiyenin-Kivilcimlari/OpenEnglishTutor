import { EvaluationType, ExamType, SkillType, QuestionType, Difficulty } from '@openenglishtutor/shared/types';

interface PromptConfig {
  type: 'writing' | 'speaking';
  examType: ExamType;
  skillType: SkillType;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  rubric: string; // The specific rubric for the evaluation
  sampleAnswer?: string; // Optional: A sample answer for comparative evaluation
}

export const generateIELTSWritingPrompt = (
  userAnswer: string,
  task: 1 | 2,
  questionContent: string,
  rubric: string
): string => {
  const taskName = `IELTS Writing Task ${task}`;
  let prompt = `You are an expert IELTS examiner. Evaluate the following ${taskName} response based on the provided IELTS Writing Task ${task} rubric.`;

  if (task === 1) {
    prompt += ` This is a Task 1 (report/letter) question. Analyze and describe the data/information presented visually.`;
  } else {
    prompt += ` This is a Task 2 (essay) question. Present a clear argument and support it with ideas.`;
  }

  prompt += `
  
  **Question:**
  ${questionContent}
  
  **User's Response:**
  ${userAnswer}
  
  **IELTS Writing Task ${task} Rubric:**
  ${rubric}
  
  Provide a comprehensive evaluation in JSON format based on the rubric, including:
  - An overall band score (0-9, allowing .5 increments, e.g., 6.5)
  - Detailed feedback on each of the four criteria: Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy.
  - Specific suggestions for improvement for each criterion.
  - Explicit scores for each of the four criteria (0-9).
  - Your response should adhere strictly to the JSON schema that represents the 'IELTSWritingAIEvaluation' interface.
  `;
  return prompt;
};

export const generateIELTSSpeakingPrompt = (
  transcription: string,
  part: 1 | 2 | 3,
  questionContent: string | string[], // Can be a single topic or a list of questions
  rubric: string
): string => {
  const partName = `IELTS Speaking Part ${part}`;
  let prompt = `You are an expert IELTS examiner. Evaluate the following ${partName} response based on the provided IELTS Speaking rubric.`;

  if (part === 1) {
    prompt += ` This is a Part 1 (introduction and interview) response regarding familiar topics.`;
  } else if (part === 2) {
    prompt += ` This is a Part 2 (long turn) response where the candidate spoke about a topic for 1-2 minutes.`;
  } else { // Part 3
    prompt += ` This is a Part 3 (discussion) response, which involves a two-way discussion of abstract ideas.`;
  }

  prompt += `
  
  **Question/Topic:**
  ${Array.isArray(questionContent) ? questionContent.join('\n- ') : questionContent}
  
  **User's Transcribed Speaking Response:**
  ${transcription}
  
  **IELTS Speaking Rubric:**
  ${rubric}
  
  Provide a comprehensive evaluation in JSON format based on the rubric, including:
  - An overall band score (0-9, allowing .5 increments, e.g., 6.5)
  - Detailed feedback on each of the four criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.
  - Specific suggestions for improvement for each criterion.
  - Explicit scores for each of the four criteria (0-9).
  - Your response should adhere strictly to the JSON schema that represents the 'IELTSSpeakingAIEvaluation' interface.
  Consider the nuances of spoken English.
  `;
  return prompt;
};

export const generateTOEFLWritingPrompt = (
  userAnswer: string,
  taskType: 'independent' | 'integrated',
  questionContent: string, // Includes reading passage and/or listening lecture details for integrated
  rubric: string
): string => {
  let prompt = `You are an expert TOEFL rater. Evaluate the following response based on the provided TOEFL Writing rubric.`;
  
  if (taskType === 'independent') {
    prompt += ` This is an Independent Writing task, requiring an essay expressing and supporting an opinion on a topic.`;
  } else { // Integrated
    prompt += ` This is an Integrated Writing task, where the candidate had to summarize and synthesize information from a reading passage and a listening lecture.`;
  }

  prompt += `
  
  **Question/Prompt:**
  ${questionContent}
  
  **User's Response:**
  ${userAnswer}
  
  **TOEFL Writing Rubric:**
  ${rubric}
  
  Provide a comprehensive evaluation in JSON format based on the rubric, focusing on:
  - An overall score (0-5 scale)
  - Detailed feedback on Development, Organization, and Language Use.
  - Specific suggestions for improvement.
  - Explicit scores for Development, Organization, and Language Use (0-5).
  - Your response should adhere strictly to the JSON schema that represents the 'TOEFLWritingAIEvaluation' interface.
  `;
  return prompt;
};

export const generateTOEFLSpeakingPrompt = (
  transcription: string,
  taskType: 'independent' | 'integrated', // TOEFL speaking has different task types
  questionContent: string, // Includes reading passage and/or listening lecture details for integrated
  rubric: string
): string => {
  let prompt = `You are an expert TOEFL rater. Evaluate the following speech response based on the provided TOEFL Speaking rubric.`;

  if (taskType === 'independent') {
    prompt += ` This is an Independent Speaking task, requiring the candidate to speak about a familiar topic or express personal opinion.`;
  } else { // Integrated
    prompt += ` This is an Integrated Speaking task, requiring the candidate to synthesize information from various sources (reading, listening) and then speak about it.`;
  }

  prompt += `
  
  **Question/Prompt (and possibly context like reading/listening summary):**
  ${questionContent}
  
  **User's Transcribed Speaking Response:**
  ${transcription}
  
  **TOEFL Speaking Rubric:**
  ${rubric}
  
  Provide a comprehensive evaluation in JSON format based on the rubric, focusing on:
  - An overall score (0-4 scale)
  - Detailed feedback on Delivery, Language Use, and Topic Development.
  - Specific suggestions for improvement.
  - Explicit scores for Delivery, Language Use, and Topic Development (0-4).
  - Your response should adhere strictly to the JSON schema that represents the 'TOEFLSpeakingAIEvaluation' interface.
  Consider the clarity, coherence, and accuracy of spoken English.
  `;
  return prompt;
};

export const generateDefaultRubric = (examType: ExamType, skillType: SkillType): string => {
  // This is a placeholder for actual rubrics. In a real application, these would be
  // stored in a database or comprehensive configuration and retrieved dynamically.
  // For demonstration, these are simplified.
  if (examType === 'ielts') {
    if (skillType === 'writing') {
      return `
      **IELTS Writing Task 1/2 Rubric Overview:**
      - Task Achievement/Response: How well the essay addresses all parts of the prompt.
      - Coherence and Cohesion: How well the essay is organized and linked.
      - Lexical Resource: Range and accuracy of vocabulary.
      - Grammatical Range and Accuracy: Range and accuracy of grammatical structures.
      `;
    } else if (skillType === 'speaking') {
      return `
      **IELTS Speaking Rubric Overview:**
      - Fluency and Coherence: Ability to speak at length with appropriate pausing and logical linking.
      - Lexical Resource: Range and accuracy of vocabulary for the topic.
      - Grammatical Range and Accuracy: Range and accuracy of grammatical structures.
      - Pronunciation: Clarity of individual sounds and features of connected speech.
      `;
    }
  } else if (examType === 'toefl') {
    if (skillType === 'writing') {
      return `
      **TOEFL Writing Rubric Overview (Independent/Integrated):**
      - Development: How well the ideas are developed and supported.
      - Organization: Clarity and logical flow of the essay.
      - Language Use: Grammar, vocabulary, and sentence structure.
      `;
    } else if (skillType === 'speaking') {
      return `
      **TOEFL Speaking Rubric Overview (Independent/Integrated):**
      - Delivery: Clarity of speech, rhythm, and intonation.
      - Language Use: Effective use of vocabulary and grammar.
      - Topic Development: Completeness and coherence of the response.
      `;
    }
  }
  return "No specific rubric found for this exam type and skill. Use general English evaluation criteria.";
};