import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Briefcase, 
  Sparkles, 
  User, 
  Users, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Crown,
  Clock,
  Target,
  TrendingUp,
  RefreshCw,
  Plus,
  Github,
  Linkedin,
  Globe,
  Award,
  BarChart3,
  Eye,
  EyeOff,
  X,
  Calendar,
  Building
} from 'lucide-react';

import { FileUpload } from './FileUpload';
import { InputSection } from './InputSection';
import { ResumePreview } from './ResumePreview';
import { ExportButtons } from './ExportButtons';
import { ComprehensiveAnalysis } from './ComprehensiveAnalysis';
import { SubscriptionPlans } from './payment/SubscriptionPlans';
import { SubscriptionStatus } from './payment/SubscriptionStatus';
import { ProjectAnalysisModal } from './ProjectAnalysisModal';
import { MissingSectionsModal } from './MissingSectionsModal';
import { ProjectEnhancement } from './ProjectEnhancement';

import { ResumeData, MatchScore, UserType } from '../types/resume';
import { optimizeResume } from '../services/geminiService';
import { getMatchScore, generateBeforeScore, generateAfterScore, getDetailedResumeScore } from '../services/scoringService';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

interface ResumeOptimizerProps {
  isAuthenticated: boolean;
  onShowAuth: () => void;
}

