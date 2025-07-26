import jsPDF from 'jspdf';
import { ResumeData } from '../types/resume';
import { saveAs } from 'file-saver';

// Professional PDF Layout Constants - Updated to meet specifications
const PDF_CONFIG = {
  // A4 dimensions in mm
  pageWidth: 210,
  pageHeight: 297,

  // Professional margins in mm (0.5 inch = 12.7mm, 0.7 inch = 17.78mm)
  margins: {
    top: 15,    // ~0.6 inches
    bottom: 15, // ~0.6 inches
    left: 15,   // ~0.6 inches
    right: 15   // ~0.6 inches
  },

  // Calculated content area
  get contentWidth() { return this.pageWidth - this.margins.left - this.margins.right; },
  get contentHeight() { return this.pageHeight - this.margins.top - this.margins.bottom; },

  // Typography settings - Professional specifications
  fonts: {
    name: { size: 20, weight: 'bold' },              // Slightly increased for prominence
    contact: { size: 9, weight: 'normal' },          // Reduced for compactness
    sectionTitle: { size: 10, weight: 'bold' },      // Reduced for compactness
    jobTitle: { size: 9.5, weight: 'bold' },         // Reduced for compactness
    company: { size: 9.5, weight: 'normal' },
    year: { size: 9.5, weight: 'normal' },
    body: { size: 9.5, weight: 'normal' }            // Adjusted to 9.5pt
  },
  spacing: {
    nameFromTop: 20, // Start name further down slightly to match mock
    afterName: 2,
    afterContact: 3,
    sectionSpacingBefore: 5, // Space before section title
    sectionSpacingAfter: 1, // Space after section underline
    bulletListSpacing: 0, // Reduced to minimize space between bullets
    afterSubsection: 4, // Space between sub-sections (e.g., jobs, projects)
    lineHeight: 1.2, // Tighter line height
    bulletIndent: 4
  },
  colors: {
    primary: [0, 0, 0],
    secondary: [80, 80, 80],
    accent: [37, 99, 235]
  }
};

interface DrawPosition {
  x: number;
  y: number;
}

interface PageState {
  currentPage: number;
  currentY: number;
  doc: jsPDF;
}

// Helper function to detect mobile device
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Helper function to trigger download on mobile
const triggerMobileDownload = (blob: Blob, filename: string): void => {
  try {
    // For mobile devices, use a more reliable download method
    if (isMobileDevice()) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';

      // Add to DOM, click, and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up the URL object after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } else {
      // For desktop, use saveAs
      saveAs(blob, filename);
    }
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: try to open in new window
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
};

// Helper function to check if content fits on current page
function checkPageSpace(state: PageState, requiredHeight: number): boolean {
  const maxY = PDF_CONFIG.pageHeight - PDF_CONFIG.margins.bottom; // Corrected calculation
  return (state.currentY + requiredHeight) <= maxY;
}

// Add new page and reset position
function addNewPage(state: PageState): void {
  state.doc.addPage();
  state.currentPage++;
  state.currentY = PDF_CONFIG.margins.top;

  // Add page number
  const pageText = `Page ${state.currentPage}`;
  state.doc.setFont('Calibri', 'normal');
  state.doc.setFontSize(9);
  state.doc.setTextColor(128, 128, 128); // Gray

  const pageWidth = state.doc.internal.pageSize.getWidth();
  const textWidth = state.doc.getTextWidth(pageText);
  state.doc.text(pageText, pageWidth - PDF_CONFIG.margins.right - textWidth, PDF_CONFIG.pageHeight - PDF_CONFIG.margins.bottom / 2); // Adjusted Y for page number
}

// Draw text with automatic wrapping and return height used
function drawText(
  state: PageState,
  text: string,
  x: number,
  options: {
    fontSize?: number;
    fontWeight?: string;
    color?: number[];
    maxWidth?: number;
    align?: 'left' | 'center' | 'right';
  } = {}
): number {
  const {
    fontSize = PDF_CONFIG.fonts.body.size,
    fontWeight = 'normal',
    color = PDF_CONFIG.colors.primary,
    maxWidth = PDF_CONFIG.contentWidth,
    align = 'left'
  } = options;

  state.doc.setFont('Calibri', fontWeight);
  state.doc.setFontSize(fontSize);
  state.doc.setTextColor(color[0], color[1], color[2]);

  // Split text to fit width
  const lines = state.doc.splitTextToSize(text, maxWidth);
  const lineHeight = fontSize * PDF_CONFIG.spacing.lineHeight * 0.352778; // Convert pt to mm
  const totalHeight = lines.length * lineHeight;

  // Check if we need a new page
  if (!checkPageSpace(state, totalHeight)) {
    addNewPage(state);
  }

  // Calculate x position based on alignment
  let textX = x;
  if (align === 'center') {
    textX = PDF_CONFIG.margins.left + (PDF_CONFIG.contentWidth / 2);
  } else if (align === 'right') {
    textX = PDF_CONFIG.margins.left + PDF_CONFIG.contentWidth;
  }

  // Draw each line
  lines.forEach((line: string, index: number) => {
    const yPos = state.currentY + (index * lineHeight);

    if (align === 'center') {
      const lineWidth = state.doc.getTextWidth(line);
      state.doc.text(line, textX - (lineWidth / 2), yPos);
    } else if (align === 'right') {
      const lineWidth = state.doc.getTextWidth(line);
      state.doc.text(line, textX - lineWidth, yPos);
    } else {
      state.doc.text(line, textX, yPos);
    }
  });

  state.currentY += totalHeight;
  return totalHeight;
}

