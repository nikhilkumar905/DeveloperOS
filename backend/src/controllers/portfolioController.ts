import { Request, Response } from 'express';
import PortfolioSettings from '../models/PortfolioSettings';
import { GithubStats } from '../models/GithubStats';
import DeveloperIntelligence from '../models/DeveloperIntelligence';
import GeneratedDocument from '../models/GeneratedDocument';
import { generatePortfolioBundleHtml } from '../services/portfolioExportService';

// GET /api/portfolio/settings
export const getPortfolioSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    let settings = await PortfolioSettings.findOne({ user: userId });

    if (!settings) {
      settings = await PortfolioSettings.create({
        user: userId,
        theme: 'modern-dark',
        primaryColor: '#6366f1',
        fontFamily: 'Inter',
        heroSubtitle: 'Building scalable software systems & intelligent applications'
      });
    }

    res.status(200).json(settings);
  } catch (error: any) {
    console.error('Error fetching portfolio settings:', error);
    res.status(500).json({ message: error.message || 'Server error fetching portfolio settings' });
  }
};

// PUT /api/portfolio/settings
export const updatePortfolioSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const updates = req.body;

    let settings = await PortfolioSettings.findOne({ user: userId });
    if (!settings) {
      res.status(404).json({ message: 'Portfolio settings not found' });
      return;
    }

    Object.assign(settings, updates);
    await settings.save();

    res.status(200).json(settings);
  } catch (error: any) {
    console.error('Error updating portfolio settings:', error);
    res.status(500).json({ message: error.message || 'Server error updating portfolio settings' });
  }
};

// GET /api/portfolio/preview
export const getPortfolioPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const user = (req as any).user;
    let settings = await PortfolioSettings.findOne({ user: userId });

    if (!settings) {
      settings = await PortfolioSettings.create({ user: userId });
    }

    const githubStats = await GithubStats.findOne({ user: userId });
    const intelligence = await DeveloperIntelligence.findOne({ user: userId });

    res.status(200).json({
      user: { name: user.name, email: user.email },
      settings,
      githubStats,
      intelligence
    });
  } catch (error: any) {
    console.error('Error fetching portfolio preview:', error);
    res.status(500).json({ message: error.message || 'Server error fetching portfolio preview data' });
  }
};

// GET /api/portfolio/export/bundle
export const exportPortfolioBundle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const user = (req as any).user;
    const settings = await PortfolioSettings.findOne({ user: userId }) || new PortfolioSettings({ user: userId });
    const githubStats = await GithubStats.findOne({ user: userId });
    const intelligence = await DeveloperIntelligence.findOne({ user: userId });

    const htmlContent = generatePortfolioBundleHtml(user, settings, githubStats, intelligence);

    // Log generated document
    await GeneratedDocument.create({
      user: userId,
      documentType: 'PORTFOLIO_BUNDLE',
      title: `${user.name || 'Developer'}_Portfolio_Bundle`,
      templateOrTheme: settings.theme || 'modern-dark',
      atsScore: 100,
      metadata: { theme: settings.theme, color: settings.primaryColor }
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio_bundle_index.html"`);
    res.send(htmlContent);
  } catch (error: any) {
    console.error('Error exporting portfolio bundle:', error);
    res.status(500).json({ message: error.message || 'Server error exporting portfolio bundle' });
  }
};
