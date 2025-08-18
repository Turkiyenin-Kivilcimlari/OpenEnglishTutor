-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('OBJECTIVE', 'SUBJECTIVE', 'AI_POWERED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY', 'SPEAKING', 'MATCHING', 'ORDERING');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scoring_system" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_skills" (
    "id" TEXT NOT NULL,
    "exam_type_id" TEXT NOT NULL,
    "skill_code" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL,
    "evaluation_type" "EvaluationType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "exam_type_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "difficulty_level" "Difficulty" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "instructions" TEXT,
    "audio_url" TEXT,
    "image_url" TEXT,
    "correct_answer" TEXT,
    "options" JSONB,
    "time_limit" INTEGER NOT NULL DEFAULT 300,
    "points" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "exam_type_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "user_answer" TEXT NOT NULL,
    "audio_url" TEXT,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_correct" BOOLEAN,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "raw_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evaluation_feedback" TEXT,
    "suggestions" TEXT,
    "criteria_scores" JSONB,
    "metadata" JSONB,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exam_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_type_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "earned_points" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION,
    "best_score" DOUBLE PRECISION,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_exam_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria" (
    "id" TEXT NOT NULL,
    "exam_type_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "criteria_name" TEXT NOT NULL,
    "criteria_description" TEXT,
    "max_score" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "exam_types_code_key" ON "exam_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exam_skills_exam_type_id_skill_code_key" ON "exam_skills"("exam_type_id", "skill_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_exam_progress_user_id_exam_type_id_skill_id_key" ON "user_exam_progress"("user_id", "exam_type_id", "skill_id");

-- AddForeignKey
ALTER TABLE "exam_skills" ADD CONSTRAINT "exam_skills_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "exam_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "exam_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exam_progress" ADD CONSTRAINT "user_exam_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exam_progress" ADD CONSTRAINT "user_exam_progress_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exam_progress" ADD CONSTRAINT "user_exam_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "exam_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "exam_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;