// Draw section title with underline and proper spacing
function drawSectionTitle(state: PageState, title: string): number {
  // Add space before section title
  state.currentY += PDF_CONFIG.spacing.sectionSpacingBefore;

  // Check if adding title and underline would push off page
  const estimatedSectionHeaderHeight = PDF_CONFIG.fonts.sectionTitle.size * PDF_CONFIG.spacing.lineHeight * 0.352778 + 2; // Title height + underline gap
  if (!checkPageSpace(state, estimatedSectionHeaderHeight)) {
      addNewPage(state);
  }

  const titleHeight = drawText(state, title.toUpperCase(), PDF_CONFIG.margins.left, {
    fontSize: PDF_CONFIG.fonts.sectionTitle.size,
    fontWeight: PDF_CONFIG.fonts.sectionTitle.weight,
    color: PDF_CONFIG.colors.primary
  });

  // Add underline
  const underlineY = state.currentY - (PDF_CONFIG.fonts.sectionTitle.size * 0.352778 / 2) + 0.5; // Adjust Y for underline position
  state.doc.setDrawColor(128, 128, 128); // Gray underline
  state.doc.setLineWidth(0.3);
  state.doc.line(
    PDF_CONFIG.margins.left,
    underlineY,
    PDF_CONFIG.margins.left + PDF_CONFIG.contentWidth,
    underlineY
  );

  // Add space after section title
  state.currentY += PDF_CONFIG.spacing.sectionSpacingAfter;
  return titleHeight + PDF_CONFIG.spacing.sectionSpacingBefore + PDF_CONFIG.spacing.sectionSpacingAfter;
}

// Draw contact information with vertical bars as separators
function drawContactInfo(state: PageState, resumeData: ResumeData): number {
  const contactParts: string[] = [];

  // Only add location if it exists
  if (resumeData.location) {
    contactParts.push(`${resumeData.location}`);
  }
  if (resumeData.phone) {
    contactParts.push(`${resumeData.phone}`);
  }
  if (resumeData.email) {
    contactParts.push(`${resumeData.email}`);
  }
  if (resumeData.linkedin) {
    contactParts.push(`${resumeData.linkedin}`);
  }
  if (resumeData.github) {
    contactParts.push(`${resumeData.github}`);
  }

  if (contactParts.length === 0) return 0;

  // Use vertical bars as separators
  const contactText = contactParts.join(' | ');
  const height = drawText(state, contactText, PDF_CONFIG.margins.left, {
    fontSize: PDF_CONFIG.fonts.contact.size,
    fontWeight: PDF_CONFIG.fonts.contact.weight,
    color: PDF_CONFIG.colors.primary,
    align: 'center'
  });

  state.currentY += PDF_CONFIG.spacing.afterContact;
  return height + PDF_CONFIG.spacing.afterContact;
}

