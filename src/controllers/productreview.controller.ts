import { Request, Response } from 'express';
import * as ProductReviewService from '../services/productreview.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function submitReview(req: AuthRequest, res: Response) {
  try {
    const { rating } = req.body;
    if (rating === undefined) {
      res.status(400).json({ success: false, message: 'rating is required' });
      return;
    }
    const review = await ProductReviewService.submitReview(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getProductReviews(req: Request, res: Response) {
  try {
    const reviews = await ProductReviewService.getProductReviews(req.params.id as string);
    res.status(200).json({ success: true, data: reviews });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// Auth-optional: logged-in customers additionally get `myReview` back so
// the frontend can show "edit your review" instead of "write a review".
export async function getProductReviewSummary(req: AuthRequest, res: Response) {
  try {
    const summary = await ProductReviewService.getProductReviewSummary(req.params.id as string, req.user?.id);
    res.status(200).json({ success: true, data: summary });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteReview(req: AuthRequest, res: Response) {
  try {
    const result = await ProductReviewService.deleteReview(req.user!.id, req.params.reviewId as string);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}