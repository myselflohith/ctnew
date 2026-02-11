import { Router, Request, Response } from 'express';
import {
  getOrganizationByCompanyName,
  upsertOrganization,
  getOrganizationRequirements,
  addOrganizationRequirement,
  deleteOrganizationRequirement,
  updateOrganizationRequirement,
  getAllOrganizations,
} from '../services/organization.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Get organization by company name
router.get('/:companyName', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const org = await getOrganizationByCompanyName(req.params.companyName);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ success: true, data: org });
  } catch (error: any) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: error.message || 'Failed to get organization' });
  }
});

// Create or update organization
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const {
      name,
      company_name,
      industry,
      size,
      founded,
      headquarters,
      description,
      website,
      linkedin_url,
      twitter_url,
      benefits,
      culture,
      logo_path,
    } = req.body;

    if (!name || !company_name) {
      res.status(400).json({ error: 'Name and company name are required' });
      return;
    }

    const org = await upsertOrganization({
      name,
      company_name,
      industry,
      size,
      founded,
      headquarters,
      description,
      website,
      linkedin_url,
      twitter_url,
      benefits,
      culture,
      logo_path,
    });

    res.json({ success: true, data: org });
  } catch (error: any) {
    console.error('Upsert organization error:', error);
    res.status(500).json({ error: error.message || 'Failed to save organization' });
  }
});

// Get requirements for organization
router.get('/:companyName/requirements', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const org = await getOrganizationByCompanyName(req.params.companyName);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const requirements = await getOrganizationRequirements(org.id);
    res.json({ success: true, data: requirements });
  } catch (error: any) {
    console.error('Get requirements error:', error);
    res.status(500).json({ error: error.message || 'Failed to get requirements' });
  }
});

// Add requirement
router.post('/:companyName/requirements', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { requirement_text, requirement_type, weight } = req.body;

    if (!requirement_text || !requirement_type) {
      res.status(400).json({ error: 'Requirement text and type are required' });
      return;
    }

    const org = await getOrganizationByCompanyName(req.params.companyName);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const requirement = await addOrganizationRequirement(
      org.id,
      requirement_text,
      requirement_type,
      weight || 5
    );

    res.json({ success: true, data: requirement });
  } catch (error: any) {
    console.error('Add requirement error:', error);
    res.status(500).json({ error: error.message || 'Failed to add requirement' });
  }
});

// Update requirement
router.put('/requirements/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { requirement_text, requirement_type, weight } = req.body;

    const requirement = await updateOrganizationRequirement(
      req.params.id,
      requirement_text,
      requirement_type,
      weight || 5
    );

    res.json({ success: true, data: requirement });
  } catch (error: any) {
    console.error('Update requirement error:', error);
    res.status(500).json({ error: error.message || 'Failed to update requirement' });
  }
});

// Delete requirement
router.delete('/requirements/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await deleteOrganizationRequirement(req.params.id);
    res.json({ success: true, message: 'Requirement deleted' });
  } catch (error: any) {
    console.error('Delete requirement error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete requirement' });
  }
});

// Get all organizations (admin only)
router.get('/all', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const organizations = await getAllOrganizations();
    res.json({ success: true, data: organizations });
  } catch (error: any) {
    console.error('Get all organizations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get organizations' });
  }
});

export default router;