// Draw work experience section
function drawWorkExperience(state: PageState, workExperience: any[], userType: UserType = 'experienced'): number {
  if (!workExperience || workExperience.length === 0) return 0;

  const sectionTitle = userType === 'fresher' ? 'INTERNSHIPS & WORK EXPERIENCE' : 'EXPERIENCE';
  let totalHeight = drawSectionTitle(state, sectionTitle);

  workExperience.forEach((job, index) => {
    // Check if we need space for at least the job header and one bullet
    const estimatedJobHeaderHeight = (PDF_CONFIG.fonts.jobTitle.size + PDF_CONFIG.fonts.company.size + PDF_CONFIG.fonts.year.size) * PDF_CONFIG.spacing.lineHeight * 0.352778;
    const estimatedMinBulletHeight = PDF_CONFIG.fonts.body.size * PDF_CONFIG.spacing.lineHeight * 0.352778;
    if (!checkPageSpace(state, estimatedJobHeaderHeight + estimatedMinBulletHeight + PDF_CONFIG.spacing.bulletListSpacing * 2 + PDF_CONFIG.spacing.afterSubsection)) {
      addNewPage(state);
    }

    // Capture Y before drawing job details for year alignment
    const initialYForJob = state.currentY;

    // Job title
    drawText(state, job.role, PDF_CONFIG.margins.left, {
      fontSize: PDF_CONFIG.fonts.jobTitle.size,
      fontWeight: PDF_CONFIG.fonts.jobTitle.weight
    });

    // Company name and Year
    const companyYearText = `${job.company} ${job.location ? `, ${job.location}` : ''}`; // Include location here
    state.doc.setFont('Calibri', PDF_CONFIG.fonts.company.weight);
    state.doc.setFontSize(PDF_CONFIG.fonts.company.size);
    state.doc.setTextColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);

    const companyTextLines = state.doc.splitTextToSize(companyYearText, PDF_CONFIG.contentWidth / 1.5); // Give space for year
    const companyHeight = companyTextLines.length * (PDF_CONFIG.fonts.company.size * PDF_CONFIG.spacing.lineHeight * 0.352778);

    const yearText = job.year;
    state.doc.setFont('Calibri', PDF_CONFIG.fonts.year.weight);
    state.doc.setFontSize(PDF_CONFIG.fonts.year.size);
    const yearWidth = state.doc.getTextWidth(yearText);
    const yearX = PDF_CONFIG.margins.left + PDF_CONFIG.contentWidth - yearWidth;

    // Calculate Y for year, aiming to align it with the top line of job title/company
    const yearY = initialYForJob + (PDF_CONFIG.fonts.jobTitle.size * 0.352778); // Align with job title's baseline

    state.doc.text(yearText, yearX, yearY);
    state.doc.text(companyYearText, PDF_CONFIG.margins.left, state.currentY); // Draw company name on its own line
    state.currentY += companyHeight;

    state.currentY += 1; // Small gap before bullets

    // Add spacing before bullet list
    if (job.bullets && job.bullets.length > 0) {
      state.currentY += PDF_CONFIG.spacing.bulletListSpacing;

      job.bullets.forEach((bullet: string) => {
        const bulletText = `• ${bullet}`;
        const bulletHeight = drawText(state, bulletText, PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent, {
          fontSize: PDF_CONFIG.fonts.body.size,
          maxWidth: PDF_CONFIG.contentWidth - PDF_CONFIG.spacing.bulletIndent
        });
        totalHeight += bulletHeight;
      });

      state.currentY += PDF_CONFIG.spacing.bulletListSpacing;
    }

    // Add space between jobs (except for the last one)
    if (index < workExperience.length - 1) {
      state.currentY += PDF_CONFIG.spacing.afterSubsection;
      totalHeight += PDF_CONFIG.spacing.afterSubsection;
    }
  });

  return totalHeight;
}

// Draw education section
function drawEducation(state: PageState, education: any[]): number {
  if (!education || education.length === 0) return 0;

  state.currentY +=4; // 👈 Added spacing before EDUCATION title

  let totalHeight = drawSectionTitle(state, 'EDUCATION');

  education.forEach((edu, index) => {
    // ADDED: Capture initial Y position for this education entry
    // This ensures yearY is calculated relative to the start of the current education block.
    const initialYForEdu = state.currentY; // <--- FIX: Defined initialYForEdu here

    if (!checkPageSpace(state, 20)) {
      addNewPage(state);
    }

    const degreeHeight = drawText(state, edu.degree, PDF_CONFIG.margins.left, {
      fontSize: PDF_CONFIG.fonts.jobTitle.size,
      fontWeight: PDF_CONFIG.fonts.jobTitle.weight
    });

    const schoolHeight = drawText(state, edu.school, PDF_CONFIG.margins.left, {
      fontSize: PDF_CONFIG.fonts.company.size,
      fontWeight: PDF_CONFIG.fonts.company.weight,
      color: PDF_CONFIG.colors.primary
    });

    // Add CGPA if present
    let cgpaHeight = 0;
    if (edu.cgpa) {
      cgpaHeight = drawText(state, `CGPA: ${edu.cgpa}`, PDF_CONFIG.margins.left, {
        fontSize: PDF_CONFIG.fonts.body.size,
        fontWeight: PDF_CONFIG.fonts.body.weight,
        color: PDF_CONFIG.colors.secondary
      });
    }

    // Relevant Coursework
    if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
      const courseworkText = `Relevant Coursework: ${edu.relevantCoursework.join(', ')}`;
      const courseworkHeight = drawText(state, courseworkText, PDF_CONFIG.margins.left, {
        fontSize: PDF_CONFIG.fonts.body.size,
        fontWeight: PDF_CONFIG.fonts.body.weight,
        color: PDF_CONFIG.colors.secondary,
        maxWidth: PDF_CONFIG.contentWidth
      });
      totalHeight += courseworkHeight;
    }


    state.doc.setFont('Calibri', 'normal');
    state.doc.setFontSize(PDF_CONFIG.fonts.year.size);
    state.doc.setTextColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);

    const yearWidth = state.doc.getTextWidth(edu.year);
    const yearX = PDF_CONFIG.margins.left + PDF_CONFIG.contentWidth - yearWidth;
    const yearY = initialYForEdu + (PDF_CONFIG.fonts.jobTitle.size * 0.352778); // This line will now correctly use initialYForEdu

    state.doc.text(edu.year, yearX, yearY);

    totalHeight += degreeHeight + schoolHeight + cgpaHeight;

    if (index < education.length - 1) {
      state.currentY += 3;
      totalHeight += PDF_CONFIG.spacing.afterSubsection;
    }
  });

  return totalHeight;
}


