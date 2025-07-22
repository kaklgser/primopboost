import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Download, TrendingUp, Target, Award, User, Briefcase, AlertCircle, CheckCircle, Loader2, RefreshCw, Zap, Plus, Eye, EyeOff, Crown, Calendar, Clock, Users, Star, ArrowRight, Shield, Settings, LogOut, Menu, X, Upload, BarChart3, Lightbulb } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { InputSection } from './InputSection';
import { ResumePreview } from './ResumePreview';
import { ExportButtons } from './ExportButtons';
import { ComprehensiveAnalysis } from './ComprehensiveAnalysis';
import { ProjectAnalysisModal } from './ProjectAnalysisModal';
import { MobileOptimizedInterface } from './MobileOptimizedInterface';
import { ProjectEnhancement } from './ProjectEnhancement';
import { SubscriptionPlans } from './payment/SubscriptionPlans';
import { SubscriptionStatus } from './payment/SubscriptionStatus';
import { MissingSectionsModal } from './MissingSectionsModal';
import { parseFile } from '../utils/fileParser';
import { optimizeResume } from '../services/geminiService';
import { getMatchScore, generateBeforeScore, generateAfterScore, getDetailedResumeScore, reconstructResumeText } from '../services/scoringService';
import { analyzeProjectAlignment } from '../services/projectAnalysisService';
import { advancedProjectAnalyzer } from '../services/advancedProjectAnalyzer';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { ResumeData, UserType, MatchScore, DetailedScore } from '../types/resume';

interface ResumeOptimizerProps {
  isAuthenticated: boolean;
  onShowAuth: () => void;
}

