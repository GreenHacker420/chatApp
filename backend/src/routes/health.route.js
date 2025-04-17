import express from 'express';
import { healthCheck } from '../controllers/health.controller.js';

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check the health status of the application
 *     description: Returns the health status of the application including database connection, environment variables, and critical services
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   example: 2024-03-20T12:00:00.000Z
 *                 environment:
 *                   type: string
 *                   example: production
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: healthy
 *                         message:
 *                           type: string
 *                           example: Database connection is active
 *       503:
 *         description: Application is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   example: 2024-03-20T12:00:00.000Z
 *                 error:
 *                   type: string
 *                   example: Service Unavailable
 */
router.get('/', healthCheck);

export default router; 