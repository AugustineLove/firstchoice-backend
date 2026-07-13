// controllers/location.controller.ts
import { Request, Response } from 'express';
import * as LocationService from '../services/delivery.service'; // wherever getAllLocations/searchLocations live

export async function getLocations(req: Request, res: Response) {
  try {
    const { q } = req.query;
    const locations = q
      ? await LocationService.searchLocations(q as string)
      : await LocationService.getAllLocations();
    res.status(200).json({ success: true, data: locations });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function createLocation(req: Request, res: Response) {
  try {
    const { name, address, latitude, longitude } = req.body;
    if (!name || !address || latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'name, address, latitude and longitude are required' });
      return;
    }
    const location = await LocationService.createLocation({ name, address, latitude, longitude });
    res.status(201).json({ success: true, data: location });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateLocation(req: Request, res: Response) {
  try {
    const location = await LocationService.updateLocation(req.params.id as string, req.body);
    res.status(200).json({ success: true, data: location });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteLocation(req: Request, res: Response) {
  try {
    await LocationService.deleteLocation(req.params.id as string);
    res.status(200).json({ success: true, data: { message: 'Location deleted' } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}