import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const checkBackendHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export interface DsaTopicProgress {
  topic: string;
  required: boolean;
  priority: string;
  expectedDifficulty: string;
  recommendedQuestions: number;
  covered: boolean;
  completed: number;
  questions: { questionId: string; difficulty: string; completedAt: string }[];
}

export interface DsaProfile {
  readinessScore: number;
  totals: {
    completed: number;
    topicsCovered: number;
    requiredTopics: number;
    preferredTopics: number;
    requiredCovered: number;
    preferredCovered: number;
    recommendedVolume: number;
    difficultyScore: number;
    volumeScore: number;
  };
  byTopic: DsaTopicProgress[];
  coveredTopics: string[];
  uncoveredRequiredTopics: string[];
  weakTopics: {
    topic: string;
    priority: string;
    expectedDifficulty: string;
    completed: number;
    recommendedQuestions: number;
  }[];
  priorityGaps: {
    topic: string;
    priority: string;
    expectedDifficulty: string;
    recommendedQuestions: number;
  }[];
  recommendedPractice: {
    topic: string;
    reason: string;
    priority: string;
    expectedDifficulty: string;
    recommendedQuestions: number;
    question: { id: string; title: string; link: string; difficulty: string } | null;
  }[];
  completedQuestionIds: string[];
  lastSyncedAt: string | null;
}

export const getDsaProgress = async (): Promise<DsaProfile> => {
  const response = await api.get("/dsa/progress");
  return response.data;
};

export const updateDsaProgress = async (
  questionId: number | string,
  completed: boolean
): Promise<DsaProfile> => {
  const response = await api.put("/dsa/progress", { questionId, completed });
  return response.data;
};

export const syncDsaProgress = async (
  questionIds: (number | string)[]
): Promise<DsaProfile & { addedCount: number }> => {
  const response = await api.post("/dsa/progress/sync", { questionIds });
  return response.data;
};

export interface CompanyOption {
  name: string;
  roles: {
    role: string;
    requiredSkills: string[];
    preferredSkills: string[];
    dsa: {
      requiredTopics: string[];
      preferredTopics: string[];
      expectedDifficulty: string;
      recommendedVolume: number;
    };
    coreCS: string[];
    resources: string[];
  }[];
}

export interface LearningResource {
  title: string;
  website: string;
  url: string;
  topics: string[];
  difficulty: string;
}

export interface CompanyPrepAnalysis {
  id: string;
  company: string;
  role: string;
  source: string;
  catalogVersion: number;
  overallMatchScore: number;
  technicalSkillsScore: number;
  dsaReadinessScore: number;
  coreCSScore: number;
  weights: { technical: number; dsa: number; coreCS: number };
  summary: string;
  strengths: string[];
  gaps: string[];
  highPriorityGaps: string[];
  mediumPriorityGaps: string[];
  lowPriorityGaps: string[];
  skillMatch: {
    matchedRequiredSkills: string[];
    missingRequiredSkills: string[];
    matchedPreferredSkills: string[];
    missingPreferredSkills: string[];
  };
  dsa: {
    score: number;
    strengths: string[];
    gaps: string[];
    focusTopics: string[];
    expectedDifficulty: string | null;
    recommendedVolume: number | null;
    requiredTopics: string[];
    preferredTopics: string[];
  };
  coreCS: { score: number; matchedTopics: string[]; gaps: string[] };
  focusTopics: string[];
  resources: LearningResource[];
  strategy: string | null;
  createdAt: string;
}

export const getCompanyOptions = async (): Promise<{
  companies: CompanyOption[];
  catalogVersion: number;
}> => {
  const response = await api.get("/company/options");
  return response.data;
};

export const analyzeCompanyPrep = async (payload: {
  company: string;
  role: string;
  skills?: string[];
}): Promise<CompanyPrepAnalysis> => {
  const response = await api.post("/company/analyze", payload);
  return response.data;
};

