# OpenEnglishTutor API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "error": string,
  "details": object
}
```

## Endpoints

### Health Check

#### GET /health
Check API server health and database connectivity.

**Response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "preferredLanguage": "en",
      "createdAt": "2024-01-27T10:30:00.000Z",
      "updatedAt": "2024-01-27T10:30:00.000Z"
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  },
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400` - Validation failed or user already exists
- `500` - Registration failed

---

### POST /api/auth/login
Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "preferredLanguage": "en",
      "createdAt": "2024-01-27T10:30:00.000Z",
      "updatedAt": "2024-01-27T10:30:00.000Z"
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `400` - Validation failed
- `401` - Invalid credentials
- `500` - Login failed

---

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

**Error Responses:**
- `400` - Refresh token required
- `401` - Invalid refresh token
- `500` - Token refresh failed

---

### GET /api/auth/profile
Get current user profile with progress data.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "preferredLanguage": "en",
    "createdAt": "2024-01-27T10:30:00.000Z",
    "updatedAt": "2024-01-27T10:30:00.000Z",
    "progress": [
      {
        "id": "progress-id",
        "totalQuestions": 25,
        "correctAnswers": 18,
        "averageScore": 7.2,
        "bestScore": 9.0,
        "examType": {
          "code": "ielts",
          "name": "IELTS"
        },
        "skill": {
          "skillCode": "reading",
          "skillName": "Reading"
        }
      }
    ]
  }
}
```

---

### PUT /api/auth/profile
Update user profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "preferredLanguage": "en"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "preferredLanguage": "en",
    "createdAt": "2024-01-27T10:30:00.000Z",
    "updatedAt": "2024-01-27T10:30:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

---

### POST /api/auth/logout
Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Question Endpoints

All question endpoints require authentication.

### GET /api/questions/next
Get the next question for a user based on exam type and skill.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `examType` (required): `ielts`, `toefl`, or `yds`
- `skillCode` (required): Skill code (e.g., `reading`, `writing`, `listening`, `speaking`, `grammar`, `vocabulary`)
- `difficulty` (optional): `EASY`, `MEDIUM`, or `HARD`

**Example Request:**
```
GET /api/questions/next?examType=ielts&skillCode=reading&difficulty=MEDIUM
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "question": {
      "id": "question-id-123",
      "examTypeId": "exam-type-id",
      "skillId": "skill-id",
      "questionType": "MULTIPLE_CHOICE",
      "difficultyLevel": "MEDIUM",
      "title": "IELTS Reading Comprehension - Climate Change",
      "content": "Read the following passage and answer the question...",
      "instructions": "Choose the best answer from the options below.",
      "options": {
        "A": "Natural weather variations",
        "B": "Increased greenhouse gases from fossil fuels",
        "C": "Solar radiation changes",
        "D": "Volcanic activity"
      },
      "audioUrl": null,
      "imageUrl": null,
      "timeLimit": 300,
      "points": 1,
      "metadata": {
        "passage": "climate_change_basic",
        "skill_focus": "main_idea_identification"
      }
    },
    "timeLimit": 300
  }
}
```

**Error Responses:**
- `400` - Missing required parameters or invalid exam type
- `401` - User not authenticated
- `404` - No questions available
- `500` - Internal server error

---

### POST /api/questions/:id/submit
Submit an answer for evaluation.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**URL Parameters:**
- `id`: Question ID

**Request Body:**
```json
{
  "answer": "B",
  "audioUrl": "https://example.com/audio.mp3",
  "timeSpent": 180
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": "attempt-id-123",
      "isCorrect": true,
      "score": 1.0,
      "feedback": "Correct! You identified the main cause correctly.",
      "suggestions": "Great work on identifying key information.",
      "criteriaScores": null,
      "submittedAt": "2024-01-27T10:30:00.000Z"
    },
    "evaluation": {
      "isCorrect": true,
      "score": 1.0,
      "rawScore": 1.0,
      "feedback": "Correct! You identified the main cause correctly.",
      "suggestions": "Great work on identifying key information.",
      "criteriaScores": null,
      "transcription": null
    },
    "correctAnswer": "B"
  }
}
```

**Error Responses:**
- `400` - Missing answer
- `401` - User not authenticated
- `404` - Question not found
- `500` - Internal server error

---

### GET /api/questions/progress/:examType
Get progress report for a specific exam type.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**URL Parameters:**
- `examType`: `ielts`, `toefl`, or `yds`

**Query Parameters:**
- `skillCode` (optional): Filter by specific skill

**Example Request:**
```
GET /api/questions/progress/ielts?skillCode=reading
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "examType": "ielts",
    "skillCode": "reading",
    "totalQuestions": 25,
    "correctAnswers": 18,
    "accuracy": 0.72,
    "averageScore": 7.2,
    "bestScore": 9.0,
    "timeSpent": 7200,
    "lastActivity": "2024-01-27T10:30:00.000Z",
    "skillBreakdown": [
      {
        "skill": "reading",
        "totalQuestions": 25,
        "correctAnswers": 18,
        "averageScore": 7.2
      }
    ],
    "difficultyBreakdown": [
      {
        "difficulty": "EASY",
        "totalQuestions": 8,
        "correctAnswers": 7,
        "accuracy": 0.875
      },
      {
        "difficulty": "MEDIUM",
        "totalQuestions": 12,
        "correctAnswers": 8,
        "accuracy": 0.667
      },
      {
        "difficulty": "HARD",
        "totalQuestions": 5,
        "correctAnswers": 3,
        "accuracy": 0.6
      }
    ]
  }
}
```

**Error Responses:**
- `400` - Invalid exam type
- `401` - User not authenticated
- `500` - Internal server error

---

## Exam Types and Skills

### Supported Exam Types

#### IELTS (International English Language Testing System)
- **Code**: `ielts`
- **Scoring**: 0-9 band score
- **Skills**:
  - `reading` - Reading Comprehension
  - `listening` - Listening Comprehension
  - `writing` - Writing Tasks
  - `speaking` - Speaking Assessment

#### TOEFL (Test of English as a Foreign Language)
- **Code**: `toefl`
- **Scoring**: 0-120 total score (0-30 per section)
- **Skills**:
  - `reading` - Reading Comprehension
  - `listening` - Listening Comprehension
  - `writing` - Writing Tasks
  - `speaking` - Speaking Assessment

#### YDS (Yabancı Dil Sınavı)
- **Code**: `yds`
- **Scoring**: 0-100 percentage score
- **Skills**:
  - `reading` - Reading Comprehension
  - `grammar` - Grammar & Structure
  - `vocabulary` - Vocabulary

---

## Question Types

- `MULTIPLE_CHOICE` - Multiple choice questions with options A, B, C, D
- `TRUE_FALSE` - True/False/Not Given questions
- `FILL_BLANK` - Fill in the blank questions
- `ESSAY` - Essay writing tasks
- `SPEAKING` - Speaking response tasks
- `MATCHING` - Matching exercises
- `ORDERING` - Ordering/sequencing tasks

---

## Difficulty Levels

- `EASY` - Basic level questions
- `MEDIUM` - Intermediate level questions
- `HARD` - Advanced level questions

---

## Error Codes

- `400` - Bad Request (validation errors, missing parameters)
- `401` - Unauthorized (authentication required or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server-side error)

---

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Window**: 15 minutes
- **Max Requests**: 100 per IP address
- **Headers**: Rate limit information is included in response headers

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get next question (replace TOKEN with actual JWT)
curl -X GET "http://localhost:3001/api/questions/next?examType=ielts&skillCode=reading" \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the API endpoints into Postman
2. Set up environment variables for base URL and tokens
3. Use the authentication endpoints to get tokens
4. Test question endpoints with proper authentication

---

## Development Notes

- All timestamps are in ISO 8601 format (UTC)
- The API supports CORS for cross-origin requests
- Request/response logging is enabled in development mode
- Database connections are pooled for optimal performance
- AI evaluation services are optional and can be disabled for testing