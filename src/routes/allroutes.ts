import { Router } from "express";
import authRoutes from "./auth.routes";
import userRouter from "./user.routes";
import vendorRouter from "./vendor.routes";
import productRouter from "./product.routes";
import orderRouter from "./order.routes";
import riderRouter from "./rider.routes";
import deliveryRouter from "./delivery.routes";
import errandRouter from "./errand.routes";
import transactionRouter from "./transaction.routes";
import adminRouter from "./admin.routes";
import locationRouter from "./location.routes";
import settingsRouter from "./settings.routes";

const allRoutes = Router();

allRoutes.use('/api/auth', authRoutes);
allRoutes.use('/api/users', userRouter);
allRoutes.use('/api/vendors', vendorRouter);
allRoutes.use('/api/products', productRouter);
allRoutes.use('/api/orders', orderRouter);
allRoutes.use('/api/riders', riderRouter);
allRoutes.use('/api/deliveries', deliveryRouter);
allRoutes.use('/api/errands', errandRouter);
allRoutes.use('/api/transactions', transactionRouter);
allRoutes.use('/api/admin', adminRouter);
allRoutes.use('/api/locations', locationRouter);
allRoutes.use('/api/settings', settingsRouter); // Import settings routes

export default allRoutes;