// Draw projects section
function drawProjects(state: PageState, projects: any[]): number {
  if (!projects || projects.length === 0) return 0;

  // Collect GitHub URLs for referenced projects section
  const githubProjects = projects.filter(project => project.githubUrl);

  let totalHeight = drawSectionTitle(state, 'PROJECTS');

  projects.forEach((project, index) => {
    // Check space for project title and at least one bullet
    if (!checkPageSpace(state, 25)) {
      addNewPage(state);
    }

    // Project title
    const titleHeight = drawText(state, project.title, PDF_CONFIG.margins.left, {
      fontSize: PDF_CONFIG.fonts.jobTitle.size,
      fontWeight: PDF_CONFIG.fonts.jobTitle.weight
    });

    totalHeight += titleHeight;
    state.currentY += 2; // Small gap before bullets

    // Add spacing before bullet list
    if (project.bullets && project.bullets.length > 0) {
      state.currentY += PDF_CONFIG.spacing.bulletListSpacing;

      project.bullets.forEach((bullet: string) => {
        const bulletText = `• ${bullet}`;
        const bulletHeight = drawText(state, bulletText, PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent, {
          fontSize: PDF_CONFIG.fonts.body.size,
          maxWidth: PDF_CONFIG.contentWidth - PDF_CONFIG.spacing.bulletIndent
        });
        totalHeight += bulletHeight;
      });

      // Add spacing after bullet list
      state.currentY += PDF_CONFIG.spacing.bulletListSpacing;
    }

    // Add space between projects (except for the last one)
    if (index < projects.length - 1) {
      state.currentY += PDF_CONFIG.spacing.afterSubsection;
      totalHeight += PDF_CONFIG.spacing.afterSubsection;
    }
  });

  return totalHeight;
}

// drawGitHubReferences function and its call have been removed as per requirement.
// It will not be present in this file.


// Draw skills section
function drawSkills(state: PageState, skills: any[]): number {
  if (!skills || skills.length === 0) return 0;

  let totalHeight = drawSectionTitle(state, 'SKILLS');

  // ADDED: Define estimatedSkillLineHeight
  // This calculation is crucial for correct line spacing in multi-line skill lists.
  const estimatedSkillLineHeight = PDF_CONFIG.fonts.body.size * PDF_CONFIG.spacing.lineHeight * 0.352778; // <--- FIX: Defined estimatedSkillLineHeight here

  skills.forEach((skill, index) => {
    // Check space
    if (!checkPageSpace(state, 15)) {
      addNewPage(state);
    }

    const x = PDF_CONFIG.margins.left;
    const categoryText = `${skill.category}: `;
    const listText = skill.list ? skill.list.join(', ') : '';

    state.doc.setFont('Calibri', 'bold');
    state.doc.setFontSize(PDF_CONFIG.fonts.body.size);
    state.doc.setTextColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);

    const categoryWidth = state.doc.getTextWidth(categoryText);

    // Draw bold category text
    state.doc.text(categoryText, x, state.currentY);

    state.doc.setFont('Calibri', 'normal');

    // Draw normal-weight list text right after category
    const remainingWidth = PDF_CONFIG.contentWidth - categoryWidth;
    const lines = state.doc.splitTextToSize(listText, remainingWidth);

    lines.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
            state.doc.text(line, x + categoryWidth, state.currentY);
        } else {
            // For subsequent lines, draw from the beginning of the content area
            state.doc.text(line, x, state.currentY + (lineIndex * estimatedSkillLineHeight));
        }
    });

    state.currentY += lines.length * estimatedSkillLineHeight; // Advance Y by total height of drawn lines
    totalHeight += lines.length * estimatedSkillLineHeight;

    // Add small space between skill categories
    if (index < skills.length - 1) {
      state.currentY += 2;
      totalHeight += 2;
    }
  });

  return totalHeight;
}


// Draw certifications section
function drawCertifications(state: PageState, certifications: any[]): number {
  if (!certifications || certifications.length === 0) return 0;

  let totalHeight = drawSectionTitle(state, 'CERTIFICATIONS');

  // Add spacing before bullet list
  state.currentY += PDF_CONFIG.spacing.bulletListSpacing;

  certifications.forEach((cert) => {
    // Check space
    if (!checkPageSpace(state, 10)) {
      addNewPage(state);
    }

    let certText = '';
    if (typeof cert === 'string') {
      certText = cert;
    } else if (cert && typeof cert === 'object') {
      // Handle object format with title and issuer
      if ('title' in cert && 'issuer' in cert) {
        certText = `${cert.title} - ${cert.issuer}`;
      } else if ('name' in cert) {
        certText = cert.name;
      } else {
        certText = JSON.stringify(cert);
      }
    } else {
      certText = String(cert);
    }

    const bulletText = `• ${certText}`;
    const certHeight = drawText(state, bulletText, PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent, {
      fontSize: PDF_CONFIG.fonts.body.size,
      maxWidth: PDF_CONFIG.contentWidth - PDF_CONFIG.spacing.bulletIndent
    });

    totalHeight += certHeight;
  });

  // Add spacing after bullet list
  state.currentY += PDF_CONFIG.spacing.bulletListSpacing;

  return totalHeight;
}

