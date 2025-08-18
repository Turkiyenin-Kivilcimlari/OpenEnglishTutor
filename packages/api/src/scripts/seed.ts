import { PrismaClient } from '@prisma/client';
import { EvaluationType, QuestionType, Difficulty } from '@openenglishtutor/shared/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create exam types
  const examTypes = await Promise.all([
    prisma.examType.upsert({
      where: { code: 'ielts' },
      update: {},
      create: {
        code: 'ielts',
        name: 'IELTS (International English Language Testing System)',
        description: 'International English Language Testing System for academic and general training purposes',
        scoringSystem: {
          minScore: 0,
          maxScore: 9,
          bands: [
            { score: 9, description: 'Expert user' },
            { score: 8, description: 'Very good user' },
            { score: 7, description: 'Good user' },
            { score: 6, description: 'Competent user' },
            { score: 5, description: 'Modest user' },
            { score: 4, description: 'Limited user' },
            { score: 3, description: 'Extremely limited user' },
            { score: 2, description: 'Intermittent user' },
            { score: 1, description: 'Non-user' }
          ]
        },
        skills: {
          reading: { name: 'Reading', maxScore: 9 },
          listening: { name: 'Listening', maxScore: 9 },
          writing: { name: 'Writing', maxScore: 9 },
          speaking: { name: 'Speaking', maxScore: 9 }
        }
      }
    }),
    prisma.examType.upsert({
      where: { code: 'toefl' },
      update: {},
      create: {
        code: 'toefl',
        name: 'TOEFL (Test of English as a Foreign Language)',
        description: 'Test of English as a Foreign Language for academic purposes',
        scoringSystem: {
          minScore: 0,
          maxScore: 120,
          sections: {
            reading: { minScore: 0, maxScore: 30 },
            listening: { minScore: 0, maxScore: 30 },
            speaking: { minScore: 0, maxScore: 30 },
            writing: { minScore: 0, maxScore: 30 }
          }
        },
        skills: {
          reading: { name: 'Reading', maxScore: 30 },
          listening: { name: 'Listening', maxScore: 30 },
          writing: { name: 'Writing', maxScore: 30 },
          speaking: { name: 'Speaking', maxScore: 30 }
        }
      }
    }),
    prisma.examType.upsert({
      where: { code: 'yds' },
      update: {},
      create: {
        code: 'yds',
        name: 'YDS (Yabancı Dil Sınavı)',
        description: 'Turkish Foreign Language Exam for academic and professional purposes',
        scoringSystem: {
          minScore: 0,
          maxScore: 100,
          passingScore: 60
        },
        skills: {
          reading: { name: 'Reading Comprehension', maxScore: 40 },
          grammar: { name: 'Grammar & Vocabulary', maxScore: 40 },
          vocabulary: { name: 'Vocabulary', maxScore: 20 }
        }
      }
    })
  ]);

  console.log('✅ Exam types created');

  // Create exam skills for each exam type
  const examSkills = [];

  // IELTS Skills
  const ieltsSkills = await Promise.all([
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[0].id, skillCode: 'reading' } },
      update: {},
      create: {
        examTypeId: examTypes[0].id,
        skillCode: 'reading',
        skillName: 'Reading',
        maxScore: 9,
        evaluationType: EvaluationType.OBJECTIVE
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[0].id, skillCode: 'listening' } },
      update: {},
      create: {
        examTypeId: examTypes[0].id,
        skillCode: 'listening',
        skillName: 'Listening',
        maxScore: 9,
        evaluationType: EvaluationType.OBJECTIVE
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[0].id, skillCode: 'writing' } },
      update: {},
      create: {
        examTypeId: examTypes[0].id,
        skillCode: 'writing',
        skillName: 'Writing',
        maxScore: 9,
        evaluationType: EvaluationType.AI_POWERED
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[0].id, skillCode: 'speaking' } },
      update: {},
      create: {
        examTypeId: examTypes[0].id,
        skillCode: 'speaking',
        skillName: 'Speaking',
        maxScore: 9,
        evaluationType: EvaluationType.AI_POWERED
      }
    })
  ]);

  // TOEFL Skills
  const toeflSkills = await Promise.all([
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[1].id, skillCode: 'reading' } },
      update: {},
      create: {
        examTypeId: examTypes[1].id,
        skillCode: 'reading',
        skillName: 'Reading',
        maxScore: 30,
        evaluationType: EvaluationType.OBJECTIVE
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[1].id, skillCode: 'listening' } },
      update: {},
      create: {
        examTypeId: examTypes[1].id,
        skillCode: 'listening',
        skillName: 'Listening',
        maxScore: 30,
        evaluationType: EvaluationType.OBJECTIVE
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[1].id, skillCode: 'writing' } },
      update: {},
      create: {
        examTypeId: examTypes[1].id,
        skillCode: 'writing',
        skillName: 'Writing',
        maxScore: 30,
        evaluationType: EvaluationType.AI_POWERED
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[1].id, skillCode: 'speaking' } },
      update: {},
      create: {
        examTypeId: examTypes[1].id,
        skillCode: 'speaking',
        skillName: 'Speaking',
        maxScore: 30,
        evaluationType: EvaluationType.AI_POWERED
      }
    })
  ]);

  // YDS Skills
  const ydsSkills = await Promise.all([
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[2].id, skillCode: 'reading' } },
      update: {},
      create: {
        examTypeId: examTypes[2].id,
        skillCode: 'reading',
        skillName: 'Reading Comprehension',
        maxScore: 40,
        evaluationType: EvaluationType.OBJECTIVE
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[2].id, skillCode: 'grammar' } },
      update: {},
      create: {
        examTypeId: examTypes[2].id,
        skillCode: 'grammar',
        skillName: 'Grammar & Structure',
        maxScore: 40,
        evaluationType: EvaluationType.OBJECTIVE
      }
    }),
    prisma.examSkill.upsert({
      where: { examTypeId_skillCode: { examTypeId: examTypes[2].id, skillCode: 'vocabulary' } },
      update: {},
      create: {
        examTypeId: examTypes[2].id,
        skillCode: 'vocabulary',
        skillName: 'Vocabulary',
        maxScore: 20,
        evaluationType: EvaluationType.OBJECTIVE
      }
    })
  ]);

  examSkills.push(...ieltsSkills, ...toeflSkills, ...ydsSkills);
  console.log('✅ Exam skills created');

  // Create sample questions for each exam type
  
  // IELTS Reading Questions
  await prisma.question.createMany({
    data: [
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[0].id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficultyLevel: Difficulty.MEDIUM,
        title: 'IELTS Reading Comprehension - Climate Change',
        content: `Read the following passage and answer the question:

Climate change is one of the most pressing issues of our time. The Earth's average temperature has risen by approximately 1.1 degrees Celsius since the late 19th century, with most of the warming occurring in the past 40 years. This warming is primarily attributed to increased levels of greenhouse gases in the atmosphere, particularly carbon dioxide from burning fossil fuels.

The effects of climate change are already visible around the world. Ice sheets are shrinking, glaciers are retreating, and sea levels are rising. Weather patterns are becoming more extreme, with more frequent heatwaves, droughts, and intense storms.

Question: According to the passage, what is the primary cause of recent climate change?`,
        instructions: 'Choose the best answer from the options below.',
        options: {
          A: 'Natural weather variations',
          B: 'Increased greenhouse gases from fossil fuels',
          C: 'Solar radiation changes',
          D: 'Volcanic activity'
        },
        correctAnswer: 'B',
        timeLimit: 300,
        points: 1,
        metadata: {
          passage: 'climate_change_basic',
          skill_focus: 'main_idea_identification'
        }
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[0].id,
        questionType: QuestionType.TRUE_FALSE,
        difficultyLevel: Difficulty.EASY,
        title: 'IELTS Reading - True/False/Not Given',
        content: `Read the statement and decide if it is True, False, or Not Given based on the passage above:

Statement: "The Earth's temperature has increased by more than 2 degrees Celsius since the 19th century."`,
        instructions: 'Choose True, False, or Not Given.',
        options: {
          A: 'True',
          B: 'False',
          C: 'Not Given'
        },
        correctAnswer: 'B',
        timeLimit: 180,
        points: 1
      }
    ]
  });

  // IELTS Writing Question
  await prisma.question.create({
    data: {
      examTypeId: examTypes[0].id,
      skillId: ieltsSkills[2].id,
      questionType: QuestionType.ESSAY,
      difficultyLevel: Difficulty.HARD,
      title: 'IELTS Writing Task 2 - Technology and Education',
      content: `Some people believe that technology has made learning easier and more accessible, while others argue that it has made students lazy and less capable of deep thinking.

Discuss both views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.`,
      instructions: 'Write at least 250 words. You should spend about 40 minutes on this task.',
      timeLimit: 2400,
      points: 25,
      metadata: {
        task_type: 'opinion_essay',
        word_limit: 250,
        assessment_criteria: ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']
      }
    }
  });

  // TOEFL Reading Questions
  await prisma.question.createMany({
    data: [
      {
        examTypeId: examTypes[1].id,
        skillId: toeflSkills[0].id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficultyLevel: Difficulty.HARD,
        title: 'TOEFL Reading - Academic Passage',
        content: `The Industrial Revolution, which began in Britain in the late 18th century, marked a fundamental shift in human society. This period saw the transition from manual labor and handicrafts to mechanized manufacturing. The invention of the steam engine by James Watt in 1769 was particularly significant, as it provided a reliable source of power that was not dependent on natural forces like wind or water.

The revolution had profound social and economic consequences. Urban centers grew rapidly as people moved from rural areas to work in factories. This urbanization led to new social problems, including overcrowding, pollution, and poor working conditions. However, it also resulted in increased productivity and economic growth.

Question: What can be inferred about the steam engine's impact on manufacturing?`,
        instructions: 'Select the best answer.',
        options: {
          A: 'It made manufacturing completely independent of natural resources',
          B: 'It provided more consistent power than natural forces',
          C: 'It eliminated the need for manual labor entirely',
          D: 'It was only useful in urban areas'
        },
        correctAnswer: 'B',
        timeLimit: 420,
        points: 1,
        metadata: {
          passage_type: 'historical',
          skill_focus: 'inference'
        }
      }
    ]
  });

  // TOEFL Speaking Question
  await prisma.question.create({
    data: {
      examTypeId: examTypes[1].id,
      skillId: toeflSkills[3].id,
      questionType: QuestionType.SPEAKING,
      difficultyLevel: Difficulty.MEDIUM,
      title: 'TOEFL Speaking Task 1 - Personal Preference',
      content: `Some people prefer to work in a team environment, while others prefer to work independently. Which do you prefer and why?

Use specific reasons and examples to support your answer.`,
      instructions: 'You have 15 seconds to prepare and 45 seconds to speak.',
      timeLimit: 60,
      points: 4,
      metadata: {
        task_type: 'personal_preference',
        preparation_time: 15,
        response_time: 45,
        assessment_criteria: ['delivery', 'language_use', 'topic_development']
      }
    }
  });

  // YDS Questions
  await prisma.question.createMany({
    data: [
      {
        examTypeId: examTypes[2].id,
        skillId: ydsSkills[1].id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficultyLevel: Difficulty.MEDIUM,
        title: 'YDS Grammar - Conditional Sentences',
        content: `Complete the sentence with the most appropriate option:

"If the weather _______ better tomorrow, we _______ go on a picnic."`,
        instructions: 'Choose the correct option.',
        options: {
          A: 'is / will',
          B: 'will be / go',
          C: 'was / would',
          D: 'were / will'
        },
        correctAnswer: 'A',
        timeLimit: 120,
        points: 1,
        metadata: {
          grammar_point: 'first_conditional',
          difficulty: 'intermediate'
        }
      },
      {
        examTypeId: examTypes[2].id,
        skillId: ydsSkills[2].id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficultyLevel: Difficulty.HARD,
        title: 'YDS Vocabulary - Academic Words',
        content: `Choose the word that best completes the sentence:

"The research findings were so _______ that they challenged the existing theories in the field."`,
        instructions: 'Select the most appropriate word.',
        options: {
          A: 'conventional',
          B: 'revolutionary',
          C: 'traditional',
          D: 'conservative'
        },
        correctAnswer: 'B',
        timeLimit: 90,
        points: 1,
        metadata: {
          vocabulary_level: 'advanced',
          word_type: 'academic'
        }
      },
      {
        examTypeId: examTypes[2].id,
        skillId: ydsSkills[0].id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficultyLevel: Difficulty.HARD,
        title: 'YDS Reading Comprehension - Scientific Text',
        content: `Read the passage and answer the question:

Artificial intelligence (AI) has become increasingly sophisticated in recent years, with applications ranging from medical diagnosis to autonomous vehicles. Machine learning algorithms can now process vast amounts of data and identify patterns that would be impossible for humans to detect. However, concerns about AI's impact on employment and privacy continue to grow.

Question: What is the main concern mentioned about AI in the passage?`,
        instructions: 'Choose the best answer.',
        options: {
          A: 'Its complexity in medical applications',
          B: 'Its inability to process large datasets',
          C: 'Its potential effects on jobs and privacy',
          D: 'Its limitations in pattern recognition'
        },
        correctAnswer: 'C',
        timeLimit: 240,
        points: 2,
        metadata: {
          passage_type: 'scientific',
          skill_focus: 'main_idea'
        }
      }
    ]
  });

  // Create evaluation criteria
  await prisma.evaluationCriteria.createMany({
    data: [
      // IELTS Writing Criteria
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[2].id,
        criteriaName: 'Task Response',
        criteriaDescription: 'How well the candidate addresses the task requirements',
        maxScore: 9,
        weight: 0.25
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[2].id,
        criteriaName: 'Coherence and Cohesion',
        criteriaDescription: 'Organization and logical flow of ideas',
        maxScore: 9,
        weight: 0.25
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[2].id,
        criteriaName: 'Lexical Resource',
        criteriaDescription: 'Range and accuracy of vocabulary',
        maxScore: 9,
        weight: 0.25
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[2].id,
        criteriaName: 'Grammatical Range and Accuracy',
        criteriaDescription: 'Range and accuracy of grammatical structures',
        maxScore: 9,
        weight: 0.25
      },
      // IELTS Speaking Criteria
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[3].id,
        criteriaName: 'Fluency and Coherence',
        criteriaDescription: 'Ability to speak fluently and coherently',
        maxScore: 9,
        weight: 0.25
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[3].id,
        criteriaName: 'Lexical Resource',
        criteriaDescription: 'Range and accuracy of vocabulary in speech',
        maxScore: 9,
        weight: 0.25
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[3].id,
        criteriaName: 'Grammatical Range and Accuracy',
        criteriaDescription: 'Range and accuracy of grammar in speech',
        maxScore: 9,
        weight: 0.25
      },
      {
        examTypeId: examTypes[0].id,
        skillId: ieltsSkills[3].id,
        criteriaName: 'Pronunciation',
        criteriaDescription: 'Clarity and accuracy of pronunciation',
        maxScore: 9,
        weight: 0.25
      }
    ]
  });

  console.log('✅ Sample questions and evaluation criteria created');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });