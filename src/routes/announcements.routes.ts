// public (any logged-in user)

import { Router } from "express";

import { authenticate, authorize } from "../middleware/auth.middleware";
import { createAnnouncement, deleteAnnouncement, getActiveAnnouncements, registerAnnouncementRoutes } from "../services/announcement.service";

export const announcementRouter = Router();

registerAnnouncementRoutes(announcementRouter, authenticate, authorize);