// Draw professional summary section
function drawProfessionalSummary(state: PageState, summary: string): number {
  if (!summary) return 0;

  let totalHeight = drawSectionTitle(state, 'PROFESSIONAL SUMMARY');

  // Add 3pt spacing before summary text
  state.currentY += 3;

  const summaryHeight = drawText(state, summary, PDF_CONFIG.margins.left, {
    fontSize: PDF_CONFIG.fonts.body.size,
    fontWeight: PDF_CONFIG.fonts.body.weight,
    maxWidth: PDF_CONFIG.contentWidth
  });

  totalHeight += summaryHeight;
  state.currentY += 3; // Add small space after summary
  return totalHeight;
}


// Draw achievements/extras for fresher
function drawAchievementsAndExtras(state: PageState, resumeData: ResumeData): number {
  const hasAchievements = resumeData.achievements && resumeData.achievements.length > 0;
  const hasExtraCurricular = resumeData.extraCurricularActivities && resumeData.extraCurricularActivities.length > 0;
  const hasLanguages = resumeData.languagesKnown && resumeData.languagesKnown.length > 0;
  const hasPersonalDetails = resumeData.personalDetails && resumeData.personalDetails.trim() !== '';

  if (!hasAchievements && !hasExtraCurricular && !hasLanguages && !hasPersonalDetails) return 0;

  let totalHeight = drawSectionTitle(state, 'ACHIEVEMENTS & EXTRAS');

  const addItems = (title: string, items: string[] | undefined) => {
      if (items && items.length > 0) {
          if (!checkPageSpace(state, 10)) { addNewPage(state); }
          drawText(state, title, PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent, {
              fontSize: PDF_CONFIG.fonts.body.size,
              fontWeight: 'bold',
              color: PDF_CONFIG.colors.secondary
          });
          items.forEach(item => {
              const itemHeight = drawText(state, `• ${item}`, PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent * 1.5, {
                  fontSize: PDF_CONFIG.fonts.body.size,
                  maxWidth: PDF_CONFIG.contentWidth - PDF_CONFIG.spacing.bulletIndent * 1.5
              });
              totalHeight += itemHeight;
          });
          state.currentY += 2; // Small space after each sub-list
      }
  };

  addItems('Achievements:', resumeData.achievements);
  addItems('Extra-curricular Activities:', resumeData.extraCurricularActivities);
  addItems('Languages Known:', resumeData.languagesKnown);

  if (hasPersonalDetails) {
      if (!checkPageSpace(state, 10)) { addNewPage(state); }
      drawText(state, 'Personal Details:', PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent, {
          fontSize: PDF_CONFIG.fonts.body.size,
          fontWeight: 'bold',
          color: PDF_CONFIG.colors.secondary
      });
      const personalDetailsHeight = drawText(state, resumeData.personalDetails, PDF_CONFIG.margins.left + PDF_CONFIG.spacing.bulletIndent * 1.5, {
          fontSize: PDF_CONFIG.fonts.body.size,
          maxWidth: PDF_CONFIG.contentWidth - PDF_CONFIG.spacing.bulletIndent * 1.5
      });
      totalHeight += personalDetailsHeight;
      state.currentY += 2;
  }

  return totalHeight;
}


