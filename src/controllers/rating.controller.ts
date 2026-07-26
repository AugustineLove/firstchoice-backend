import { Response } from 'express';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import * as RatingService from '../services/rating.service';

// POST /vendors/:id/rating   (auth required, customer)
export async function submitRating(req: AuthRequest, res: Response) {
  try {
    const { rating, comment } = req.body;
    if (rating === undefined || rating === null) {
      res.status(400).json({ success: false, message: 'rating is required' });
      return;
    }
    const result = await RatingService.submitVendorRating(
      req.params.id as string,
      req.user!.id,
      Number(rating),
      comment
    );
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    const code = err.message.includes('already') ? 409 : 400;
    res.status(code).json({ success: false, message: err.message });
  }
}

// GET /vendors/:id/rating/summary   (auth optional — includes myRating if logged in)
export async function getRatingSummary(req: AuthRequest, res: Response) {
  try {
    const summary = await RatingService.getVendorRatingSummary(
      req.params.id as string,
      req.user?.id
    );
    res.status(200).json({ success: true, data: summary });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// GET /vendors/:id/ratings   (public — paginated review list)
export async function getRatings(req: AuthRequest, res: Response) {
  try {
    const { page, limit } = req.query;
    const result = await RatingService.getVendorRatings(
      req.params.id as string,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20
    );
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}