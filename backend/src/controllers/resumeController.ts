import { Request, Response } from 'express';
import ResumeProfile, { IResumeProfile, ResumeTemplateType } from '../models/ResumeProfile';
import { GithubStats } from '../models/GithubStats';
import IntegrationProfile from '../models/IntegrationProfile';
import DeveloperIntelligence from '../models/DeveloperIntelligence';
import KnowledgeGraph from '../models/KnowledgeGraph';
import GeneratedDocument from '../models/GeneratedDocument';
import { inferResumeData, analyzeAtsCompatibility } from '../services/resumeIntelligenceEngine';
import { generateResumePdfBuffer } from '../services/pdfExportService';

// GET /api/resume/profile
export const getResumeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    let profile = await ResumeProfile.findOne({ user: userId });

    if (!profile) {
      // Auto-initialize profile
      const user = (req as any).user;
      const githubStats = await GithubStats.findOne({ user: userId });
      const integrationProfile = await IntegrationProfile.findOne({ user: userId });
      const intelligence = await DeveloperIntelligence.findOne({ user: userId });
      const graph = await KnowledgeGraph.findOne({ user: userId });

      const inferred = inferResumeData(user, githubStats, integrationProfile, intelligence, graph, 'Software Engineer');
      const atsResult = analyzeAtsCompatibility(inferred as any, 'Software Engineer');

      profile = await ResumeProfile.create({
        user: userId,
        ...inferred,
        atsScore: atsResult.score,
        atsSuggestions: atsResult.suggestions,
        lastInferredAt: new Date()
      });
    }

    res.status(200).json(profile);
  } catch (error: any) {
    console.error('Error fetching resume profile:', error);
    res.status(500).json({ message: error.message || 'Server error fetching resume profile' });
  }
};

// PUT /api/resume/profile
export const updateResumeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const updates = req.body;

    let profile = await ResumeProfile.findOne({ user: userId });
    if (!profile) {
      res.status(404).json({ message: 'Resume profile not found' });
      return;
    }

    // Merge updates
    Object.assign(profile, updates);

    // Recalculate ATS score
    const targetRole = profile.targetRole || 'Software Engineer';
    const atsResult = analyzeAtsCompatibility(profile, targetRole);
    profile.atsScore = atsResult.score;
    profile.atsSuggestions = atsResult.suggestions;

    await profile.save();
    res.status(200).json(profile);
  } catch (error: any) {
    console.error('Error updating resume profile:', error);
    res.status(500).json({ message: error.message || 'Server error updating resume profile' });
  }
};

// POST /api/resume/infer
export const inferResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { targetRole = 'Software Engineer' } = req.body;

    const user = (req as any).user;
    const githubStats = await GithubStats.findOne({ user: userId });
    const integrationProfile = await IntegrationProfile.findOne({ user: userId });
    const intelligence = await DeveloperIntelligence.findOne({ user: userId });
    const graph = await KnowledgeGraph.findOne({ user: userId });

    const inferred = inferResumeData(user, githubStats, integrationProfile, intelligence, graph, targetRole as ResumeTemplateType);
    const atsResult = analyzeAtsCompatibility(inferred as any, targetRole as ResumeTemplateType);

    let profile = await ResumeProfile.findOne({ user: userId });
    if (!profile) {
      profile = new ResumeProfile({ user: userId });
    }

    Object.assign(profile, inferred);
    profile.atsScore = atsResult.score;
    profile.atsSuggestions = atsResult.suggestions;
    profile.lastInferredAt = new Date();

    await profile.save();
    res.status(200).json({ profile, atsResult });
  } catch (error: any) {
    console.error('Error inferring resume data:', error);
    res.status(500).json({ message: error.message || 'Server error running intelligence engine' });
  }
};

// POST /api/resume/analyze-ats
export const analyzeAts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const profile = await ResumeProfile.findOne({ user: userId });

    if (!profile) {
      res.status(404).json({ message: 'Resume profile not found' });
      return;
    }

    const atsResult = analyzeAtsCompatibility(profile, profile.targetRole);
    profile.atsScore = atsResult.score;
    profile.atsSuggestions = atsResult.suggestions;
    await profile.save();

    res.status(200).json(atsResult);
  } catch (error: any) {
    console.error('Error analyzing ATS compatibility:', error);
    res.status(500).json({ message: error.message || 'Server error analyzing ATS compatibility' });
  }
};

// GET /api/resume/export/pdf
export const exportResumePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const profile = await ResumeProfile.findOne({ user: userId });

    if (!profile) {
      res.status(404).json({ message: 'Resume profile not found' });
      return;
    }

    const pdfBuffer = await generateResumePdfBuffer(profile);

    // Record document generation history
    await GeneratedDocument.create({
      user: userId,
      documentType: 'RESUME_PDF',
      title: `${profile.personalInfo.fullName || 'Developer'}_Resume`,
      templateOrTheme: profile.selectedTemplate || 'Software Engineer',
      atsScore: profile.atsScore || 85,
      metadata: { targetRole: profile.targetRole }
    });

    const rawName = req.query.filename ? String(req.query.filename).trim() : `${profile.personalInfo.fullName || 'Developer'}_Resume`;
    const cleanName = rawName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const filename = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: error.message || 'Server error generating PDF export' });
  }
};
