import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  TrendingUp, 
  FileText, 
  Briefcase, 
  User, 
  Target, 
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Download,
  RefreshCw,
  Plus,
  Home,
  ArrowRight
} from 'lucide-react';
import { FileUpload } from './FileUpload';
import { InputSection } from './InputSection';
import { ResumePreview } from './ResumePreview';
import { ExportButtons } from './ExportButtons';
import { ComprehensiveAnalysis } from './ComprehensiveAnalysis';
import { MobileOptimizedInterface } from './MobileOptimizedInterface';
import { ProjectAnalysisModal } from './ProjectAnalysisModal';
import { ProjectEnhancement } from './ProjectEnhancement';
import { MissingSectionsModal } from './MissingSectionsModal';
import { SubscriptionPlans } from './payment/SubscriptionPlans';
import { SubscriptionStatus } from './payment/SubscriptionStatus';
import { optimizeResume } from '../services/geminiService';
import { getMatchScore, generateBeforeScore, generateAfterScore, getDetailedResumeScore } from '../services/scoringService';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { ResumeData, MatchScore, DetailedScore, UserType } from '../types/resume';

interface ResumeOptimizerProps {
  isAuthenticated: boolean;
  onShowAuth: () => void;
}

const ResumeOptimizer: React.FC<ResumeOptimizerProps> = ({ isAuthenticated, onShowAuth }) => {
  // State management
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [userType, setUserType] = useState<UserType>('experienced');
  const [optimizedResume, setOptimizedResume] = useState<ResumeData | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [beforeScore, setBeforeScore] = useState<MatchScore | null>(null);
  const [afterScore, setAfterScore] = useState<MatchScore | null>(null);
  const [detailedScore, setDetailedScore] = useState<DetailedScore | null>(null);
  const [changedSections, setChangedSections] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'input' | 'optimizing' | 'results'>('input');
  const [showProjectAnalysis, setShowProjectAnalysis] = useState(false);
  const [showProjectEnhancement, setShowProjectEnhancement] = useState(false);
  const [showMissingSections, setShowMissingSections] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [canOptimize, setCanOptimize] = useState(false);
  const [remainingOptimizations, setRemainingOptimizations] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check subscription status
  useEffect(() => {
    checkSubscriptionStatus();
  }, [user, isAuthenticated]);

  const checkSubscriptionStatus = async () => {
    if (!user || !isAuthenticated) {
      setCanOptimize(false);
      setRemainingOptimizations(0);
      return;
    }

    try {
      const result = await paymentService.canOptimize(user.id);
      setCanOptimize(result.canOptimize);
      setRemainingOptimizations(result.remaining);
      setSubscription(result.subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setCanOptimize(false);
      setRemainingOptimizations(0);
    }
  };

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
    setCurrentStep('optimizing');

    try {
      // Check for missing sections first
      const missing = detectMissingSections(resumeText);
      if (missing.length > 0) {
        setMissingSections(missing);
        setShowMissingSections(true);
        setIsOptimizing(false);
        setCurrentStep('input');
        return;
      }

      // Use optimization
      const useResult = await paymentService.useOptimization(user!.id);
      if (!useResult.success) {
        alert('Failed to use optimization. Please try again.');
        setIsOptimizing(false);
        setCurrentStep('input');
        return;
      }

      // Generate before score
      const beforeScoreData = generateBeforeScore(resumeText);
      setBeforeScore(beforeScoreData);

      // Optimize resume
      const result = await optimizeResume(resumeText, jobDescription, userType, linkedinUrl, githubUrl, targetRole);
      setOptimizedResume(result);

      // Generate after score
      const afterScoreData = generateAfterScore(JSON.stringify(result));
      setAfterScore(afterScoreData);

      // Get detailed score
      try {
        const detailedScoreData = await getDetailedResumeScore(result, jobDescription);
        setDetailedScore(detailedScoreData);
      } catch (error) {
        console.error('Error getting detailed score:', error);
      }

      // Determine changed sections
      const sections = ['summary', 'workExperience', 'education', 'projects', 'skills', 'certifications'];
      setChangedSections(sections);

      setCurrentStep('results');
      
      // Update remaining optimizations
      setRemainingOptimizations(useResult.remaining);
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Optimization failed. Please try again.');
      setCurrentStep('input');
    } finally {
      setIsOptimizing(false);
    }
  };

  const detectMissingSections = (resumeText: string): string[] => {
    const missing: string[] = [];
    
    if (!resumeText.includes('@') || !resumeText.includes('phone') && !resumeText.includes('mobile')) {
      missing.push('contactDetails');
    }
    
    if (!resumeText.toLowerCase().includes('experience') && !resumeText.toLowerCase().includes('work') && !resumeText.toLowerCase().includes('internship')) {
      missing.push('workExperience');
    }
    
    if (!resumeText.toLowerCase().includes('project') && !resumeText.toLowerCase().includes('built') && !resumeText.toLowerCase().includes('developed')) {
      missing.push('projects');
    }
    
    if (!resumeText.toLowerCase().includes('certification') && !resumeText.toLowerCase().includes('certified')) {
      missing.push('certifications');
    }
    
    return missing;
  };

  const handleMissingSectionsProvided = (data: any) => {
    let updatedResumeText = resumeText;
    
    if (data.contactDetails) {
      updatedResumeText += `\n\nCONTACT DETAILS:\n`;
      if (data.contactDetails.phone) updatedResumeText += `Phone: ${data.contactDetails.phone}\n`;
      if (data.contactDetails.email) updatedResumeText += `Email: ${data.contactDetails.email}\n`;
      if (data.contactDetails.linkedin) updatedResumeText += `LinkedIn: ${data.contactDetails.linkedin}\n`;
      if (data.contactDetails.github) updatedResumeText += `GitHub: ${data.contactDetails.github}\n`;
    }
    
    if (data.workExperience) {
      updatedResumeText += `\n\nWORK EXPERIENCE:\n`;
      data.workExperience.forEach((work: any) => {
        updatedResumeText += `${work.role} at ${work.company} (${work.year})\n`;
        work.bullets.forEach((bullet: string) => {
          updatedResumeText += `• ${bullet}\n`;
        });
        updatedResumeText += '\n';
      });
    }
    
    if (data.projects) {
      updatedResumeText += `\n\nPROJECTS:\n`;
      data.projects.forEach((project: any) => {
        updatedResumeText += `${project.title}\n`;
        project.bullets.forEach((bullet: string) => {
          updatedResumeText += `• ${bullet}\n`;
        });
        updatedResumeText += '\n';
      });
    }
    
    if (data.certifications) {
      updatedResumeText += `\n\nCERTIFICATIONS:\n`;
      data.certifications.forEach((cert: string) => {
        updatedResumeText += `• ${cert}\n`;
      });
    }
    
    setResumeText(updatedResumeText);
    setShowMissingSections(false);
    
    // Continue with optimization
    setTimeout(() => {
      handleOptimize();
    }, 500);
  };

  const handleProjectsUpdated = (updatedResume: ResumeData) => {
    setOptimizedResume(updatedResume);
    setShowProjectAnalysis(false);
    setShowProjectEnhancement(false);
  };

  const handleSubscriptionSuccess = () => {
    checkSubscriptionStatus();
    setShowSubscriptionPlans(false);
  };

  // New function to reset everything and start fresh
  const handleCreateNewResume = () => {
    // Reset all state to initial values
    setResumeText('');
    setJobDescription('');
    setLinkedinUrl('');
    setGithubUrl('');
    setTargetRole('');
    setUserType('experienced');
    setOptimizedResume(null);
    setBeforeScore(null);
    setAfterScore(null);
    setDetailedScore(null);
    setChangedSections([]);
    setCurrentStep('input');
    setShowProjectAnalysis(false);
    setShowProjectEnhancement(false);
    setShowMissingSections(false);
    setMissingSections([]);
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mobile interface sections
  const mobileSections = [
    {
      id: 'resume',
      title: 'Resume',
      icon: <FileText className="w-5 h-5" />,
      component: <ResumePreview resumeData={optimizedResume!} userType={userType} />,
      resumeData: optimizedResume,
      userType: userType
    },
    {
      id: 'analysis',
      title: 'Analysis',
      icon: <BarChart3 className="w-5 h-5" />,
      component: beforeScore && afterScore ? (
        <ComprehensiveAnalysis
          beforeScore={beforeScore}
          afterScore={afterScore}
          changedSections={changedSections}
          resumeData={optimizedResume!}
          jobDescription={jobDescription}
          targetRole={targetRole}
        />
      ) : null
    }
  ];

  // Render different views based on current step
  if (currentStep === 'optimizing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Optimizing Your Resume</h2>
          <p className="text-gray-600 mb-6">Our AI is analyzing your resume and tailoring it to match the job requirements...</p>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Analyzing job requirements
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="w-4 h-4 text-blue-500 mr-2 animate-spin" />
              Optimizing content and keywords
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2"></div>
              Generating final resume
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'results' && optimizedResume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {isMobile ? (
          <MobileOptimizedInterface sections={mobileSections} />
        ) : (
          <div className="container-responsive py-6 lg:py-8">
            {/* Success Header */}
            <div className="text-center mb-6 lg:mb-8">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-lg">
                <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold text-secondary-900 mb-2 lg:mb-4">
                🎉 Resume Optimization Complete!
              </h1>
              <p className="text-fluid-base lg:text-fluid-lg text-secondary-600 mb-4 lg:mb-6">
                Your resume has been successfully optimized and is ready for download
              </p>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center gap-4 lg:gap-6 mb-6 lg:mb-8">
                <div className="bg-white rounded-xl px-4 py-3 lg:px-6 lg:py-4 shadow-md border border-secondary-200">
                  <div className="text-lg lg:text-2xl font-bold text-green-600">{afterScore?.score || 92}%</div>
                  <div className="text-xs lg:text-sm text-secondary-600">Final Score</div>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 lg:px-6 lg:py-4 shadow-md border border-secondary-200">
                  <div className="text-lg lg:text-2xl font-bold text-blue-600">+{(afterScore?.score || 92) - (beforeScore?.score || 57)}</div>
                  <div className="text-xs lg:text-sm text-secondary-600">Improvement</div>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 lg:px-6 lg:py-4 shadow-md border border-secondary-200">
                  <div className="text-lg lg:text-2xl font-bold text-purple-600">ATS</div>
                  <div className="text-xs lg:text-sm text-secondary-600">Ready</div>
                </div>
              </div>

              {/* Create New Resume Button */}
              <div className="mb-6 lg:mb-8">
                <button
                  onClick={handleCreateNewResume}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 lg:py-4 lg:px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 mx-auto"
                >
                  <Home className="w-5 h-5" />
                  <span>Create New Resume</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              {/* Resume Preview */}
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-fluid-xl lg:text-fluid-2xl font-bold text-secondary-900 flex items-center">
                    <FileText className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-primary-600" />
                    Optimized Resume
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowProjectAnalysis(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors text-sm lg:text-base flex items-center space-x-1"
                    >
                      <Target className="w-4 h-4" />
                      <span className="hidden sm:inline">Analyze Projects</span>
                      <span className="sm:hidden">Projects</span>
                    </button>
                    <button
                      onClick={() => setShowProjectEnhancement(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors text-sm lg:text-base flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Projects</span>
                      <span className="sm:hidden">Add</span>
                    </button>
                  </div>
                </div>
                <ResumePreview resumeData={optimizedResume} userType={userType} />
                <ExportButtons resumeData={optimizedResume} userType={userType} targetRole={targetRole} />
              </div>

              {/* Analysis */}
              <div className="space-y-4 lg:space-y-6">
                {beforeScore && afterScore && (
                  <ComprehensiveAnalysis
                    beforeScore={beforeScore}
                    afterScore={afterScore}
                    changedSections={changedSections}
                    resumeData={optimizedResume}
                    jobDescription={jobDescription}
                    targetRole={targetRole}
                  />
                )}

                {/* Subscription Status */}
                {isAuthenticated && (
                  <SubscriptionStatus onUpgrade={() => setShowSubscriptionPlans(true)} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <ProjectAnalysisModal
          isOpen={showProjectAnalysis}
          onClose={() => setShowProjectAnalysis(false)}
          resumeData={optimizedResume}
          jobDescription={jobDescription}
          targetRole={targetRole}
          onProjectsUpdated={handleProjectsUpdated}
        />

        <ProjectEnhancement
          isOpen={showProjectEnhancement}
          onClose={() => setShowProjectEnhancement(false)}
          currentResume={optimizedResume}
          jobDescription={jobDescription}
          onProjectsAdded={handleProjectsUpdated}
        />

        <SubscriptionPlans
          isOpen={showSubscriptionPlans}
          onClose={() => setShowSubscriptionPlans(false)}
          onSubscriptionSuccess={handleSubscriptionSuccess}
        />
      </div>
    );
  }

  // Input step (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container-responsive py-12 lg:py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm w-16 h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-6 lg:mb-8 shadow-lg">
              <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
            </div>
            <h1 className="text-3xl lg:text-5xl xl:text-6xl font-bold mb-4 lg:mb-6 leading-tight">
              AI-Powered Resume
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Optimization
              </span>
            </h1>
            <p className="text-lg lg:text-xl xl:text-2xl text-blue-100 mb-6 lg:mb-8 leading-relaxed">
              Transform your resume with intelligent keyword optimization, ATS-friendly formatting, and industry-specific enhancements.
            </p>
            
            {/* User Type Selection */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 lg:gap-4 mb-6 lg:mb-8">
              <button
                onClick={() => setUserType('experienced')}
                className={`px-4 py-3 lg:px-6 lg:py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                  userType === 'experienced'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Briefcase className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Experienced Professional</span>
              </button>
              <button
                onClick={() => setUserType('fresher')}
                className={`px-4 py-3 lg:px-6 lg:py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                  userType === 'fresher'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <User className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Fresher/Student</span>
              </button>
            </div>

            {/* Subscription Status for Authenticated Users */}
            {isAuthenticated && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-6 mb-6 lg:mb-8 border border-white/20">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">
                        {canOptimize ? `${remainingOptimizations} optimizations remaining` : 'No active subscription'}
                      </div>
                      <div className="text-blue-100 text-sm">
                        {subscription ? `${subscription.planId} plan active` : 'Subscribe to start optimizing'}
                      </div>
                    </div>
                  </div>
                  {!canOptimize && (
                    <button
                      onClick={() => setShowSubscriptionPlans(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2 px-4 lg:py-3 lg:px-6 rounded-xl transition-all duration-300 shadow-lg"
                    >
                      Subscribe Now
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-6 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Input */}
            <div className="space-y-4 lg:space-y-6">
              {/* File Upload */}
              <div className="card p-4 lg:p-6">
                <h2 className="text-fluid-xl lg:text-fluid-2xl font-bold text-secondary-900 mb-4 lg:mb-6 flex items-center">
                  <Upload className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-primary-600" />
                  Upload Your Resume
                </h2>
                <FileUpload onFileUpload={setResumeText} />
              </div>

              {/* Input Section */}
              <InputSection
                resumeText={resumeText}
                jobDescription={jobDescription}
                onResumeChange={setResumeText}
                onJobDescriptionChange={setJobDescription}
              />

              {/* Additional Information */}
              <div className="card p-4 lg:p-6">
                <h3 className="text-fluid-lg lg:text-fluid-xl font-semibold text-secondary-900 mb-4 lg:mb-6 flex items-center">
                  <Target className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-green-600" />
                  Additional Information
                </h3>
                
                <div className="space-y-3 lg:space-y-4">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-secondary-700 mb-2">
                      Target Role (Optional)
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g., Senior Software Engineer"
                      className="input-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-secondary-700 mb-2">
                      LinkedIn Profile URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="input-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-secondary-700 mb-2">
                      GitHub Profile URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/yourusername"
                      className="input-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Action */}
            <div className="space-y-4 lg:space-y-6">
              {/* Optimization Button */}
              <div className="card p-6 lg:p-8 text-center">
                <div className="bg-gradient-to-r from-primary-100 to-accent-100 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                  <Zap className="w-10 h-10 lg:w-12 lg:h-12 text-primary-600" />
                </div>
                
                <h3 className="text-fluid-xl lg:text-fluid-2xl font-bold text-secondary-900 mb-3 lg:mb-4">
                  Ready to Optimize?
                </h3>
                
                <p className="text-fluid-sm lg:text-fluid-base text-secondary-600 mb-6 lg:mb-8 leading-relaxed">
                  Our AI will analyze your resume against the job description and optimize it for maximum impact and ATS compatibility.
                </p>

                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || (!resumeText.trim() || !jobDescription.trim())}
                  className={`w-full py-4 lg:py-5 px-6 lg:px-8 rounded-xl lg:rounded-2xl font-bold text-fluid-base lg:text-fluid-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl ${
                    isOptimizing || (!resumeText.trim() || !jobDescription.trim())
                      ? 'bg-secondary-400 text-white cursor-not-allowed'
                      : isAuthenticated && canOptimize
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white transform hover:scale-105'
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white transform hover:scale-105'
                  }`}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
                      <span>Optimizing Resume...</span>
                    </>
                  ) : !isAuthenticated ? (
                    <>
                      <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
                      <span>Sign In to Optimize</span>
                    </>
                  ) : !canOptimize ? (
                    <>
                      <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
                      <span>Subscribe to Optimize</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
                      <span>Optimize My Resume</span>
                    </>
                  )}
                </button>

                {isAuthenticated && canOptimize && (
                  <p className="text-xs lg:text-sm text-secondary-500 mt-3 lg:mt-4">
                    {remainingOptimizations} optimization{remainingOptimizations !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="card p-4 lg:p-6">
                <h3 className="text-fluid-lg lg:text-fluid-xl font-semibold text-secondary-900 mb-4 lg:mb-6">
                  What You'll Get
                </h3>
                
                <div className="space-y-3 lg:space-y-4">
                  {[
                    { icon: <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />, text: 'ATS-optimized formatting' },
                    { icon: <Target className="w-4 h-4 lg:w-5 lg:h-5" />, text: 'Keyword optimization' },
                    { icon: <FileText className="w-4 h-4 lg:w-5 lg:h-5" />, text: 'Professional structure' },
                    { icon: <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5" />, text: 'Detailed scoring analysis' },
                    { icon: <Download className="w-4 h-4 lg:w-5 lg:h-5" />, text: 'PDF & Word export' }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="text-green-600">{feature.icon}</div>
                      <span className="text-fluid-sm lg:text-fluid-base text-secondary-700">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription Status for Authenticated Users */}
              {isAuthenticated && (
                <SubscriptionStatus onUpgrade={() => setShowSubscriptionPlans(true)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <MissingSectionsModal
        isOpen={showMissingSections}
        onClose={() => setShowMissingSections(false)}
        missingSections={missingSections}
        onSectionsProvided={handleMissingSectionsProvided}
      />

      <SubscriptionPlans
        isOpen={showSubscriptionPlans}
        onClose={() => setShowSubscriptionPlans(false)}
        onSubscriptionSuccess={handleSubscriptionSuccess}
      />
    </div>
  );
};

export default ResumeOptimizer;