const ResumeOptimizer: React.FC<ResumeOptimizerProps> = ({
  isAuthenticated,
  onShowAuth
}) => {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [userType, setUserType] = useState<UserType>('experienced');
  const [optimizedResume, setOptimizedResume] = useState<ResumeData | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showProjectMismatch, setShowProjectMismatch] = useState(false);
  const [showProjectOptions, setShowProjectOptions] = useState(false);
  const [showManualProjectAdd, setShowManualProjectAdd] = useState(false);
  const [lowScoringProjects, setLowScoringProjects] = useState<any[]>([]);
  const [initialResumeScore, setInitialResumeScore] = useState<DetailedScore | null>(null);
  const [finalResumeScore, setFinalResumeScore] = useState<DetailedScore | null>(null);
  const [parsedResumeData, setParsedResumeData] = useState<ResumeData | null>(null);
  const [manualProject, setManualProject] = useState({
    title: '',
    startDate: '',
    endDate: '',
    techStack: [] as string[],
    oneLiner: ''
  });
  const [newTechStack, setNewTechStack] = useState('');
  const [beforeScore, setBeforeScore] = useState<MatchScore | null>(null);
  const [afterScore, setAfterScore] = useState<MatchScore | null>(null);
  const [changedSections, setChangedSections] = useState<string[]>([]);
  const [showMobileInterface, setShowMobileInterface] = useState(false);
  const [showProjectEnhancement, setShowProjectEnhancement] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [showProjectAnalysis, setShowProjectAnalysis] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [currentFormStep, setCurrentFormStep] = useState(1); // Renamed currentStep to currentFormStep
  const [showMissingSectionsModal, setShowMissingSectionsModal] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [isProcessingMissingSections, setIsProcessingMissingSections] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState<ResumeData | null>(null);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);

  // Removed automatic step progression useEffects
  // useEffect(() => {
  //   if (resumeText.trim().length > 0 && currentFormStep === 1) {
  //     setCurrentFormStep(2);
  //   }
  // }, [resumeText, currentFormStep]);

  // useEffect(() => {
  //   if (jobDescription.trim().length > 0 && currentFormStep === 2) {
  //     setCurrentFormStep(3);
  //   }
  // }, [jobDescription, currentFormStep]);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkSubscriptionStatus();
    } else {
      setLoadingSubscription(false);
    }
  }, [isAuthenticated, user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    try {
      const userSubscription = await paymentService.getUserSubscription(user.id);
      setSubscription(userSubscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleFileUpload = async (text: string) => {
    try {
      setResumeText(text);
    } catch (error) {
      console.error('Error handling file upload:', error);
      alert('Error processing file. Please try a different format or check if the file is corrupted.');
    }
  };

  const handleOptimize = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      alert('Please provide both resume content and job description');
      return;
    }
    if (!user) {
      alert('User information not available. Please sign in again.');
      return;
    }
    if (!subscription) {
      setShowSubscriptionPlans(true);
      return;
    }
    const remaining = subscription.optimizationsTotal - subscription.optimizationsUsed;
    if (remaining <= 0) {
      alert('You have used all your optimizations. Please upgrade your plan.');
      setShowSubscriptionPlans(true);
      return;
    }

    setIsOptimizing(true);
    try {
      const parsedResume = await optimizeResume(resumeText, jobDescription, userType, linkedinUrl, githubUrl, targetRole);
      setParsedResumeData(parsedResume);
      
      const missing = checkForMissingSections(parsedResume);
      if (missing.length > 0) {
        setMissingSections(missing);
        setPendingResumeData(parsedResume);
        setShowMissingSectionsModal(true);
        setIsOptimizing(false);
        return;
      }
      await continueOptimizationProcess(parsedResume);
      
    } catch (error) {
      console.error('Error optimizing resume:', error);
      alert('Failed to optimize resume. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const continueOptimizationProcess = async (resumeData: ResumeData) => {
    try {
      await handleInitialResumeProcessing(resumeData);
    } catch (error) {
      console.error('Error in optimization process:', error);
      alert('Failed to continue optimization. Please try again.');
    }
  };

  const handleInitialResumeProcessing = async (resumeData: ResumeData) => {
    try {
      setIsCalculatingScore(true);
      const initialScore = await getDetailedResumeScore(resumeData, jobDescription);
      setInitialResumeScore(initialScore);
      
      setOptimizedResume(resumeData);
      setParsedResumeData(resumeData);
      
      if (resumeData.projects && resumeData.projects.length > 0) {
        setShowProjectAnalysis(true);
      } else {
        await proceedWithFinalOptimization(resumeData, initialScore);
      }
    } catch (error) {
      console.error('Error in initial resume processing:', error);
      alert('Failed to process resume. Please try again.');
      setIsProcessingMissingSections(false);
    } finally {
      setIsCalculatingScore(false);
    }
  };
  
  const checkForMissingSections = (resumeData: ResumeData): string[] => {
    const missing: string[] = [];
    if (!resumeData.workExperience || resumeData.workExperience.length === 0) {
      missing.push('workExperience');
    }
    if (!resumeData.projects || resumeData.projects.length === 0) {
      missing.push('projects');
    }
    if (!resumeData.certifications || resumeData.certifications.length === 0) {
      missing.push('certifications');
    }
    return missing;
  };
  
  const handleMissingSectionsProvided = async (data: any) => {
    setIsProcessingMissingSections(true);
    try {
      if (!pendingResumeData) return;
      const updatedResume = {
        ...pendingResumeData,
        ...(data.workExperience && { workExperience: data.workExperience }),
        ...(data.projects && { projects: data.projects }),
        ...(data.certifications && { certifications: data.certifications })
      };
      
      setShowMissingSectionsModal(false);
      setMissingSections([]);
      setPendingResumeData(null);
      await handleInitialResumeProcessing(updatedResume);
    } catch (error) {
      console.error('Error processing missing sections:', error);
      alert('Failed to process the provided information. Please try again.');
    } finally {
      setIsProcessingMissingSections(false);
    }
  };
  
  const proceedWithFinalOptimization = async (resumeData: ResumeData, initialScore: DetailedScore) => {
    try {
      setIsOptimizing(true);
      await proceedWithOptimization(resumeData, initialScore);
    } catch (error) {
      console.error('Error in final optimization:', error);
      alert('Failed to complete final optimization. Please try again.');
      setIsOptimizing(false);
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const proceedWithOptimization = async (resumeData: ResumeData, initialScore: DetailedScore) => {
    try {
      console.log('Starting final AI optimization pass...');
      const finalOptimizedResume = await optimizeResume(
        JSON.stringify(resumeData),
        jobDescription,
        userType,
        linkedinUrl,
        githubUrl,
        targetRole
      );
      
      let finalResumeData = finalOptimizedResume;
      
      if (finalOptimizedResume.projects && finalOptimizedResume.projects.length > 0) {
        try {
          const projectAnalysis = await advancedProjectAnalyzer.analyzeAndReplaceProjects(
            finalOptimizedResume,
            targetRole || 'Software Engineer',
            jobDescription
          );
          
          const suitableProjects = finalOptimizedResume.projects?.filter(project => {
            const analysis = projectAnalysis.projectsToReplace.find(p => p.title === project.title);
            return !analysis || analysis.score >= 80;
          }) || [];
          
          const replacementProjects = projectAnalysis.replacementSuggestions.map(suggestion => ({
            title: suggestion.title,
            bullets: suggestion.bullets,
            githubUrl: suggestion.githubUrl
          }));
          
          const finalProjects = [...suitableProjects];
          
          for (const newProject of replacementProjects) {
            if (finalProjects.length < 3) {
              finalProjects.push(newProject);
            } else {
              break;
            }
          }
          
          finalResumeData = {
            ...finalOptimizedResume,
            projects: finalProjects
          };
          
          console.log(`Project replacement: ${finalOptimizedResume.projects.length} original → ${suitableProjects.length} kept + ${finalProjects.length - suitableProjects.length} new = ${finalProjects.length} total`);
        } catch (projectError) {
          console.warn('Project analysis failed, using original projects:', projectError);
        }
      }

      const beforeScoreData = generateBeforeScore(reconstructResumeText(resumeData));
      setBeforeScore(beforeScoreData);

      setOptimizedResume(finalResumeData);

      const afterScoreData = generateAfterScore(JSON.stringify(finalResumeData));
      setAfterScore(afterScoreData);
      
      const finalScore = await getDetailedResumeScore(finalResumeData, jobDescription);
      setFinalResumeScore(finalScore);

      const sections = ['workExperience', 'education', 'projects', 'skills', 'certifications'];
      setChangedSections(sections);

      const optimizationResult = await paymentService.useOptimization(user.id);
      if (optimizationResult.success) {
        await checkSubscriptionStatus();
      }
      
      if (window.innerWidth < 768) {
        setShowMobileInterface(true);
      }
    } catch (error) {
      console.error('Error optimizing resume:', error);
      alert('Failed to optimize resume. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const handleProjectMismatchResponse = (proceed: boolean) => {
    setShowProjectMismatch(false);
    if (proceed) {
      setShowProjectOptions(true);
    } else {
      if (parsedResumeData && initialResumeScore) {
        proceedWithOptimization(parsedResumeData, initialResumeScore);
      }
    }
  };
  
  const handleProjectOptionSelect = (option: 'manual' | 'ai') => {
    setShowProjectOptions(false);
    if (option === 'manual') {
      setShowManualProjectAdd(true);
    } else {
      setShowProjectEnhancement(true);
    }
  };
  
  const generateAIProject = async (jd: string, resume: ResumeData) => {
    return {
      title: "AI-Generated Project Based on Job Requirements",
      bullets: [
        "Developed a full-stack application using technologies mentioned in job description",
        "Implemented key features that align with role requirements and responsibilities",
        "Utilized modern development practices and tools relevant to the target position"
      ]
    };
  };
  
  const addTechToStack = () => {
    if (newTechStack.trim() && !manualProject.techStack.includes(newTechStack.trim())) {
      setManualProject(prev => ({
        ...prev,
        techStack: [...prev.techStack, newTechStack.trim()],
      }));
      setNewTechStack('');
    }
  };
  
  const removeTechFromStack = (tech: string) => {
    setManualProject(prev => ({
      ...prev,
      techStack: prev.techStack.filter(t => t !== tech)
    }));
  };
  
  const handleManualProjectSubmit = async () => {
    if (!manualProject.title || !parsedResumeData) return;
    
    setIsOptimizing(true);
    try {
      const projectDescription = await generateProjectDescription(manualProject, jobDescription);
      
      const newProject = {
        title: manualProject.title,
        bullets: projectDescription.split('\n').filter(line => line.trim().startsWith('•')).map(line => line.replace('•', '').trim())
      };
      
      let updatedResume;
      
      if (lowScoringProjects.length > 0) {
        const filteredProjects = parsedResumeData.projects?.filter(project => 
          !lowSc