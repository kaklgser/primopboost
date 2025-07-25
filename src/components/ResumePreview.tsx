import React from 'react';
import { ResumeData, UserType } from '../types/resume';

interface ResumePreviewProps {
  resumeData: ResumeData;
  userType?: UserType;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ resumeData, userType = 'experienced' }) => {
  // Debug logging to check what data we're receiving
  console.log('ResumePreview received data:', resumeData);
  
  // Add validation to ensure we have valid resume data
  if (!resumeData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="text-gray-500 mb-4">No resume data available</div>
          <div className="text-sm text-gray-400">Please ensure your resume has been properly optimized</div>
        </div>
      </div>
    );
  }

  // Ensure we have at least a name to display
  if (!resumeData.name || resumeData.name.trim() === '') {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="text-gray-500 mb-4">Invalid resume data</div>
          <div className="text-sm text-gray-400">Resume name is missing or empty</div>
        </div>
      </div>
    );
  }

  // --- Moved style constants here (top of component function body) ---
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '10pt', // Corresponds to PDF_CONFIG.fonts.sectionTitle.size
    fontWeight: 'bold',
    marginBottom: '4pt', // Corresponds to PDF_CONFIG.spacing.sectionSpacingAfter (after underline)
    marginTop: '10pt',  // Corresponds to PDF_CONFIG.spacing.sectionSpacingBefore
    fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    letterSpacing: '0.5pt',
    textTransform: 'uppercase'
  };

  const sectionUnderlineStyle: React.CSSProperties = {
    borderBottomWidth: '0.5pt',
    borderColor: '#808080', // PDF_CONFIG.colors.secondary converted to hex or RGB
    marginBottom: '4pt', // Corresponds to PDF_CONFIG.spacing.sectionSpacingAfter
    height: '1px' // Ensure line height
  };

  const bodyTextStyle: React.CSSProperties = {
    fontSize: '9.5pt', // Corresponds to PDF_CONFIG.fonts.body.size
    lineHeight: '1.25', // Corresponds to PDF_CONFIG.spacing.lineHeight
    fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    color: '#000' // PDF_CONFIG.colors.primary
  };
  // --- End of moved style constants ---


  // Build contact info on a single line with | separator and correct font sizes
  const buildContactInfo = () => {
    const parts: React.ReactNode[] = [];

    // Add location first if available
    if (resumeData.location) {
      parts.push(<span key="location">{resumeData.location}</span>);
    }
    
    if (resumeData.phone) {
      parts.push(<a key="phone" href={`tel:${resumeData.phone}`} className="text-blue-600 hover:text-blue-800 transition-colors">{resumeData.phone}</a>);
    }
    
    if (resumeData.email) {
      parts.push(<a key="email" href={`mailto:${resumeData.email}`} className="text-blue-600 hover:text-blue-800 transition-colors">{resumeData.email}</a>);
    }
    
    if (resumeData.linkedin) {
      parts.push(<a key="linkedin" href={resumeData.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">{resumeData.linkedin}</a>);
    }
    
    if (resumeData.github) {
      parts.push(<a key="github" href={resumeData.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">{resumeData.github}</a>);
    }

    // Join with | separator
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && <span className="mx-1" style={{ fontSize: '10pt' }}>|</span>}
      </React.Fragment>
    ));
  };

  const contactElements = buildContactInfo();

  // Define section order based on user type
  const getSectionOrder = () => {
    if (userType === 'experienced') {
      return [
        'summary',
        'workExperience',
        'projects',
        'skills',
        'certifications',
        'education'
      ];
    } else { // Fresher
      return [
        'summary', // Optional for freshers
        'education', // Prominent for freshers
        'workExperience', // Internships & Work Experience
        'projects', // Academic projects
        'skills',
        'certifications',
        'achievementsAndExtras' // Combined section for fresher extras
      ];
    }
  };

  const sectionOrder = getSectionOrder();

  const renderSection = (sectionName: string) => {
    // Style constants are now accessible from outside this function scope
    // No need to redefine them here.

    switch (sectionName) {
      case 'summary':
        if (!resumeData.summary || resumeData.summary.trim() === '') return null;
        return (
          <div style={{ marginBottom: '12pt' /* Equivalent to afterSubsection or spacing after section */ }}>
            <h2 style={sectionTitleStyle}>
              PROFESSIONAL SUMMARY
            </h2>
            <div style={sectionUnderlineStyle}></div>
            <p style={{ ...bodyTextStyle, marginBottom: '6pt' }}>
              {resumeData.summary}
            </p>
          </div>
        );

      case 'workExperience':
        if (!resumeData.workExperience || resumeData.workExperience.length === 0) return null;
        return (
          <div style={{ marginBottom: '12pt' }}>
            <h2 style={sectionTitleStyle}>
              {userType === 'fresher' ? 'INTERNSHIPS & WORK EXPERIENCE' : 'EXPERIENCE'}
            </h2>
            <div style={sectionUnderlineStyle}></div>
            
            {resumeData.workExperience.map((job, index) => (
              <div key={index} style={{ marginBottom: '4pt' /* Corresponds to PDF_CONFIG.spacing.afterSubsection for jobs */ }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2pt' }}>
                  <div>
                    <div style={{ fontSize: '9.5pt', fontWeight: 'bold', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                      {job.role}
                    </div>
                    <div style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                      {job.company}{job.location ? `, ${job.location}` : ''} {/* Add location */}
                    </div>
                  </div>
                  <div style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                    {job.year}
                  </div>
                </div>
{job.bullets && job.bullets.length > 0 && (
                  <ul style={{ marginLeft: '12pt' /* PDF_CONFIG.spacing.bulletIndent */, listStyleType: 'disc' }}>
                    {job.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} style={{ ...bodyTextStyle, marginBottom: '1pt' /* Small space between bullets */ }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );

      case 'education':
        if (!resumeData.education || resumeData.education.length === 0) return null;
        return (
          <div style={{ marginBottom: '12pt' }}>
            <h2 style={sectionTitleStyle}>
              EDUCATION
            </h2>
            <div style={sectionUnderlineStyle}></div>
            
            {resumeData.education.map((edu, index) => (
              <div key={index} style={{ marginBottom: '4pt' /* Corresponds to PDF_CONFIG.spacing.afterSubsection */ }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '9.5pt', fontWeight: 'bold', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                      {edu.degree}
                    </div>
                    <div style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                      {edu.school}{edu.location ? `, ${edu.location}` : ''} {/* Add location for education */}
                    </div>
                    {edu.cgpa && (
                      <div style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: '#4B5563' /* Secondary color */ }}>
                        CGPA: {edu.cgpa}
                      </div>
                    )}
                    {edu.relevantCoursework && edu.relevantCoursework.length > 0 && (
                        <div style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: '#4B5563' }}>
                            Relevant Coursework: {edu.relevantCoursework.join(', ')}
                        </div>
                    )}
                  </div>
                  <div style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                    {edu.year}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'projects':
        if (!resumeData.projects || resumeData.projects.length === 0) return null;
        return (
          <div style={{ marginBottom: '12pt' }}>
            <h2 style={sectionTitleStyle}>
              {userType === 'fresher' ? 'ACADEMIC PROJECTS' : 'PROJECTS'}
            </h2>
            <div style={sectionUnderlineStyle}></div>
            
            {resumeData.projects.map((project, index) => (
              <div key={index} style={{ marginBottom: '4pt' /* Corresponds to PDF_CONFIG.spacing.afterSubsection */ }}>
                <div style={{ fontSize: '9.5pt', fontWeight: 'bold', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif', marginBottom: '2pt' }}>
                  {project.title}
                </div>
                {project.bullets && project.bullets.length > 0 && (
                  <ul style={{ marginLeft: '12pt' /* PDF_CONFIG.spacing.bulletIndent */, listStyleType: 'disc' }}>
                    {project.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} style={{ ...bodyTextStyle, marginBottom: '1pt' }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );

      case 'skills':
        if (!resumeData.skills || resumeData.skills.length === 0) return null;
        return (
          <div style={{ marginBottom: '12pt' }}>
            <h2 style={sectionTitleStyle}>
              TECHNICAL SKILLS
            </h2>
            <div style={sectionUnderlineStyle}></div>
            
            {resumeData.skills.map((skill, index) => (
              <div key={index} style={{ marginBottom: '2pt' /* Small space between skills */ }}>
                <span style={{ fontSize: '9.5pt', fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                  <strong style={{ fontWeight: 'bold' }}>• {skill.category}:</strong>{' '}
                  {skill.list && skill.list.join(', ')}
                </span>
              </div>
            ))}
          </div>
        );

      case 'certifications':
        if (!resumeData.certifications || resumeData.certifications.length === 0) return null;
        return (
          <div style={{ marginBottom: '12pt' }}>
            <h2 style={sectionTitleStyle}>
              CERTIFICATIONS
            </h2>
            <div style={sectionUnderlineStyle}></div>
            
            <ul style={{ marginLeft: '12pt' /* PDF_CONFIG.spacing.bulletIndent */, listStyleType: 'disc' }}>
              {resumeData.certifications.map((cert, index) => {
                let certText = '';
                if (typeof cert === 'string') {
                  certText = cert;
                } else if (cert && typeof cert === 'object') {
                  if ('title' in cert && 'issuer' in cert) {
                    certText = `${String(cert.title)} - ${String(cert.issuer)}`;
                  } else if ('title' in cert && 'description' in cert) {
                    certText = `${String(cert.title)} - ${String(cert.description)}`;
                  } else if ('name' in cert) {
                    certText = String(cert.name);
                  } else if ('title' in cert) {
                    certText = String(cert.title);
                  } else if ('description' in cert) {
                    certText = cert.description;
                  } else {
                    certText = Object.values(cert).filter(Boolean).join(' - ');
                  }
                } else {
                  certText = String(cert);
                }
                
                return (
                  <li key={index} style={{ ...bodyTextStyle, marginBottom: '1pt' }}>
                    {certText}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      
      case 'achievementsAndExtras': // Combined section for freshers
        const hasAchievements = resumeData.achievements && resumeData.achievements.length > 0;
        const hasExtraCurricular = resumeData.extraCurricularActivities && resumeData.extraCurricularActivities.length > 0;
        const hasLanguages = resumeData.languagesKnown && resumeData.languagesKnown.length > 0;
        const hasPersonalDetails = resumeData.personalDetails && resumeData.personalDetails.trim() !== '';

        if (!hasAchievements && !hasExtraCurricular && !hasLanguages && !hasPersonalDetails) return null;

        return (
          <div style={{ marginBottom: '12pt' }}>
            <h2 style={sectionTitleStyle}>
              ACHIEVEMENTS & EXTRAS
            </h2>
            <div style={sectionUnderlineStyle}></div>

            {hasAchievements && (
              <div style={{ marginBottom: '4pt' }}>
                <p style={{ ...bodyTextStyle, fontWeight: 'bold', marginBottom: '2pt' }}>Achievements:</p>
                <ul style={{ marginLeft: '18pt', listStyleType: 'disc' }}>
                  {resumeData.achievements!.map((item, index) => (
                    <li key={index} style={{ ...bodyTextStyle, marginBottom: '1pt' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasExtraCurricular && (
              <div style={{ marginBottom: '4pt' }}>
                <p style={{ ...bodyTextStyle, fontWeight: 'bold', marginBottom: '2pt' }}>Extra-curricular Activities:</p>
                <ul style={{ marginLeft: '18pt', listStyleType: 'disc' }}>
                  {resumeData.extraCurricularActivities!.map((item, index) => (
                    <li key={index} style={{ ...bodyTextStyle, marginBottom: '1pt' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasLanguages && (
              <div style={{ marginBottom: '4pt' }}>
                <p style={{ ...bodyTextStyle, fontWeight: 'bold', marginBottom: '2pt' }}>Languages Known:</p>
                <ul style={{ marginLeft: '18pt', listStyleType: 'disc' }}>
                  {resumeData.languagesKnown!.map((item, index) => (
                    <li key={index} style={{ ...bodyTextStyle, marginBottom: '1pt' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasPersonalDetails && (
              <div style={{ marginBottom: '4pt' }}>
                <p style={{ ...bodyTextStyle, fontWeight: 'bold', marginBottom: '2pt' }}>Personal Details:</p>
                <p style={{ ...bodyTextStyle, marginLeft: '18pt' }}>{resumeData.personalDetails}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card">
      <div 
        className="pt-4 px-4 pb-6 sm:pt-6 sm:px-6 sm:pb-8 lg:px-8 max-h-[70vh] sm:max-h-[80vh] lg:max-h-[800px] overflow-y-auto" 
        style={{ 
          fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif', 
          fontSize: '9.5pt', /* PDF_CONFIG.fonts.body.size */
          lineHeight: '1.25', /* PDF_CONFIG.spacing.lineHeight */
          color: '#000',
          padding: '15pt' /* Mimic PDF margins around content */
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '18pt' /* Spacing after contact line */ }}>
          <h1 style={{ 
            fontSize: '18pt', /* PDF_CONFIG.fonts.name.size */
            fontWeight: 'bold', 
            letterSpacing: '1pt',
            marginBottom: '4pt', /* PDF_CONFIG.spacing.afterName */
            fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            textTransform: 'uppercase'
          }}>
            {resumeData.name}
          </h1>
          
          {/* Contact Information */}
          {contactElements.length > 0 && (
            <div style={{ 
              fontSize: '9pt', /* PDF_CONFIG.fonts.contact.size */
              fontFamily: 'Calibri, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
              marginBottom: '6pt', /* PDF_CONFIG.spacing.afterContact */
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              flexWrap: 'wrap' 
            }}>
              {contactElements}
            </div>
          )}
          
          {/* Horizontal line under contact info */}
          <div style={{ 
            borderBottomWidth: '0.5pt', /* PDF_CONFIG line width */
            borderColor: '#404040', /* PDF_CONFIG color */
            height: '1px', /* Ensure line is visible */
            margin: '0 auto', /* Center the line */
            width: 'calc(100% - 20mm)' /* Adjust width if needed to match PDF_CONFIG line start/end */
          }}></div>
        </div>

        {/* Dynamic sections based on user type */}
        {sectionOrder.map((sectionName) => renderSection(sectionName))}
        
        {/* The GitHub References Section has been removed as per requirement. */}
      </div>
    </div>
  );
};