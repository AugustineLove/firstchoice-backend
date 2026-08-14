import { Request, Response } from 'express';
import * as DeliveryService from '../services/delivery.service';
import { DeliveryStatus } from '@prisma/client';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function assignRider(req: Request, res: Response) {
  try {
    const { riderId } = req.body;
    if (!riderId) {
      res.status(400).json({ success: false, message: 'riderId is required' });
      return;
    }
    const delivery = await DeliveryService.assignRiderToDelivery(
      req.params.id as string,
      riderId
    );
    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}


export async function createDelivery(req: AuthRequest, res: Response) {
  try {
    const {
      pickupAddress, destinationAddress, itemDescription, paymentMethod,
      recipientName, recipientPhone, imageUrl,
    } = req.body;
      console.log(req.body);
    // if (!pickupAddress || !destinationAddress || !itemDescription) {
    //   res.status(400).json({
    //     success: false,
    //     message: 'pickupAddress, destinationAddress and itemDescription are required',
    //   });
    //   return;
    // }

    if (!paymentMethod || !['CASH', 'MOMO'].includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'paymentMethod must be CASH or MOMO' });
      return;
    }

    // recipientName/recipientPhone are optional individually, but if either is
    // provided (i.e. "delivering for someone else" was used) both are required.
    if ((recipientName && !recipientPhone) || (recipientPhone && !recipientName)) {
      res.status(400).json({ success: false, message: 'Both recipient name and phone are required together' });
      return;
    }

    const delivery = await DeliveryService.createDeliveryRequest(req.user!.id, req.body);
    res.status(201).json({ success: true, data: delivery });
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ success: false, message: err.message });
  }
}

// Rider self-accepts a pending delivery
export async function acceptDelivery(req: AuthRequest, res: Response) {
  try {
    const delivery = await DeliveryService.riderAcceptDelivery(
      req.params.id as string,
      req.user!.id
    );
    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    const code = err.message.includes('already') ? 409 : 400;
    res.status(code).json({ success: false, message: err.message });
  }
}

export async function updateDeliveryStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, message: 'status is required' });
      return;
    }
    const delivery = await DeliveryService.updateDeliveryStatus(
      req.params.id as string,
      req.user!.id,
      status as DeliveryStatus
    );
    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getDeliveryById(req: AuthRequest, res: Response) {
  try {
    const delivery = await DeliveryService.getDeliveryById(req.params.id as string, req.user!.id);
    res.status(200).json({ success: true, data: delivery });
  } catch (err: any) {
    const code = err.message === 'Access denied' ? 403 : 404;
    res.status(code).json({ success: false, message: err.message });
  }
}

export async function getPendingDeliveries(req: Request, res: Response) {
  try {
    const deliveries = await DeliveryService.getPendingDeliveries();
    console.log(JSON.stringify(deliveries));
    res.status(200).json({ success: true, data: deliveries });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyRiderJobs(req: AuthRequest, res: Response) {
  try {
    const jobs = await DeliveryService.getRiderJobs(req.user!.id);
    res.status(200).json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getAllDeliveries(req: Request, res: Response) {
  try {
    const { status, page, limit } = req.query;
    const result = await DeliveryService.getAllDeliveries({
      status: status as DeliveryStatus,
      page:   page  ? parseInt(page  as string) : 1,
      limit:  limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getRiderJobs(req: AuthRequest, res: Response) {
  try {
    const jobs = await DeliveryService.getRiderJobs(req.user!.id);
    res.status(200).json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}