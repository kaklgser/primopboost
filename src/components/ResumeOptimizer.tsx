import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Sparkles, Download, TrendingUp, Target, Award, User, Briefcase, AlertCircle, CheckCircle, Loader2, RefreshCw, Zap, Plus, Eye, EyeOff, Crown, Calendar, Clock, Users, Star, ArrowRight, ArrowLeft, Shield, Settings, LogOut, Menu, X, Upload, BarChart3, Lightbulb } from 'lucide-react';
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
  const [currentFormStep, setCurrentFormStep] = useState(1);
  const [showMissingSectionsModal, setShowMissingSectionsModal] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [isProcessingMissingSections, setIsProcessingMissingSections] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState<ResumeData | null>(null);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [animationClass, setAnimationClass] = useState('animate-fade-in');

  const totalSteps = 3;

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

  const isNextDisabled = useCallback(() => {
    if (currentFormStep === 1 && !resumeText.trim()) {
      return true;
    }
    if (currentFormStep === 2 && !jobDescription.trim()) {
      return true;
    }
    return false;
  }, [currentFormStep, resumeText, jobDescription]);

  const handleNextStep = () => {
    if (isNextDisabled()) {
      return;
    }
    setAnimationClass('animate-slide-out-left');
    setTimeout(() => {
      setCurrentFormStep(prev => prev + 1);
      setAnimationClass('animate-slide-in-right');
    }, 300);
  };

  const handleBackStep = () => {
    setAnimationClass('animate-slide-out-right');
    setTimeout(() => {
      setCurrentFormStep(prev => prev - 1);
      setAnimationClass('animate-slide-in-left');
    }, 300);
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
          !lowScoringProjects.some(lowProject => lowProject.title === project.title)
        ) || [];
        
        updatedResume = {
          ...parsedResumeData,
          projects: [...filteredProjects, newProject]
        };
      } else {
        updatedResume = {
          ...parsedResumeData,
          projects: [...(parsedResumeData.projects || []), newProject]
        };
      }
      
      setShowManualProjectAdd(false);
      await proceedWithOptimization(updatedResume, initialResumeScore!);
    } catch (error) {
      console.error('Error creating manual project:', error);
      alert('Failed to create project. Please try again.');
      setIsOptimizing(false);
    }
  };
  
  const generateProjectDescription = async (project: any, jd: string): Promise<string> => {
    return `• Developed ${project.title} using ${project.techStack.join(', ')} technologies
• Implemented core features and functionality aligned with industry best practices
• Delivered scalable solution with focus on performance and user experience`;
  };

  const handleProjectsAdded = (updatedResumeData: ResumeData) => {
    console.log('handleProjectsAdded called with:', updatedResumeData);
    
    setOptimizedResume(updatedResumeData);
    setParsedResumeData(updatedResumeData);
    
    if (initialResumeScore) {
      proceedWithFinalOptimization(updatedResumeData, initialResumeScore);
    } else {
      generateScoresAfterProjectAdd(updatedResumeData);
    }
  };
  
  const generateScoresAfterProjectAdd = async (updatedResume: ResumeData) => {
    try {
      const beforeScoreData = generateBeforeScore(reconstructResumeText(parsedResumeData!));
      setBeforeScore(beforeScoreData);

      const afterScoreData = generateAfterScore(JSON.stringify(updatedResume));
      setAfterScore(afterScoreData);
      
      if (initialResumeScore) {
        const finalScore = await getDetailedResumeScore(updatedResume, jobDescription);
        setFinalResumeScore(finalScore);
      }

      const sections = ['projects', 'workExperience', 'skills'];
      setChangedSections(sections);

      if (window.innerWidth < 768) {
        setShowMobileInterface(true);
      }
    } catch (error) {
      console.error('Error generating scores after project add:', error);
    }
  };

  const handleSubscriptionSuccess = () => {
    checkSubscriptionStatus();
  };

  const handleProjectsUpdated = (updatedResume: ResumeData) => {
    console.log('Projects updated, triggering final AI re-optimization...');
    
    setOptimizedResume(updatedResume);
    setParsedResumeData(updatedResume);
    
    if (initialResumeScore) {
      proceedWithFinalOptimization(updatedResume, initialResumeScore);
    } else {
      generateScoresAfterProjectAdd(updatedResume);
    }
  };

  // Mobile interface sections (used when optimizedResume is present and screen is small)
  const mobileSections = [
    {
      id: 'resume',
      title: 'Optimized Resume',
      icon: <FileText className="w-5 h-5" />,
      component: optimizedResume ? (
        <ResumePreview resumeData={optimizedResume} userType={userType} />
      ) : null,
      resumeData: optimizedResume
    },
    {
      id: 'analysis',
      title: 'Resume Analysis',
      icon: <BarChart3 className="w-5 h-5" />,
      component: beforeScore && afterScore && optimizedResume && jobDescription && targetRole ? (
        <>
          {/* Detailed Score Analysis from ResumeOptimizer */}
          {initialResumeScore && finalResumeScore && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                  Resume Score Overview
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Before Optimization</h3>
                    <div className="text-4xl font-bold text-red-600 mb-2">{initialResumeScore.totalScore}/100</div>
                    <div className="text-sm text-gray-600">Grade: {initialResumeScore.grade}</div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">After Optimization</h3>
                    <div className="text-4xl font-bold text-green-600 mb-2">{finalResumeScore.totalScore}/100</div>
                    <div className="text-sm text-gray-600">Grade: {finalResumeScore.grade}</div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    +{finalResumeScore.totalScore - initialResumeScore.totalScore} Points Improvement
                  </div>
                </div>
              </div>
            </div>
          )}
          <ComprehensiveAnalysis
            beforeScore={beforeScore}
            afterScore={afterScore}
            changedSections={changedSections}
            resumeData={optimizedResume}
            jobDescription={jobDescription}
            targetRole={targetRole || "Target Role"}
          />
        </>
      ) : null
    }
  ];

  // --- Wizard Step Content Components ---

  // Component for Step 1: Upload Resume & User Type
  const Step1Content = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Upload className="w-5 h-5 mr-2 text-blue-600" />
        Upload Your Resume
      </h2>
      <FileUpload onFileUpload={handleFileUpload} isDisabled={false} /> {/* Always enabled for active step */}
      
      {/* Optional: Add a success message for file upload */}
      {resumeText && (
        <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg flex items-center text-sm">
          <CheckCircle className="w-4 h-4 mr-2" />
          Resume content loaded ({resumeText.length} characters)
        </div>
      )}

      {/* Display resume content here (REQUIRED IN STEP 1) */}
      {resumeText && (
        <div className="mt-4">
          <label htmlFor="resumePreviewText" className="block text-sm font-medium text-gray-700 mb-2">
            Resume Content <span className="text-red-500">*</span> {/* Marked as Required */}
          </label>
          <textarea
            id="resumePreviewText"
            value={resumeText}
            readOnly // Make it read-only
            rows={10} // Give it enough height to show content
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none resize-y"
            style={{ minHeight: '150px' }} // Ensure a minimum height
          />
          <p className="text-xs text-gray-500 mt-1">
            Review the extracted text. This is what our AI will process.
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-indigo-600" />
          I am a...
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setUserType('fresher')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
              userType === 'fresher'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
            }`}
          >
            <Users className="w-8 h-8 mx-auto mb-3 text-current" />
            <span className="font-medium">Fresher/New Graduate</span>
            <span className="text-xs text-gray-500 mt-1">0-2 years experience</span>
          </button>
          <button
            onClick={() => setUserType('experienced')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
              userType === 'experienced'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <Briefcase className="w-8 h-8 mx-auto mb-3 text-current" />
            <span className="font-medium">Experienced Professional</span>
            <span className="text-xs text-gray-500 mt-1">2+ years experience</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Component for Step 2: Job Details Only (removed resume content section as per requirement)
  const Step2Content = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-green-600" />
        Enter Job Details
      </h2>
      <InputSection
        resumeText={resumeText} // Still passed, but InputSection itself now handles only jobDescription display
        jobDescription={jobDescription}
        onResumeChange={setResumeText} // Still passed, but InputSection won't use for resumeText input
        onJobDescriptionChange={setJobDescription}
        isReadOnly={false}
      />
      {jobDescription && (
        <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg flex items-center text-sm">
          <CheckCircle className="w-4 h-4 mr-2" />
          Job description loaded ({jobDescription.length} characters)
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Tips for better optimization:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Include the **complete job posting** with responsibilities, requirements, and qualifications.</li>
              <li>The more detailed the job description, the better our AI can tailor your resume.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Component for Step 3: Social Links, Target Role, Optimize Button
  const Step3Content = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-purple-600" />
            Social Links (Optional)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Profile URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/yourusername"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-orange-600" />
            Target Role (Optional)
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Title
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Senior Software Engineer, Product Manager..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Specify the exact role title for more targeted project recommendations
            </p>
          </div>
        </div>
      </div>
      
      {/* Optimize Button Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-blue-600" />
          Ready to Optimize?
        </h2>
        <p className="text-gray-600 mb-4">
          Click the button below to generate your AI-optimized resume.
          {isAuthenticated && subscription && subscription.optimizationsTotal > 0 &&
            ` You have ${subscription.optimizationsTotal - subscription.optimizationsUsed} optimizations remaining.`
          }
        </p>
        <button
          onClick={isAuthenticated ? handleOptimize : onShowAuth}
          disabled={isOptimizing || !resumeText.trim() || !jobDescription.trim() || !isAuthenticated || (isAuthenticated && !subscription) || (isAuthenticated && subscription && (subscription.optimizationsTotal - subscription.optimizationsUsed <= 0))}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 ${
            isOptimizing || !resumeText.trim() || !jobDescription.trim() || !isAuthenticated || (isAuthenticated && !subscription) || (isAuthenticated && subscription && (subscription.optimizationsTotal - subscription.optimizationsUsed <= 0))
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl cursor-pointer'
          }`}
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Optimizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              <span>{isAuthenticated ? 'Optimize My Resume' : 'Sign In to Optimize'}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {!isAuthenticated && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Please sign in to unlock resume optimization.
          </p>
        )}
        {isAuthenticated && !subscription && (
          <p className="text-center text-sm text-gray-500 mt-3">
            You need a subscription to optimize your resume. <button onClick={() => setShowSubscriptionPlans(true)} className="text-blue-600 hover:underline">View Plans</button>
          </p>
        )}
        {isAuthenticated && subscription && (subscription.optimizationsTotal - subscription.optimizationsUsed <= 0) && (
          <p className="text-center text-sm text-gray-500 mt-3">
            You've used all your optimizations. <button onClick={() => setShowSubscriptionPlans(true)} className="text-blue-600 hover:underline">Upgrade your plan</button>
          </p>
        )}
      </div>
    </>
  );

  // This function conditionally renders the content for the current step
  const renderWizardContent = () => {
    return (
      <div key={currentFormStep} className={`transition-transform duration-300 ease-in-out ${animationClass}`}>
        {currentFormStep === 1 && <Step1Content />}
        {currentFormStep === 2 && <Step2Content />}
        {currentFormStep === 3 && <Step3Content />}
      </div>
    );
  };

  const getStepTitle = () => {
    switch (currentFormStep) {
      case 1: return 'Upload Resume & User Type';
      case 2: return 'Enter Job Details';
      case 3: return 'Additional Info & Optimize';
      default: return '';
    }
  };


  if (showMobileInterface && optimizedResume) {
    return <MobileOptimizedInterface sections={mobileSections} />;
  }

  if (isOptimizing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Optimizing Your Resume...</h2>
          <p className="text-gray-600 mb-4">
            Please wait while our AI analyzes your resume and job description to generate the best possible match.
          </p>
          <p className="text-sm text-gray-500">
            This may take a few moments as we process complex data and apply advanced algorithms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-16">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-8"> {/* Adjusted horizontal padding */}
        {!optimizedResume ? ( // Show the wizard form if no optimized resume yet
          <>
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg mx-auto mb-4">
                <img
                  src="https://res.cloudinary.com/dlkovvlud/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1751536902/a-modern-logo-design-featuring-primoboos_XhhkS8E_Q5iOwxbAXB4CqQ_HnpCsJn4S1yrhb826jmMDw_nmycqj.jpg"
                  alt="PrimoBoost AI Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">PrimoBoost AI</h1>
              <p className="text-lg text-gray-600 mb-2">Upgrade Your Resume, Unlock Your Future</p>
              <p className="text-base text-gray-500 max-w-2xl mx-auto mb-6">Transform. Optimize. Get Hired – With PrimoBoost.AI</p>

              <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 mb-8">
                <Sparkles className="w-4 h-4 mr-2" />
                Powered by Advanced AI Technology
              </div>
            </div>

            {/* Process Steps Indicator */}
            <div className="flex flex-col md:flex-row justify-center gap-4 mb-8 max-w-4xl mx-auto">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className={`bg-white rounded-xl p-6 border flex-1 transition-all duration-300 ${
                    currentFormStep === step
                      ? 'border-blue-300 ring-2 ring-blue-200 transform scale-105 shadow-lg'
                      : 'border-gray-200 opacity-70'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    currentFormStep === step ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <span className="font-bold text-lg">{step < currentFormStep ? <CheckCircle className="w-5 h-5" /> : step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step === 1 ? 'Upload Resume' : step === 2 ? 'Add Job Details' : 'Review & Optimize'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {step === 1 ? 'Upload your current resume or paste the text' : step === 2 ? 'Paste the job description you\'re targeting' : 'Finalize details and get your optimized resume'}
                  </p>
                </div>
              ))}
            </div>

            {isAuthenticated && !loadingSubscription && (
              <div className="mb-8">
                <SubscriptionStatus onUpgrade={() => setShowSubscriptionPlans(true)} />
              </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">
              {/* Render current form step content */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col"> {/* Wrapper for wizard content */}
                <div className={`p-6 lg:p-8 flex-1 overflow-y-auto ${animationClass}`}>
                  {renderWizardContent()}
                </div>

                {/* Navigation Footer - INTEGRATED HERE */}
                <div className="bg-gray-50 px-6 py-4 lg:px-8 lg:py-6 border-t border-secondary-200 rounded-b-xl flex justify-between items-center flex-shrink-0">
                  <button
                    onClick={handleBackStep}
                    disabled={currentFormStep === 1}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      currentFormStep === 1
                        ? 'text-secondary-400 cursor-not-allowed'
                        : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="text-sm text-secondary-500">
                    Step {currentFormStep} of {totalSteps}
                  </div>

                  {currentFormStep < totalSteps ? (
                    <button
                      onClick={handleNextStep}
                      disabled={isNextDisabled()}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                        isNextDisabled()
                          ? 'bg-secondary-300 text-secondary-500 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      <span>Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    // On the last step (Step 3), show the Optimize button directly
                    <button
                      onClick={isAuthenticated ? handleOptimize : onShowAuth}
                      disabled={isOptimizing || !resumeText.trim() || !jobDescription.trim() || !isAuthenticated || (isAuthenticated && !subscription) || (isAuthenticated && subscription && (subscription.optimizationsTotal - subscription.optimizationsUsed <= 0))}
                      className={`flex items-center space-x-3 px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        isOptimizing || !resumeText.trim() || !jobDescription.trim() || !isAuthenticated || (isAuthenticated && !subscription) || (isAuthenticated && subscription && (subscription.optimizationsTotal - subscription.optimizationsUsed <= 0))
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl cursor-pointer'
                      }`}
                    >
                      {isOptimizing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Optimizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>{isAuthenticated ? 'Optimize My Resume' : 'Sign In to Optimize'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!isAuthenticated && currentFormStep === totalSteps && ( // Only show auth message on final step if not authenticated
                <p className="text-center text-sm text-gray-500 mt-3">
                  You need to be signed in to optimize your resume.
                </p>
              )}
               {isAuthenticated && !subscription && currentFormStep === totalSteps && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  You need a subscription to optimize your resume. <button onClick={() => setShowSubscriptionPlans(true)} className="text-blue-600 hover:underline">View Plans</button>
                </p>
              )}
              {isAuthenticated && subscription && (subscription.optimizationsTotal - subscription.optimizationsUsed <= 0) && currentFormStep === totalSteps && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  You've used all your optimizations. <button onClick={() => setShowSubscriptionPlans(true)} className="text-blue-600 hover:underline">Upgrade your plan</button>
                </p>
              )}
            </div>
          </>
        ) : ( // Optimized Resume View (when optimizedResume is not null)
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Optimized Resume
                </h2>
              </div>
              <ResumePreview resumeData={optimizedResume} userType={userType} />
            </div>

            <ExportButtons resumeData={optimizedResume} targetRole={targetRole} />

            {beforeScore && afterScore && initialResumeScore && finalResumeScore && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                    Resume Score Analysis
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Before Optimization</h3>
                      <div className="text-4xl font-bold text-red-600 mb-2">{initialResumeScore.totalScore}/100</div>
                      <div className="text-sm text-gray-600">Grade: {initialResumeScore.grade}</div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">After Optimization</h3>
                      <div className="text-4xl font-bold text-green-600 mb-2">{finalResumeScore.totalScore}/100</div>
                      <div className="text-sm text-gray-600">Grade: {finalResumeScore.grade}</div>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      +{finalResumeScore.totalScore - initialResumeScore.totalScore} Points Improvement
                    </div>
                  </div>
                </div>
              </div>
            )}

            {beforeScore && afterScore && (
              <ComprehensiveAnalysis
                beforeScore={beforeScore}
                afterScore={afterScore}
                changedSections={changedSections}
                resumeData={optimizedResume}
                jobDescription={jobDescription}
                targetRole={targetRole || "Target Role"}
              />
            )}

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <button
                onClick={() => setShowProjectAnalysis(true)}
                className="w-full py-3 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
              >
                <Target className="w-5 h-5" />
                <span>Analyze & Improve Projects</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showProjectMismatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Project Mismatch Detected</h2>
                <p className="text-gray-600">
                  Your current projects don't align well with the job description. Would you like to add a relevant project to improve your resume score?
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {initialResumeScore?.totalScore}/100
                  </div>
                  <div className="text-sm text-red-700">Current Resume Score</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleProjectMismatchResponse(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Yes, Add Project
                </button>
                <button
                  onClick={() => handleProjectMismatchResponse(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProjectOptions && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Project Addition Method</h2>
                <p className="text-gray-600">
                  How would you like to add a relevant project to your resume?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleProjectOptionSelect('manual')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <User className="w-5 h-5" />
                  <span>Manual Add - I'll provide project details</span>
                </button>
                <button
                  onClick={() => handleProjectOptionSelect('ai')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>AI-Suggested - Generate automatically</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualProjectAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Add Project Manually</h2>
                <p className="text-gray-600">
                  Provide project details and AI will generate a professional description
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={manualProject.title}
                    onChange={(e) => setManualProject(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., E-commerce Website"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="month"
                      value={manualProject.startDate}
                      onChange={(e) => setManualProject(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="month"
                      value={manualProject.endDate}
                      onChange={(e) => setManualProject(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tech Stack *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTechStack}
                      onChange={(e) => setNewTechStack(e.target.value)}
                      placeholder="Add technology (e.g., React, Node.js)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      onKeyPress={(e) => e.key === 'Enter' && addTechToStack()}
                    />
                    <button
                      onClick={addTechToStack}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {manualProject.techStack.map((tech, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {tech}
                        <button
                          onClick={() => removeTechFromStack(tech)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    One-liner Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualProject.oneLiner}
                    onChange={(e) => setManualProject(prev => ({ ...prev, oneLiner: e.target.value }))}
                    placeholder="Brief description of the project"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleManualProjectSubmit}
                  disabled={!manualProject.title || manualProject.techStack.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Generate & Add Project
                </button>
                <button
                  onClick={() => setShowManualProjectAdd(false)}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProcessingMissingSections && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Processing Your Information</h2>
            <p className="text-gray-600 mb-4">
              We're updating your resume with the new sections you provided...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Analyzing new content</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Calculating resume score</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Preparing optimization</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <>
        <ProjectEnhancement
          isOpen={showProjectEnhancement}
          onClose={() => setShowProjectEnhancement(false)}
          currentResume={parsedResumeData || optimizedResume || { name: '', phone: '', email: '', linkedin: '', github: '', education: [], workExperience: [], projects: [], skills: [], certifications: [] }}
          jobDescription={jobDescription}
          onProjectsAdded={handleProjectsUpdated}
        />

        <ProjectAnalysisModal
          isOpen={showProjectAnalysis}
          onClose={() => setShowProjectAnalysis(false)}
          resumeData={parsedResumeData || optimizedResume || { name: '', phone: '', email: '', linkedin: '', github: '', education: [], workExperience: [], projects: [], skills: [], certifications: [] }}
          jobDescription={jobDescription}
          targetRole={targetRole}
          onProjectsUpdated={handleProjectsUpdated}
        />

        <SubscriptionPlans
          isOpen={showSubscriptionPlans}
          onClose={() => setShowSubscriptionPlans(false)}
          onSubscriptionSuccess={handleSubscriptionSuccess}
        />

        <MissingSectionsModal
          isOpen={showMissingSectionsModal}
          onClose={() => {
            setShowMissingSectionsModal(false);
            setMissingSections([]);
            setPendingResumeData(null);
            setIsOptimizing(false);
          }}
          missingSections={missingSections}
          onSectionsProvided={handleMissingSectionsProvided}
        />
      </>
    </div>
  );
};

export default ResumeOptimizer;