// Main export function with mobile optimization
export const exportToPDF = async (resumeData: ResumeData, userType: UserType = 'experienced'): Promise<void> => {
  // Format filename with role if available
  const getFileName = (data: ResumeData, fileExtension: 'pdf' | 'doc') => {
    const namePart = data.name.replace(/\s+/g, '_');
    const rolePart = data.targetRole ? `_${data.targetRole.replace(/\s+/g, '_')}` : ''; // Re-added rolePart logic
    return `${namePart}${rolePart}.${fileExtension}`; // Reverted to include rolePart
  };

  try {
    if (isMobileDevice()) {
      console.log('Starting PDF generation for mobile device...');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Add Calibri font (assuming it's loaded or provided by default)
    // You might need to add: doc.addFont('Calibri', 'Calibri', 'normal');
    // and doc.addFont('Calibri', 'Calibri', 'bold');
    // if not already configured for jsPDF.

    const state: PageState = {
      currentPage: 1,
      currentY: PDF_CONFIG.margins.top, // Start Y at top margin
      doc
    };

    doc.setProperties({
      title: `${resumeData.name} - Resume`,
      subject: 'Professional Resume',
      author: resumeData.name,
      creator: 'Resume Optimizer',
      producer: 'Resume Optimizer PDF Generator'
    });

    // Draw header (name)
    state.currentY = PDF_CONFIG.spacing.nameFromTop; // Start name lower for better top margin
    drawText(state, resumeData.name.toUpperCase(), PDF_CONFIG.margins.left, {
      fontSize: PDF_CONFIG.fonts.name.size,
      fontWeight: PDF_CONFIG.fonts.name.weight,
      align: 'center'
    });
    state.currentY += PDF_CONFIG.spacing.afterName;

    // Draw contact information
    drawContactInfo(state, resumeData);

    // Add separator line
    const separatorY = state.currentY;
    doc.setDrawColor(0, 0, 0); // Dark gray
    doc.setLineWidth(0.4);
    doc.line(
      PDF_CONFIG.margins.left, // Start from left margin
      separatorY,
      PDF_CONFIG.pageWidth - PDF_CONFIG.margins.right, // End at right margin
      separatorY
    );
    state.currentY += 3; // Space after separator line

    // Conditional rendering of Professional Summary based on userType and content
    if (resumeData.summary && resumeData.summary.trim() !== '') {
      drawProfessionalSummary(state, resumeData.summary);
    }

    // Draw sections based on user type and presence of data
    if (userType === 'experienced') {
        drawWorkExperience(state, resumeData.workExperience, userType);
        drawProjects(state, resumeData.projects);
        drawSkills(state, resumeData.skills);
        drawCertifications(state, resumeData.certifications);
        drawEducation(state, resumeData.education); // Education is often last for experienced
    } else { // Fresher
        drawEducation(state, resumeData.education);
        drawWorkExperience(state, resumeData.workExperience, userType); // Internships and work experience
        drawProjects(state, resumeData.projects);
        drawSkills(state, resumeData.skills);
        drawCertifications(state, resumeData.certifications);
        drawAchievementsAndExtras(state, resumeData); // Combined section for fresher extras
    }

    // Removed the call to drawGitHubReferences(state, resumeData.projects); as per requirement.


    // Add page numbers to all pages (only if multiple pages)
    const totalPages = state.currentPage;
    if (totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        if (i > 1) {
          doc.setPage(i);
        }

        const pageText = `Page ${i} of ${totalPages}`;
        doc.setFont('times', 'normal'); // Changed font to 'times' for page numbers
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80); // Gray

        const textWidth = doc.getTextWidth(pageText);
        // Position page number at the bottom, centered
        doc.text(pageText, PDF_CONFIG.pageWidth / 2 - textWidth / 2, PDF_CONFIG.pageHeight - PDF_CONFIG.margins.bottom / 2);
      }
    }

    const fileName = getFileName(resumeData, 'pdf'); // Pass resumeData and 'pdf' extension

    if (isMobileDevice()) {
      const pdfBlob = doc.output('blob');
      triggerMobileDownload(pdfBlob, fileName);
    } else {
      doc.save(fileName);
    }

  } catch (error) {
    console.error('Error exporting to PDF:', error);

    if (error instanceof Error) {
      if (error.message.includes('jsPDF')) {
        throw new Error('PDF generation failed. Please try again or contact support if the issue persists.');
      } else {
        throw new Error('An error occurred while creating the PDF. Please try again.');
      }
    } else {
      throw new Error('An unexpected error occurred while exporting PDF. Please try again.');
    }
  }
};

// Centralized getFileName function (from exportUtils.ts)
export const getFileName = (resumeData: ResumeData, fileExtension: 'pdf' | 'doc'): string => {
    const namePart = resumeData.name.replace(/\s+/g, '_');
    const rolePart = resumeData.targetRole ? `_${resumeData.targetRole.replace(/\s+/g, '_')}` : ''; // Re-added rolePart logic
    return `${namePart}${rolePart}_Resume.${fileExtension}`; // Reverted to include rolePart
};

// Generate Word document with mobile optimization
export const exportToWord = async (resumeData: ResumeData, userType: UserType = 'experienced'): Promise<void> => {
  // Use the centralized getFileName
  const fileName = getFileName(resumeData, 'doc');

  try {
    const htmlContent = generateWordHTMLContent(resumeData, userType);
    const blob = new Blob([htmlContent], {
      type: 'application/vnd.ms-word'
    });

    triggerMobileDownload(blob, fileName);

  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw new Error('Word export failed. Please try again.');
  }
};

