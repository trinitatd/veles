import express from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
  getAdminStats,
  getAdminPosts,
  updateAdminPost,
  deleteAdminPost,
  featureAdminPost,
  getAdminComments,
  updateAdminComment,
  deleteAdminComment,
  getAdminUsers,
  updateAdminUserRole,
  getAdminLogs,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Enforce Clerk administrator authorization on all /admin routes
router.use(requireAdmin);

// Stats & Platform Overview
router.get("/stats", getAdminStats);
router.get("/logs", getAdminLogs);

// Post Management
router.get("/posts", getAdminPosts);
router.patch("/posts/:id/feature", featureAdminPost);
router.patch("/posts/:id/featured", featureAdminPost);
router.patch("/posts/:id", updateAdminPost);
router.delete("/posts/:id", deleteAdminPost);

// Comment Management
router.get("/comments", getAdminComments);
router.patch("/comments/:id", updateAdminComment);
router.delete("/comments/:id", deleteAdminComment);

// User Management
router.get("/users", getAdminUsers);
router.patch("/users/:id/role", updateAdminUserRole);

export default router;
