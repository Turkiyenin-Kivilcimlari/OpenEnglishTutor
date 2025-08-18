import { IELTSService } from './exam-types/IELTSService';
import { TOEFLService } from './exam-types/TOEFLService';
import { YDSService } from './exam-types/YDSService';

// Local type definition
type ExamType = 'ielts' | 'toefl' | 'yds';

// Base interface for all exam services
export interface ExamService {
  getNextQuestion(userId: string, skillCode: string, difficulty?: string): Promise<any>;
  evaluateAnswer(question: any, answer: string, audioUrl?: string): Promise<any>;
  calculateScore(attempts: any[]): Promise<number>;
  getProgressReport(userId: string, skillCode?: string): Promise<any>;
  getTimeLimitForSkill?(skillCode: string): number;
  getValidSkills?(): string[];
}

// Factory class for creating exam services
export class ExamServiceFactory {
  private static instances: Map<ExamType, ExamService> = new Map();

  static createService(examType: ExamType): ExamService {
    // Use singleton pattern to reuse service instances
    if (this.instances.has(examType)) {
      return this.instances.get(examType)!;
    }

    let service: ExamService;

    switch (examType.toLowerCase() as ExamType) {
      case 'ielts':
        service = new IELTSService();
        break;
      case 'toefl':
        service = new TOEFLService();
        break;
      case 'yds':
        service = new YDSService();
        break;
      default:
        throw new Error(`Unsupported exam type: ${examType}`);
    }

    this.instances.set(examType, service);
    return service;
  }

  static getSupportedExamTypes(): ExamType[] {
    return ['ielts', 'toefl', 'yds'];
  }

  static isValidExamType(examType: string): examType is ExamType {
    return this.getSupportedExamTypes().includes(examType as ExamType);
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}

export default ExamServiceFactory;