export const listCompanyAnalyses = async (): Promise<{
  analyses: CompanyPrepAnalysis[];
}> => {
  const response = await api.get("/company/analyses");
  return response.data;
};

export interface MockInterviewOptions {
  types: string[];
  difficulties: string[];
  roles: string[];
  companies: string[];
  hrTopics: string[];
  totalQuestionsOptions: number[];
  catalogVersion: number;
}

export interface InterviewEvaluation {
  score: number | null;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  missingPoints: string[];
  idealAnswerPoints: string[];
  detectedTopics: string[];
  practiceTopics: string[];
  source: string | null;
  evaluatedAt: string | null;
}

export interface InterviewQuestion {
  id: string;
  questionText: string;
  topic: string | null;
  difficulty: string | null;
  reason: string;
  source: string;
  answerText: string;
  isSkipped: boolean;
  answeredAt: string | null;
  evaluation: InterviewEvaluation | null;
  evaluationFailed: boolean;
}

export interface TopicPerformance {
  topic: string;
  asked: number;
  evaluated: number;
  avgScore: number;
  lowCount: number;
}

export interface InterviewSession {
  id: string;
  interviewType: string;
  role: string;
  company: string | null;
  difficulty: string | null;
  status: string;
  focusTopics: string[];
  totalQuestions: number;
  currentIndex: number;
  questions: InterviewQuestion[];
  overallScore: number | null;
  topicPerformance: TopicPerformance[];
  sessionStrengths: string[];
  weakTopics: string[];
  practiceTopics: string[];
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface InterviewSessionSummary {
  id: string;
  interviewType: string;
  role: string;
  company: string | null;
  difficulty: string | null;
  status: string;
  focusTopics: string[];
  totalQuestions: number;
  answeredCount: number;
  overallScore: number | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export const getMockInterviewOptions = async (): Promise<MockInterviewOptions> => {
  const response = await api.get("/mock-interview/options");
  return response.data;
};

export const startMockInterview = async (payload: {
  interviewType: string;
  role: string;
  company?: string | null;
  difficulty?: string | null;
  totalQuestions?: number;
}): Promise<{ message: string; session: InterviewSession }> => {
  const response = await api.post("/mock-interview/start", payload);
  return response.data;
};

export const listMockInterviewSessions = async (): Promise<{
  sessions: InterviewSessionSummary[];
}> => {
  const response = await api.get("/mock-interview/sessions");
  return response.data;
};

export const getMockInterviewSession = async (
  id: string
): Promise<{ session: InterviewSession }> => {
  const response = await api.get(`/mock-interview/sessions/${id}`);
  return response.data;
};

export const submitMockInterviewAnswer = async (
  id: string,
  payload: { answerText?: string; skipped?: boolean }
): Promise<{
  message: string;
  session: InterviewSession;
  answered: InterviewQuestion;
}> => {
  const response = await api.post(
    `/mock-interview/sessions/${id}/submit-answer`,
    payload
  );
  return response.data;
};

export const completeMockInterview = async (
  id: string
): Promise<{ message: string; session: InterviewSession }> => {
  const response = await api.post(`/mock-interview/sessions/${id}/complete`, {});
  return response.data;
};

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  skills: string[];
  targetRoles: string[];
}

export interface InterestedCompany {
  company: string;
  roles: string[];
  catalog: string[];
}

export interface WeakTopicEntry {
  topic: string;
  score: number;
  sources: string[];
  priority: string;
}

export interface RecommendedAction {
  action: string;
  detail: string;
  priority: string;
  source: string;
}

export interface LatestScores {
  resume: { score: number; source: string; analyzedAt: string } | null;
  dsaReadiness: { score: number } | null;
  companyPrep: {
    score: number;
    company: string;
    role: string;
    analyzedAt: string;
  } | null;
  mockInterview: {
    score: number | null;
    interviewType: string;
    completedAt: string;
  } | null;
}

export interface ActivityEventEntry {
  id: string;
  type: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface StreakInfo {
  current: number;
  longest: number;
}

export interface ProfileSummary {
  user: ProfileUser;
  interestedCompanies: InterestedCompany[];
  latestScores: LatestScores;
  weakTopics: WeakTopicEntry[];
  recommendedActions: RecommendedAction[];
  streak: StreakInfo;
  recentActivity: ActivityEventEntry[];
  counts: {
    dsaCompleted: number;
    mockInterviewsCompleted: number;
    companyPrepsCompleted: number;
    resumeAnalyses: number;
  };
  hasData: boolean;
}

export interface PerformanceHistory {
  mockInterviews: {
    id: string;
    date: string;
    interviewType: string;
    role: string;
    company: string | null;
    difficulty: string | null;
    overallScore: number | null;
    answeredCount: number;
    totalQuestions: number;
  }[];
  companyPrep: {
    id: string;
    date: string;
    company: string;
    role: string;
    overallMatchScore: number;
  }[];
  resumeAnalyses: {
    id: string;
    date: string;
    atsScore: number;
    filename: string;
  }[];
}

export const getProfileSummary = async (): Promise<ProfileSummary> => {
  const response = await api.get("/profile/summary");
  return response.data;
};

export const getProfileActivity = async (): Promise<{
  streak: StreakInfo;
  events: ActivityEventEntry[];
}> => {
  const response = await api.get("/profile/activity");
  return response.data;
};

export const getProfilePerformance = async (): Promise<PerformanceHistory> => {
  const response = await api.get("/profile/performance");
  return response.data;
};

export const updateProfile = async (payload: {
  name?: string;
  skills?: string[];
}): Promise<{ message: string; user: ProfileUser }> => {
  const response = await api.patch("/profile", payload);
  return response.data;
};

export const addInterestedCompany = async (payload: {
  company: string;
  role?: string;
}): Promise<{
  message: string;
  interestedCompanies: InterestedCompany[];
  targetRoles: string[];
  skills: string[];
}> => {
  const response = await api.post("/profile/companies", payload);
  return response.data;
};

export const removeInterestedCompany = async (company: string): Promise<{
  message: string;
  interestedCompanies: InterestedCompany[];
  targetRoles: string[];
  skills: string[];
}> => {
  const response = await api.delete(`/profile/companies/${encodeURIComponent(company)}`);
  return response.data;
};

export const addTargetRole = async (role: string): Promise<{
  message: string;
  interestedCompanies: InterestedCompany[];
  targetRoles: string[];
  skills: string[];
}> => {
  const response = await api.post("/profile/roles", { role });
  return response.data;
};

export const removeTargetRole = async (role: string): Promise<{
  message: string;
  interestedCompanies: InterestedCompany[];
  targetRoles: string[];
  skills: string[];
}> => {
  const response = await api.delete(`/profile/roles/${encodeURIComponent(role)}`);
  return response.data;
};

export interface CareerRecommendation {
  role: string;
  fitScore: number;
  skillsToLearn: string[];
  interviewTopics: string[];
  suggestedProjects: string[];
}

export interface CareerRecommendationsResult {
  recommendations: CareerRecommendation[];
  extractedSkillSummary: {
    atsScore: number;
    foundSkills: string[];
    missingSkills: string[];
  };
}

export interface CareerGuidanceResult {
  guidance: string;
  recommendations: CareerRecommendation[];
}

export interface CareerGuidancePayload {
  resumeText?: string;
  targetRole?: string;
  skills?: string[];
}

export const getCareerRecommendations = async (
  payload: CareerGuidancePayload
): Promise<CareerRecommendationsResult> => {
  const response = await api.post("/career/recommend", payload);
  return response.data;
};

export const getCareerGuidance = async (
  payload: CareerGuidancePayload
): Promise<CareerGuidanceResult> => {
  const response = await api.post("/career/guidance", payload);
  return response.data;
};

export default api;