const generateWordHTMLContent = (data: ResumeData, userType: UserType = 'experienced'): string => {
  const contactParts = [];

  if (data.phone) {
    contactParts.push(`<b>Phone no:</b> <a href="tel:${data.phone}" style="color: #2563eb !important; text-decoration: underline !important;">${data.phone}</a>`);
  }

  if (data.email) {
    contactParts.push(`<b>Email:</b> <a href="mailto:${data.email}" style="color: #2563eb !important; text-decoration: underline !important;">${data.email}</a>`);
  }

  if (data.linkedin) {
    contactParts.push(`<b>LinkedIn:</b> <a href="${data.linkedin}" target="_blank" rel="noopener noreferrer" style="color: #2563eb !important; text-decoration: underline !important;">${data.linkedin}</a>`);
  }

  if (data.github) {
    contactParts.push(`<b>GitHub:</b> <a href="${data.github}" target="_blank" rel="noopener noreferrer" style="color: #2563eb !important; text-decoration: underline !important;">${data.github}</a>`);
  }

  // Add location to contact info for Word export
  if (data.location) {
    contactParts.push(`<b>Location:</b> ${data.location}`);
  }

  const contactInfo = contactParts.join(' | ');

  const summaryHtml = data.summary ? `<p style="margin-bottom: 12pt; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt;">${data.summary}</p>` : '';

  const educationHtml = data.education && data.education.length > 0 ? `
    <div class="section-title">EDUCATION</div>
    <div class="section-underline"></div>
    ${data.education.map(edu => `
      <div class="edu-header">
        <div>
          <div class="degree">${edu.degree}</div>
          <div class="school">${edu.school}</div>
          ${edu.cgpa ? `<div style="font-size: 10pt; color: #4B5563; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">CGPA: ${edu.cgpa}</div>` : ''}
          ${edu.relevantCoursework && edu.relevantCoursework.length > 0 ? `<div style="font-size: 9.5pt; color: #4B5563; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Relevant Coursework: ${edu.relevantCoursework.join(', ')}</div>` : ''}
        </div>
        <div class="year">${edu.year}</div>
      </div>
    `).join('')}
  ` : '';

  const workExperienceHtml = data.workExperience && data.workExperience.length > 0 ? `
    <div class="section-title">${userType === 'fresher' ? 'INTERNSHIPS & WORK EXPERIENCE' : 'EXPERIENCE'}</div>
    <div class="section-underline"></div>
    ${data.workExperience.map(job => `
      <div class="job-header">
        <div>
          <div class="job-title">${job.role}</div>
          <div class="company">${job.company}${job.location ? `, ${job.location}` : ''}</div>
        </div>
        <div class="year">${job.year}</div>
      </div>
      ${job.bullets && job.bullets.length > 0 ? `
        <ul class="bullets" style="margin-left: 5mm; margin-bottom: 6pt; margin-top: 6pt; list-style-type: disc;">
          ${job.bullets.map(bullet => `<li class="bullet" style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${bullet}</li>`).join('')}
        </ul>
      ` : ''}
    `).join('')}
  ` : '';

  const projectsHtml = data.projects && data.projects.length > 0 ? `
    <div class="section-title">PROJECTS</div>
    <div class="section-underline"></div>
    ${data.projects.map(project => `
      <div class="project-title">${project.title}</div>
      ${project.bullets && project.bullets.length > 0 ? `
        <ul class="bullets" style="margin-left: 5mm; margin-bottom: 6pt; margin-top: 6pt; list-style-type: disc;">
          ${project.bullets.map(bullet => `<li class="bullet" style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${bullet}</li>`).join('')}
        </ul>
      ` : ''}
    `).join('')}
  ` : '';

  const skillsHtml = data.skills && data.skills.length > 0 ? `
    <div class="section-title">SKILLS</div>
    <div class="section-underline"></div>
    ${data.skills.map(skill => `
      <div class="skills-item" style="font-size: 9.5pt; margin: 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <span class="skill-category" style="font-weight: bold; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${skill.category}:</span> ${skill.list ? skill.list.join(', ') : ''}
      </div>
    `).join('')}
  ` : '';

  const certificationsHtml = data.certifications && data.certifications.length > 0 ? `
    <div class="section-title">CERTIFICATIONS</div>
    <div class="section-underline"></div>
    <ul class="bullets" style="margin-left: 5mm; margin-bottom: 6pt; margin-top: 6pt; list-style-type: disc;">
      ${data.certifications.map(cert => {
        let certText = '';
        if (typeof cert === 'string') {
          certText = cert;
        } else if (cert && typeof cert === 'object') {
          if ('title' in cert && 'description' in cert) {
            certText = `${cert.title} - ${cert.description}`;
          } else if ('title' in cert && 'issuer' in cert) {
            certText = `${cert.title} - ${cert.issuer}`;
          } else if ('name' in cert) {
            certText = cert.name;
          } else if ('title' in cert) {
            certText = cert.title;
          } else if ('description' in cert) {
            certText = cert.description;
          } else {
            certText = Object.values(cert).filter(Boolean).join(' - ');
          }
        } else {
          certText = String(cert);
        }
        return `<li class="bullet" style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${certText}</li>`;
      }).join('')}
    </ul>
  ` : '';

  // githubReferencesHtml has been removed as per requirement.

  const achievementsAndExtrasHtml = userType === 'fresher' && (data.achievements?.length > 0 || data.extraCurricularActivities?.length > 0 || data.languagesKnown?.length > 0 || data.personalDetails?.trim() !== '') ? `
    <div class="section-title">ACHIEVEMENTS & EXTRAS</div>
    <div class="section-underline"></div>
    ${data.achievements && data.achievements.length > 0 ? `
      <p style="font-size: 9.5pt; font-weight: bold; margin: 6pt 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Achievements:</p>
      <ul class="bullets" style="margin-left: 7.5mm; margin-bottom: 6pt; margin-top: 2pt; list-style-type: disc;">
        ${data.achievements.map(item => `<li class="bullet" style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${item}</li>`).join('')}
      </ul>
    ` : ''}
    ${data.extraCurricularActivities && data.extraCurricularActivities.length > 0 ? `
      <p style="font-size: 9.5pt; font-weight: bold; margin: 6pt 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Extra-curricular Activities:</p>
      <ul class="bullets" style="margin-left: 7.5mm; margin-bottom: 6pt; margin-top: 2pt; list-style-type: disc;">
        ${data.extraCurricularActivities.map(item => `<li class="bullet" style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${item}</li>`).join('')}
      </ul>
    ` : ''}
    ${data.languagesKnown && data.languagesKnown.length > 0 ? `
      <p style="font-size: 9.5pt; font-weight: bold; margin: 6pt 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Languages Known:</p>
      <ul class="bullets" style="margin-left: 7.5mm; margin-bottom: 6pt; margin-top: 2pt; list-style-type: disc;">
        ${data.languagesKnown.map(item => `<li class="bullet" style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${item}</li>`).join('')}
      </ul>
    ` : ''}
    ${data.personalDetails?.trim() !== '' ? `
      <p style="font-size: 9.5pt; font-weight: bold; margin: 6pt 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Personal Details:</p>
      <p style="font-size: 9.5pt; line-height: 1.4; margin: 0 0 2pt 0; font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin-left: 7.5mm;">${data.personalDetails}</p>
    ` : ''}
  ` : '';

  let sectionOrderHtml = '';

  if (userType === 'experienced') {
    sectionOrderHtml = `
      ${summaryHtml}
      ${workExperienceHtml}
      ${projectsHtml}
      ${skillsHtml}
      ${certificationsHtml}
      ${educationHtml}
    `;
  } else { // Fresher
    sectionOrderHtml = `
      ${summaryHtml}
      ${educationHtml}
      ${workExperienceHtml}
      ${projectsHtml}
      ${skillsHtml}
      ${certificationsHtml}
      ${achievementsAndExtrasHtml}
    `;
  }

  return `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name="ProgId" content="Word.Document">
      <meta name="Generator" content="Microsoft Word 15">
      <meta name="Originator" content="Microsoft Word 15">
      <title>${data.name} - Resume</title>
      <style>
        @page {
          margin-top: 17.78mm !important; /* ~0.7 inch */
          margin-bottom: 17.78mm !important; /* ~0.7 inch */
          margin-left: 17.78mm !important; /* ~0.7 inch */
          margin-right: 17.78mm !important; /* ~0.7 inch */
        }

        body {
          font-family: "Calibri", sans-serif !important;
          font-size: 10pt !important;
          line-height: 1.25 !important;
          color: #000 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }

        a, a:link, a:visited, a:active {
          color: #2563eb !important;
          text-decoration: underline !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
          font-weight: inherit !important;
          font-size: inherit !important;
        }

        a:hover {
          color: #1d4ed8 !important;
          text-decoration: underline !important;
        }

        b, strong {
          font-weight: bold !important;
          color: #000 !important;
        }

        .header {
          text-align: center !important;
          margin-bottom: 6mm !important;
        }
        .name {
          font-size: 18pt !important;
          font-weight: bold !important;
          letter-spacing: 1pt !important;
          margin-bottom: 4pt !important;
          text-transform: uppercase !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .contact {
          font-size: 9pt !important;
          margin-bottom: 6pt !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .header-line {
          border: none !important;
          border-top: 0.5pt solid #404040 !important;
          margin: 0 0 !important; /* Remove horizontal margin */
          height: 1px !important;
          width: 100% !important; /* Ensure line spans full content width */
        }
        .section-title {
          font-size: 10pt !important;
          font-weight: bold !important;
          margin-top: 10pt !important;
          margin-bottom: 4pt !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5pt !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .section-underline {
          border-bottom: 0.5pt solid #808080 !important;
          margin-bottom: 4pt !important;
          height: 1px !important;
        }
        .job-header, .edu-header {
          display: flex !important;
          justify-content: space-between !important;
          margin-bottom: 2pt !important;
          page-break-inside: avoid; /* Keep job/edu headers with content */
        }
        .job-title, .degree {
          font-size: 9.5pt !important;
          font-weight: bold !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .company, .school {
          font-size: 9.5pt !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .year {
          font-size: 9.5pt !important;
          font-weight: normal !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .bullets {
          margin-left: 4mm !important;
          margin-bottom: 4pt !important;
          margin-top: 2pt !important;
        }
        .bullet {
          font-size: 9.5pt !important;
          line-height: 1.25 !important;
          margin: 0 0 1pt 0 !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .skills-item {
          font-size: 9.5pt !important;
          margin: 1.5pt 0 !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .skill-category {
          font-weight: bold !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
        .project-title {
          font-size: 9.5pt !important;
          font-weight: bold !important;
          margin-bottom: 2pt !important;
          font-family: Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }

        @media print {
          body { margin: 0 !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${data.name.toUpperCase()}</div>
        ${contactInfo ? `<div class="contact">${contactInfo}</div>` : ''}
        <hr class="header-line">
      </div>

      ${sectionOrderHtml}

    </body>
    </html>
  `;
};