const ResumeOptimizer: React.FC<ResumeOptimizerProps> = ({ isAuthenticated, onShowAuth }) => {
  // Form state
  const [currentFormStep, setCurrentFormStep] = useState(1);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [userType, setUserType] = useState<UserType>('experienced');

  // Results state
  const [optimizedResume, setOptimizedResume] = useState<ResumeData | null>(null);
  const [beforeScore, setBeforeScore] = useState<MatchScore | null>(null);
  const [afterScore, setAfterScore] = useState<MatchScore | null>(null);
  const [changedSections, setChangedSections] = useState<string[]>([]);

  // UI state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis'>('preview');
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [showProjectAnalysis, setShowProjectAnalysis] = useState(false);
  const [showMissingSections, setShowMissingSections] = useState(false);
  const [showProjectEnhancement, setShowProjectEnhancement] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);

  // Auth and subscription state
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [canOptimize, setCanOptimize] = useState(false);
  const [remainingOptimizations, setRemainingOptimizations] = useState(0);

  // Load subscription status
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (user) {
        try {
          const result = await paymentService.canOptimize(user.id);
          setCanOptimize(result.canOptimize);
          setRemainingOptimizations(result.remaining);
          setSubscription(result.subscription);
        } catch (error) {
          console.error('Error loading subscription status:', error);
        }
      }
    };

    if (isAuthenticated && user) {
      loadSubscriptionStatus();
    }
  }, [isAuthenticated, user]);

  const handleOptimize = async () => {
    if (!isAuthenticated) {
      onShowAuth();
      return;
    }

    if (!canOptimize) {
      setShowSubscriptionPlans(true);
      return;
    }

    if (!resumeText.trim() || !jobDescription.trim()) {
      alert('Please provide both resume content and job description');
      return;
    }

    setIsOptimizing(true);
    
    try {
      // Ensure session is valid before long operation
      const sessionValid = await authService.ensureValidSession();
      if (!sessionValid) {
        onShowAuth();
        return;
      }

      // Use optimization
      const useResult = await paymentService.useOptimization(user!.id);
      if (!useResult.success) {
        alert('Failed to use optimization. Please try again.');
        return;
      }

      // Generate before score
      const beforeScoreResult = generateBeforeScore(resumeText);
      setBeforeScore(beforeScoreResult);

      // Optimize resume
      const result = await optimizeResume(
        resumeText, 
        jobDescription, 
        userType,
        linkedinUrl || undefined, 
        githubUrl || undefined,
        targetRole || undefined
      );
      
      setOptimizedResume(result);

      // Generate after score
      const afterScoreResult = generateAfterScore(resumeText);
      setAfterScore(afterScoreResult);

      // Determine changed sections
      const sections = ['summary', 'workExperience', 'education', 'projects', 'skills', 'certifications'];
      setChangedSections(sections);

      setShowResults(true);
      setRemainingOptimizations(useResult.remaining);
    } catch (error) {
      console.error('Optimization error:', error);
      if (error instanceof Error && (
          error.message.includes('JWT') || 
          error.message.includes('auth') ||
          error.message.includes('session')
      )) {
        onShowAuth();
      } else {
        alert('Optimization failed. Please try again.');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleNextStep = () => {
    if (currentFormStep === 1) {
      if (!resumeText.trim()) {
        alert('Please upload a resume file or enter resume content');
        return;
      }
    } else if (currentFormStep === 2) {
      if (!jobDescription.trim()) {
        alert('Please enter the job description');
        return;
      }
    }
    
    setCurrentFormStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentFormStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubscriptionSuccess = () => {
    // Reload subscription status
    if (user) {
      paymentService.canOptimize(user.id).then(result => {
        setCanOptimize(result.canOptimize);
        setRemainingOptimizations(result.remaining);
        setSubscription(result.subscription);
      });
    }
  };

  const handleProjectsUpdated = (updatedResume: ResumeData) => {
    setOptimizedResume(updatedResume);
  };

  const handleMissingSectionsProvided = (data: any) => {
    if (!optimizedResume) return;

    const updatedResume = { ...optimizedResume };
    
    if (data.workExperience) {
      updatedResume.workExperience = [...(updatedResume.workExperience || []), ...data.workExperience];
    }
    
    if (data.projects) {
      updatedResume.projects = [...(updatedResume.projects || []), ...data.projects];
    }
    
    if (data.certifications) {
      updatedResume.certifications = [...(updatedResume.certifications || []), ...data.certifications];
    }

    setOptimizedResume(updatedResume);
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Upload & Review Resume';
      case 2: return 'Job Details & Preferences';
      case 3: return 'Review & Optimize';
      default: return 'Resume Optimization';
    }
  };

  const getStepDescription = (step: number) => {
    switch (step) {
      case 1: return 'Upload your resume file and review the content';
      case 2: return 'Add job description and optional preferences';
      case 3: return 'Finalize details and get your optimized resume';
      default: return '';
    }
  };

  const canProceedToNextStep = () => {
    switch (currentFormStep) {
      case 1: return resumeText.trim().length > 0;
      case 2: return jobDescription.trim().length > 0;
      case 3: return true;
      default: return false;
    }
  };

  if (showResults && optimizedResume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-3 sm:px-4 lg:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Results Header */}
          <div className="text-center mb-6 lg:mb-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-900 mb-3 sm:mb-4">
              🎉 Resume Optimized Successfully!
            </h1>
            <p className="text-base sm:text-lg text-secondary-600 max-w-3xl mx-auto">
              Your resume has been enhanced with AI-powered optimization. Review the changes and export your new resume.
            </p>
          </div>

          {/* Subscription Status */}
          {isAuthenticated && user && (
            <div className="mb-6 lg:mb-8">
              <SubscriptionStatus onUpgrade={() => setShowSubscriptionPlans(true)} />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="bg-white rounded-xl p-1 shadow-lg border border-secondary-200">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'preview'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-secondary-700 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Resume Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'analysis'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-secondary-700 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Analysis</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-6 lg:space-y-8">
              {activeTab === 'preview' && (
                <ResumePreview resumeData={optimizedResume} userType={userType} />
              )}
              
              {activeTab === 'analysis' && beforeScore && afterScore && (
                <ComprehensiveAnalysis
                  beforeScore={beforeScore}
                  afterScore={afterScore}
                  changedSections={changedSections}
                  resumeData={optimizedResume}
                  jobDescription={jobDescription}
                  targetRole={targetRole}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Export Buttons */}
              <ExportButtons 
                resumeData={optimizedResume} 
                userType={userType}
                targetRole={targetRole}
              />

              {/* Action Buttons */}
              <div className="card p-4 sm:p-6 space-y-4">
                <h3 className="text-fluid-lg font-semibold text-secondary-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-primary-600" />
                  Quick Actions
                </h3>
                
                <button
                  onClick={() => setShowProjectAnalysis(true)}
                  className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
                >
                  <Target className="w-5 h-5" />
                  <span>Analyze Projects</span>
                </button>

                <button
                  onClick={() => setShowProjectEnhancement(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Enhance Projects</span>
                </button>

                <button
                  onClick={() => {
                    setShowResults(false);
                    setCurrentFormStep(1);
                    setOptimizedResume(null);
                    setBeforeScore(null);
                    setAfterScore(null);
                  }}
                  className="w-full btn-secondary flex items-center justify-center space-x-2 py-3"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Start Over</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SubscriptionPlans
          isOpen={showSubscriptionPlans}
          onClose={() => setShowSubscriptionPlans(false)}
          onSubscriptionSuccess={handleSubscriptionSuccess}
        />

        <ProjectAnalysisModal
          isOpen={showProjectAnalysis}
          onClose={() => setShowProjectAnalysis(false)}
          resumeData={optimizedResume}
          jobDescription={jobDescription}
          targetRole={targetRole}
          onProjectsUpdated={handleProjectsUpdated}
        />

        <MissingSectionsModal
          isOpen={showMissingSections}
          onClose={() => setShowMissingSections(false)}
          missingSections={missingSections}
          onSectionsProvided={handleMissingSectionsProvided}
        />

        <ProjectEnhancement
          isOpen={showProjectEnhancement}
          onClose={() => setShowProjectEnhancement(false)}
          currentResume={optimizedResume}
          jobDescription={jobDescription}
          onProjectsAdded={handleProjectsUpdated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-3 sm:px-4 lg:px-6 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="bg-gradient-to-r from-primary-600 to-accent-600 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-900 mb-3 sm:mb-4">
            AI-Powered Resume Optimizer
          </h1>
          <p className="text-base sm:text-lg text-secondary-600 max-w-3xl mx-auto mb-4 sm:mb-6">
            Transform your resume with advanced AI technology. Get ATS-friendly formatting and keyword optimization.
          </p>
          
          {/* Subscription Status for Authenticated Users */}
          {isAuthenticated && user && (
            <div className="mb-6">
              <SubscriptionStatus onUpgrade={() => setShowSubscriptionPlans(true)} />
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step < currentFormStep ? 'bg-green-500 text-white' :
                  step === currentFormStep ? 'bg-primary-600 text-white' :
                  'bg-secondary-200 text-secondary-600'
                }`}>
                  {step < currentFormStep ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 ${
                    step < currentFormStep ? 'bg-green-500' : 'bg-secondary-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 mb-2">
              {getStepTitle(currentFormStep)}
            </h2>
            <p className="text-secondary-600">
              {getStepDescription(currentFormStep)}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="card p-3 sm:p-4 lg:p-6 mb-6">
          {/* Step 1: Upload Resume & Resume Content */}
          {currentFormStep === 1 && (
            <div className="space-y-4 lg:space-y-6">
              {/* User Type Selection */}
              <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-3 border border-primary-200">
                <div className="flex items-center mb-3">
                  <User className="w-5 h-5 mr-2 text-primary-600" />
                  <h3 className="text-fluid-lg font-semibold text-secondary-900">I am a...</h3>
                  <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-fluid-xs rounded-full font-medium">
                    Required
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setUserType('fresher')}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                      userType === 'fresher'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-secondary-200 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Users className="w-5 h-5 mr-2 text-green-600" />
                      <span className="font-semibold text-secondary-900">Fresher/New Graduate</span>
                    </div>
                    <p className="text-fluid-sm text-secondary-600">0-2 years experience</p>
                  </button>
                  
                  <button
                    onClick={() => setUserType('experienced')}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                      userType === 'experienced'
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-secondary-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Award className="w-5 h-5 mr-2 text-primary-600" />
                      <span className="font-semibold text-secondary-900">Experienced Professional</span>
                    </div>
                    <p className="text-fluid-sm text-secondary-600">2+ years experience</p>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <FileUpload onFileUpload={setResumeText} />

              {/* Resume Content Input */}
              <InputSection
                resumeText={resumeText}
                jobDescription={jobDescription}
                onResumeChange={setResumeText}
                onJobDescriptionChange={setJobDescription}
                displaySections="resumeOnly"
              />
            </div>
          )}

          {/* Step 2: Job Description & Optional Fields */}
          {currentFormStep === 2 && (
            <div className="space-y-4 lg:space-y-6">
              {/* Job Description */}
              <InputSection
                resumeText={resumeText}
                jobDescription={jobDescription}
                onResumeChange={setResumeText}
                onJobDescriptionChange={setJobDescription}
                displaySections="jobDescriptionOnly"
              />

              {/* Social Links (Optional) */}
              <div className="bg-secondary-50 rounded-xl p-3 sm:p-4 border border-secondary-200">
                <div className="flex items-center mb-3">
                  <Globe className="w-5 h-5 mr-2 text-secondary-600" />
                  <h3 className="text-fluid-lg font-semibold text-secondary-900">Social Links</h3>
                  <span className="ml-2 px-2 py-1 bg-secondary-100 text-secondary-700 text-fluid-xs rounded-full font-medium">
                    Optional
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-fluid-sm font-medium text-secondary-700 mb-2">
                      LinkedIn Profile URL
                    </label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className="input-base pl-10 bg-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-fluid-sm font-medium text-secondary-700 mb-2">
                      GitHub Profile URL
                    </label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/yourusername"
                        className="input-base pl-10 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Role (Optional) */}
              <div className="bg-accent-50 rounded-xl p-3 sm:p-4 border border-accent-200">
                <div className="flex items-center mb-3">
                  <Target className="w-5 h-5 mr-2 text-accent-600" />
                  <h3 className="text-fluid-lg font-semibold text-secondary-900">Target Role</h3>
                  <span className="ml-2 px-2 py-1 bg-accent-100 text-accent-700 text-fluid-xs rounded-full font-medium">
                    Optional
                  </span>
                </div>
                
                <div>
                  <label className="block text-fluid-sm font-medium text-secondary-700 mb-2">
                    Specific role you're targeting (helps with optimization)
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g., Senior Software Engineer, Data Scientist, Product Manager"
                    className="input-base bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Optimize */}
          {currentFormStep === 3 && (
            <div className="space-y-4 lg:space-y-6">
              {/* Summary */}
              <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-3 sm:p-4 border border-primary-200">
                <h3 className="text-fluid-lg font-semibold text-secondary-900 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Ready to Optimize
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-fluid-sm">
                  <div>
                    <span className="font-medium text-secondary-700">User Type:</span>
                    <span className="ml-2 text-secondary-900 capitalize">{userType}</span>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-700">Resume Length:</span>
                    <span className="ml-2 text-secondary-900">{resumeText.length} characters</span>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-700">Job Description:</span>
                    <span className="ml-2 text-secondary-900">{jobDescription.length} characters</span>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-700">Social Links:</span>
                    <span className="ml-2 text-secondary-900">
                      {[linkedinUrl, githubUrl].filter(Boolean).length} provided
                    </span>
                  </div>
                </div>

                {targetRole && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-accent-200">
                    <span className="font-medium text-secondary-700">Target Role:</span>
                    <span className="ml-2 text-secondary-900">{targetRole}</span>
                  </div>
                )}
              </div>

              {/* Authentication Check */}
              {!isAuthenticated && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 sm:p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-orange-800 mb-2">Sign In Required</h4>
                      <p className="text-orange-700 text-fluid-sm mb-3">
                        Please sign in to optimize your resume and track your usage.
                      </p>
                      <button
                        onClick={onShowAuth}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-fluid-sm"
                      >
                        Sign In Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Check */}
              {isAuthenticated && !canOptimize && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                  <div className="flex items-start space-x-3">
                    <Crown className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">Subscription Required</h4>
                      <p className="text-blue-700 text-fluid-sm mb-3">
                        Choose a plan to start optimizing your resume with AI.
                      </p>
                      <button
                        onClick={() => setShowSubscriptionPlans(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-fluid-sm"
                      >
                        View Plans
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Optimization Button */}
              {isAuthenticated && canOptimize && (
                <div className="text-center">
                  <button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className={`w-full max-w-md mx-auto py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 ${
                      isOptimizing
                        ? 'bg-secondary-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105'
                    }`}
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Optimizing Your Resume...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        <span>Optimize My Resume</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  
                  {remainingOptimizations > 0 && (
                    <p className="text-secondary-600 text-fluid-sm mt-3">
                      {remainingOptimizations} optimization{remainingOptimizations !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevStep}
            disabled={currentFormStep === 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentFormStep === 1
                ? 'text-secondary-400 cursor-not-allowed'
                : 'text-secondary-700 hover:text-primary-600 hover:bg-primary-50'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-fluid-sm text-secondary-500">
            Step {currentFormStep} of 3
          </div>

          <button
            onClick={handleNextStep}
            disabled={!canProceedToNextStep() || currentFormStep === 3}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              !canProceedToNextStep() || currentFormStep === 3
                ? 'text-secondary-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <SubscriptionPlans
        isOpen={showSubscriptionPlans}
        onClose={() => setShowSubscriptionPlans(false)}
        onSubscriptionSuccess={handleSubscriptionSuccess}
      />

      <ProjectAnalysisModal
        isOpen={showProjectAnalysis}
        onClose={() => setShowProjectAnalysis(false)}
        resumeData={optimizedResume!}
        jobDescription={jobDescription}
        targetRole={targetRole}
        onProjectsUpdated={handleProjectsUpdated}
      />

      <MissingSectionsModal
        isOpen={showMissingSections}
        onClose={() => setShowMissingSections(false)}
        missingSections={missingSections}
        onSectionsProvided={handleMissingSectionsProvided}
      />

      <ProjectEnhancement
        isOpen={showProjectEnhancement}
        onClose={() => setShowProjectEnhancement(false)}
        currentResume={optimizedResume!}
        jobDescription={jobDescription}
        onProjectsAdded={handleProjectsUpdated}
      />
    </div>
  );
};

export default ResumeOptimizer;