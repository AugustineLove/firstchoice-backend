import { Request, Response } from 'express';
import * as RiderService from '../services/rider.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function registerRider(req: AuthRequest, res: Response) {
  try {
    const { bikeType, licenseNumber } = req.body;
    if (!bikeType) {
      res.status(400).json({ success: false, message: 'bikeType is required' });
      return;
    }
    const rider = await RiderService.registerRider(req.user!.id, req.body);
    res.status(201).json({ success: true, data: rider });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyRiderProfile(req: AuthRequest, res: Response) {
  try {
    const rider = await RiderService.getMyRiderProfile(req.user!.id);
    res.status(200).json({ success: true, data: rider });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function getRiderById(req: Request, res: Response) {
  try {
    const rider = await RiderService.getRiderProfile(req.params.id as string);
    res.status(200).json({ success: true, data: rider });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function toggleAvailability(req: AuthRequest, res: Response) {
  try {
    const { availability } = req.body;
    if (!availability || !['ONLINE', 'OFFLINE'].includes(availability)) {
      res.status(400).json({
        success: false,
        message: 'availability must be ONLINE or OFFLINE',
      });
      return;
    }
    const rider = await RiderService.toggleAvailability(
      req.user!.id,
      availability
    );
    res.status(200).json({ success: true, data: rider });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateLocation(req: AuthRequest, res: Response) {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({
        success: false,
        message: 'latitude and longitude are required',
      });
      return;
    }
    const rider = await RiderService.updateRiderLocation(req.user!.id, {
      latitude,
      longitude,
    });
    res.status(200).json({ success: true, data: rider });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAvailableRiders(req: Request, res: Response) {
  try {
    const riders = await RiderService.getAvailableRiders();
    res.status(200).json({ success: true, data: riders });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyEarnings(req: AuthRequest, res: Response) {
  try {
    const earnings = await RiderService.getRiderEarnings(req.user!.id);
    res.status(200).json({ success: true, data: earnings });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyActiveJobs(req: AuthRequest, res: Response) {
  try {
    const jobs = await RiderService.getRiderActiveJobs(req.user!.id);
    res.status(200).json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyJobHistory(req: AuthRequest, res: Response) {
  try {
    const history = await RiderService.getRiderJobHistory(req.user!.id);
    res.status(200).json({ success: true, data: history });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}