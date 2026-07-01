import PDFDocument from 'pdfkit';
import { IResumeProfile } from '../models/ResumeProfile';

export const generateResumePdfBuffer = async (profile: IResumeProfile): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // LaTeX XML Letterpaper/A4 tight margins matching FiraMono/tgheros layout (-0.55in top/side)
      const margins = { top: 30, bottom: 30, left: 35, right: 35 };
      const doc = new PDFDocument({
        size: 'A4',
        margins,
        bufferPages: true
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#000000'; // Pure black matching LaTeX
      const printableWidth = 595.28 - margins.left - margins.right; // 525.28

      // Helper to strip leading bullet symbols and non-WinAnsi characters
      const sanitizeText = (str?: string): string => {
        if (!str) return '';
        return str
          .replace(/^[●•\-\*\s]+/, '') // Strip leading bullet characters
          .replace(/●/g, '')
          .replace(/•/g, '')
          .trim();
      };

      // Helper to draw clean vector circle bullet + text (never causes % 1 encoding errors in PDFKit)
      const drawBulletItem = (text: string, fontSize = 8.8, leftIndent = 12, lineGap = 1.2) => {
        const clean = sanitizeText(text);
        if (!clean) return;
        const startY = doc.y;
        // Vector geometric circle (radius 1.3pt) exactly aligned with cap height
        doc.circle(margins.left + 4, startY + 3.2, 1.3).fillColor(primaryColor).fill();
        doc.font('Helvetica').fontSize(fontSize).fillColor(primaryColor).text(clean, margins.left + leftIndent, startY, { width: printableWidth - leftIndent, lineGap });
      };

      // Helper for clean 2-column row (Left text & Right text/link on exact same line)
      const drawTwoColumnRow = (leftText: string, rightText: string, leftFont = 'Helvetica-Bold', rightFont = 'Helvetica', fontSize = 9.5, rightLink?: string, isBullet = false) => {
        const startY = doc.y;
        const leftIndent = isBullet ? 12 : 0;
        if (isBullet) {
          doc.circle(margins.left + 4, startY + 3.4, 1.3).fillColor(primaryColor).fill();
        }

        const cleanLeft = isBullet ? sanitizeText(leftText) : leftText;
        const leftWidth = 370 - leftIndent;
        const rightWidth = printableWidth - 370;

        doc.font(leftFont).fontSize(fontSize).fillColor(primaryColor).text(cleanLeft, margins.left + leftIndent, startY, { width: leftWidth, align: 'left' });
        const yAfterLeft = doc.y;

        const rightOptions: any = { width: rightWidth, align: 'right' };
        if (rightLink) {
          rightOptions.link = rightLink;
          rightOptions.underline = true;
        }

        doc.font(rightFont).fontSize(fontSize).fillColor(primaryColor).text(rightText, margins.left + 370, startY, rightOptions);
        const yAfterRight = doc.y;

        doc.y = Math.max(yAfterLeft, yAfterRight) + 1.5;
      };

      // Helper for Section Headers with thin bottom line matching \titleformat
      const drawSectionHeader = (title: string) => {
        doc.moveDown(0.35);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor).text(title.toUpperCase(), margins.left, doc.y, { align: 'left' });
        const lineY = doc.y + 2.5;
        doc.moveTo(margins.left, lineY).lineTo(margins.left + printableWidth, lineY).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.y = lineY + 4.5;
      };

      // --- HEADER (Centered Name & Contact Info formatted like LaTeX center environment) ---
      doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text((profile.personalInfo?.fullName || 'Developer Profile').toUpperCase(), { align: 'center' });
      doc.moveDown(0.2);

      // Line 1: Email & Phone (exact space preservation with ****** placeholder if missing)
      const emailVal = profile.personalInfo?.email?.trim() || '******';
      const phoneVal = profile.personalInfo?.phone?.trim() || '******';
      doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(`Email: ${emailVal}        Phone: ${phoneVal}`, { align: 'center' });

      // Line 2: LinkedIn & GitHub (exact space preservation with ****** placeholder if missing) + custom links
      const linkedinVal = profile.personalInfo?.linkedinUrl?.trim() || '******';
      const githubVal = profile.personalInfo?.githubUrl?.trim() || '******';
      const customLinksList: string[] = [];
      if (profile.personalInfo?.websiteUrl?.trim()) customLinksList.push(`Portfolio: ${profile.personalInfo.websiteUrl.trim()}`);
      profile.personalInfo?.customLinks?.forEach(link => {
        if (link.label && link.url) customLinksList.push(`${link.label}: ${link.url}`);
      });
      const line2Text = [`LinkedIn: ${linkedinVal}`, `GitHub: ${githubVal}`, ...customLinksList].join('        ');
      doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(line2Text, { align: 'center' });

      // Line 3: Location (exact space preservation with ****** placeholder if missing)
      const locationVal = profile.personalInfo?.location?.trim() || '******';
      doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(`Location: ${locationVal}`, { align: 'center' });
      doc.moveDown(0.2);

      // --- CAREER OBJECTIVE ---
      if (profile.careerObjective?.trim()) {
        drawSectionHeader('Professional Summary');
        doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(profile.careerObjective.trim(), margins.left, doc.y, { width: printableWidth, lineGap: 1.5 });
      }

      // --- WORK EXPERIENCE ---
      if (profile.experience?.length > 0) {
        drawSectionHeader('Work Experience');
        profile.experience.forEach(exp => {
          const leftHeader = exp.company ? `${exp.role} | ${exp.company}` : exp.role;
          const dateStr = `${exp.startDate || ''} ${exp.startDate || exp.endDate ? '–' : ''} ${exp.current ? 'Present' : exp.endDate || ''}`.trim();
          drawTwoColumnRow(leftHeader, dateStr, 'Helvetica-Bold', 'Helvetica', 9.5);

          exp.bullets?.forEach(bullet => {
            drawBulletItem(bullet);
          });
          doc.moveDown(0.15);
        });
      }

      // --- EDUCATION ---
      if (profile.education?.length > 0) {
        drawSectionHeader('Education');
        profile.education.forEach(edu => {
          drawTwoColumnRow(edu.institution || 'University', edu.highlights && edu.highlights.length > 0 ? edu.highlights[0] : '', 'Helvetica-Bold', 'Helvetica', 9.5);
          const degreeLine = edu.fieldOfStudy ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree;
          const eduDate = `${edu.startYear || ''} ${edu.startYear || edu.endYear ? '–' : ''} ${edu.endYear || ''}`.trim();
          drawTwoColumnRow(degreeLine, eduDate, 'Helvetica', 'Helvetica', 9);

          if (edu.gpa?.trim()) {
            drawBulletItem(`Cumulative GPA: ${edu.gpa}`);
          }
          doc.moveDown(0.15);
        });
      }

      // Helper to draw Project Header with separate GitHub and Live hyperlinks
      const drawProjectHeader = (name: string, techStr: string, githubUrl?: string, liveUrl?: string) => {
        const startY = doc.y;
        const leftText = sanitizeText(`${name}${techStr}`);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(primaryColor).text(leftText, margins.left, startY, { width: 370, align: 'left' });
        const yAfterLeft = doc.y;

        doc.font('Helvetica').fontSize(9.5);
        let currentRightX = margins.left + printableWidth;

        if (liveUrl?.trim()) {
          const wLive = doc.widthOfString('Live');
          currentRightX -= wLive;
          doc.fillColor(primaryColor).text('Live', currentRightX, startY, { link: liveUrl.trim(), underline: true });
        }

        if (githubUrl?.trim() && liveUrl?.trim()) {
          const wSep = doc.widthOfString(' | ');
          currentRightX -= wSep;
          doc.fillColor(primaryColor).text(' | ', currentRightX, startY);
        }

        if (githubUrl?.trim()) {
          const wGit = doc.widthOfString('GitHub');
          currentRightX -= wGit;
          doc.fillColor(primaryColor).text('GitHub', currentRightX, startY, { link: githubUrl.trim(), underline: true });
        }

        doc.y = Math.max(yAfterLeft, startY + 12) + 1.5;
      };

      // --- PROJECTS ---
      if (profile.projects?.length > 0) {
        drawSectionHeader('Projects');
        profile.projects.forEach(proj => {
          const techStr = proj.technologies?.length > 0 ? ` (${proj.technologies.join(', ')})` : '';
          drawProjectHeader(proj.name || 'Project', techStr, proj.githubUrl, proj.liveUrl);

          if (proj.description?.trim() && (!proj.bullets || proj.bullets.length === 0)) {
            drawBulletItem(proj.description);
          }

          proj.bullets?.forEach(bullet => {
            drawBulletItem(bullet);
          });
          doc.moveDown(0.15);
        });
      }

      // --- HACKATHONS ---
      if (profile.hackathons && profile.hackathons.length > 0) {
        drawSectionHeader('Hackathons');
        profile.hackathons.forEach(hack => {
          const achievementLine = hack.achievement ? ` | ${hack.achievement}` : '';
          drawBulletItem(`${hack.name}${achievementLine}`);
        });
        doc.moveDown(0.15);
      }

      // --- CERTIFICATIONS ---
      if (profile.certifications?.length > 0) {
        drawSectionHeader('Certifications');
        profile.certifications.forEach(cert => {
          drawTwoColumnRow(`${cert.name} | ${cert.issuer}`, 'Certificate', 'Helvetica', 'Helvetica', 9, cert.credentialUrl, true);
        });
        doc.moveDown(0.15);
      }

      // --- SKILLS (Matching LaTeX tabular column alignment p{5.2cm} p{14cm}) ---
      drawSectionHeader('Skills');
      const leftColWidth = 148;
      const rightColWidth = printableWidth - leftColWidth;

      if (profile.categorizedSkills && profile.categorizedSkills.length > 0) {
        profile.categorizedSkills.forEach(cat => {
          if (cat.skills && cat.skills.length > 0) {
            const rowY = doc.y;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text(`${cat.category}:`, margins.left, rowY, { width: leftColWidth });
            const yAfterLeft = doc.y;

            doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(cat.skills.join(', '), margins.left + leftColWidth, rowY, { width: rightColWidth });
            const yAfterRight = doc.y;

            doc.y = Math.max(yAfterLeft, yAfterRight) + 3;
          }
        });
      } else {
        if (profile.skills.technical?.length > 0) {
          const rowY = doc.y;
          doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('Programming Languages:', margins.left, rowY, { width: leftColWidth });
          doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(profile.skills.technical.join(', '), margins.left + leftColWidth, rowY, { width: rightColWidth });
          doc.y += doc.currentLineHeight() + 3;
        }
        if (profile.skills.frameworks?.length > 0) {
          const rowY = doc.y;
          doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('Frameworks & Libs:', margins.left, rowY, { width: leftColWidth });
          doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(profile.skills.frameworks.join(', '), margins.left + leftColWidth, rowY, { width: rightColWidth });
          doc.y += doc.currentLineHeight() + 3;
        }
        if (profile.skills.tools?.length > 0) {
          const rowY = doc.y;
          doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('Tools & Platforms:', margins.left, rowY, { width: leftColWidth });
          doc.font('Helvetica').fontSize(9).fillColor(primaryColor).text(profile.skills.tools.join(', '), margins.left + leftColWidth, rowY, { width: rightColWidth });
          doc.y += doc.currentLineHeight() + 3;
        }
      }

      // --- CUSTOM SECTIONS ---
      if (profile.customSections && profile.customSections.length > 0) {
        profile.customSections.forEach(sec => {
          if (sec.title && sec.items?.length > 0) {
            drawSectionHeader(sec.title);
            sec.items.forEach(item => {
              drawTwoColumnRow(item.title || '', item.date || '', 'Helvetica-Bold', 'Helvetica', 9.5);
              if (item.subtitle) {
                doc.font('Helvetica-Oblique').fontSize(8.8).fillColor(primaryColor).text(item.subtitle, margins.left, doc.y);
              }
              item.bullets?.forEach(b => {
                drawBulletItem(b);
              });
              doc.moveDown(0.15);
            });
          }
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
