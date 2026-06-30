import PDFDocument from 'pdfkit';
import { IResumeProfile } from '../models/ResumeProfile';

export const generateResumePdfBuffer = async (profile: IResumeProfile): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
        bufferPages: true
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1e293b'; // Slate dark
      const accentColor = '#4f46e5';  // Indigo
      const textColor = '#334155';    // Slate text
      const lightBorder = '#cbd5e1';  // Border

      // Helper for Section Headers
      const drawSectionHeader = (title: string) => {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(accentColor).text(title.toUpperCase());
        const y = doc.y + 2;
        doc.moveTo(45, y).lineTo(550, y).strokeColor(lightBorder).lineWidth(0.75).stroke();
        doc.y = y + 6;
      };

      // --- HEADER ---
      doc.font('Helvetica-Bold').fontSize(22).fillColor(primaryColor).text(profile.personalInfo.fullName || 'Developer Profile', { align: 'center' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(12).fillColor(accentColor).text(profile.personalInfo.jobTitle || 'Software Engineer', { align: 'center' });
      doc.moveDown(0.3);

      const contactItems = [
        profile.personalInfo.email,
        profile.personalInfo.phone,
        profile.personalInfo.location,
        profile.personalInfo.githubUrl ? 'GitHub' : '',
        profile.personalInfo.linkedinUrl ? 'LinkedIn' : ''
      ].filter(Boolean);

      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(contactItems.join('   |   '), { align: 'center' });
      doc.moveDown(0.5);

      // --- CAREER OBJECTIVE ---
      if (profile.careerObjective) {
        drawSectionHeader('Professional Summary');
        doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(profile.careerObjective, { lineGap: 2 });
      }

      // --- TECHNICAL SKILLS ---
      drawSectionHeader('Technical Skills');
      doc.fontSize(9.5);
      if (profile.skills.technical?.length > 0) {
        doc.font('Helvetica-Bold').fillColor(primaryColor).text('Languages: ', { continued: true })
           .font('Helvetica').fillColor(textColor).text(profile.skills.technical.join(', '));
      }
      if (profile.skills.frameworks?.length > 0) {
        doc.font('Helvetica-Bold').fillColor(primaryColor).text('Frameworks & Libs: ', { continued: true })
           .font('Helvetica').fillColor(textColor).text(profile.skills.frameworks.join(', '));
      }
      if (profile.skills.tools?.length > 0) {
        doc.font('Helvetica-Bold').fillColor(primaryColor).text('Tools & Platforms: ', { continued: true })
           .font('Helvetica').fillColor(textColor).text(profile.skills.tools.join(', '));
      }

      // --- WORK EXPERIENCE ---
      if (profile.experience?.length > 0) {
        drawSectionHeader('Professional Experience');
        profile.experience.forEach(exp => {
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(exp.role, { continued: true });
          doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`   |   ${exp.company}`, { align: 'left' });
          
          const dateStr = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || ''}`;
          doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#64748b').text(`${dateStr}   (${exp.location || 'Remote'})`);
          doc.moveDown(0.2);

          exp.bullets?.forEach(bullet => {
            doc.font('Helvetica').fontSize(9).fillColor(textColor).text(`•  ${bullet}`, { indent: 10, lineGap: 2 });
          });
          doc.moveDown(0.3);
        });
      }

      // --- FEATURED PROJECTS ---
      if (profile.projects?.length > 0) {
        drawSectionHeader('Technical Projects');
        profile.projects.forEach(proj => {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor).text(proj.name, { continued: true });
          if (proj.technologies?.length > 0) {
            doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(accentColor).text(`   [${proj.technologies.join(', ')}]`);
          } else {
            doc.text('');
          }
          if (proj.description) {
            doc.font('Helvetica').fontSize(9).fillColor(textColor).text(proj.description, { indent: 5 });
          }
          proj.bullets?.forEach(bullet => {
            doc.font('Helvetica').fontSize(8.5).fillColor(textColor).text(`•  ${bullet}`, { indent: 10, lineGap: 1.5 });
          });
          doc.moveDown(0.3);
        });
      }

      // --- EDUCATION ---
      if (profile.education?.length > 0) {
        drawSectionHeader('Education');
        profile.education.forEach(edu => {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor).text(`${edu.degree} in ${edu.fieldOfStudy}`, { continued: true });
          doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(`   |   ${edu.institution}`);
          doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#64748b').text(`${edu.startYear} - ${edu.endYear}${edu.gpa ? `   |   GPA: ${edu.gpa}` : ''}`);
          doc.moveDown(0.2);
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
