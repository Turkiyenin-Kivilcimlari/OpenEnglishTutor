import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  User, 
  Question,
  QuestionAttempt,
  UserExamProgress,
  ExamType,
  SkillType,
  Difficulty
} from '@openenglishttutor/shared';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Redirect to login if needed
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        this.setToken(savedToken);
      }
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Auth endpoints
  async register(data: RegisterData): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.client.post('/api/auth/register', data);
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.token);
      if (response.data.data.refreshToken) {
        localStorage.setItem('refresh_token', response.data.data.refreshToken);
      }
      return response.data.data;
    }
    throw new Error(response.data.error || 'Registration failed');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.client.post('/api/auth/login', credentials);
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.token);
      if (response.data.data.refreshToken) {
        localStorage.setItem('refresh_token', response.data.data.refreshToken);
      }
      return response.data.data;
    }
    throw new Error(response.data.error || 'Login failed');
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response: AxiosResponse<ApiResponse<{ token: string; refreshToken: string }>> = 
      await this.client.post('/api/auth/refresh', { refreshToken });
    
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.token);
      localStorage.setItem('refresh_token', response.data.data.refreshToken);
      return response.data.data.token;
    }
    throw new Error(response.data.error || 'Token refresh failed');
  }

  async getProfile(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.client.get('/api/auth/profile');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch profile');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.client.put('/api/auth/profile', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update profile');
  }

  // Question endpoints
  async getNextQuestion(
    examType: ExamType, 
    skillCode: SkillType, 
    difficulty?: Difficulty
  ): Promise<{ question: Question; timeLimit: number }> {
    const params = new URLSearchParams({
      examType,
      skillCode,
      ...(difficulty && { difficulty }),
    });

    const response: AxiosResponse<ApiResponse<{ question: Question; timeLimit: number }>> = 
      await this.client.get(`/api/questions/next?${params}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch question');
  }

  async submitAnswer(
    questionId: string, 
    answer: string, 
    timeSpent: number, 
    audioUrl?: string
  ): Promise<{
    attempt: QuestionAttempt;
    evaluation: any;
    correctAnswer: string;
  }> {
    const response: AxiosResponse<ApiResponse<{
      attempt: QuestionAttempt;
      evaluation: any;
      correctAnswer: string;
    }>> = await this.client.post(`/api/questions/${questionId}/submit`, {
      answer,
      timeSpent,
      audioUrl,
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to submit answer');
  }

  async getProgress(examType: ExamType, skillCode?: SkillType): Promise<UserExamProgress[]> {
    const params = skillCode ? `?skillCode=${skillCode}` : '';
    const response: AxiosResponse<ApiResponse<UserExamProgress[]>> = 
      await this.client.get(`/api/questions/progress/${examType}${params}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch progress');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };