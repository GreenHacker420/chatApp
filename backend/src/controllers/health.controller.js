import mongoose from 'mongoose';
import { config } from '../config/env.js';

/**
 * Health check controller that checks:
 * 1. Database connection
 * 2. Environment variables
 * 3. Critical services (Cloudinary, Email)
 */
export const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      checks: {
        database: {
          status: 'healthy',
          message: 'Database connection is active',
        },
        environment: {
          status: 'healthy',
          message: 'All required environment variables are set',
        },
        services: {
          cloudinary: {
            status: 'healthy',
            message: 'Cloudinary configuration is valid',
          },
          email: {
            status: 'healthy',
            message: 'Email configuration is valid',
          },
        },
      },
    };

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      health.checks.database.status = 'unhealthy';
      health.checks.database.message = 'Database connection is not active';
      health.status = 'degraded';
    }

    // Check required environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'EMAIL_USER',
      'EMAIL_PASS',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      health.checks.environment.status = 'unhealthy';
      health.checks.environment.message = `Missing environment variables: ${missingEnvVars.join(
        ', '
      )}`;
      health.status = 'degraded';
    }

    // Check Cloudinary configuration
    if (
      !config.CLOUDINARY.CLOUD_NAME ||
      !config.CLOUDINARY.API_KEY ||
      !config.CLOUDINARY.API_SECRET
    ) {
      health.checks.services.cloudinary.status = 'unhealthy';
      health.checks.services.cloudinary.message = 'Cloudinary configuration is invalid';
      health.status = 'degraded';
    }

    // Check email configuration
    if (!config.EMAIL.USER || !config.EMAIL.PASS) {
      health.checks.services.email.status = 'unhealthy';
      health.checks.services.email.message = 'Email configuration is invalid';
      health.status = 'degraded';
    }

    // If any check is unhealthy, set overall status to unhealthy
    if (
      health.checks.database.status === 'unhealthy' ||
      health.checks.environment.status === 'unhealthy' ||
      health.checks.services.cloudinary.status === 'unhealthy' ||
      health.checks.services.email.status === 'unhealthy'
    ) {
      health.status = 'unhealthy';
    }

    res.status(health.status === 'unhealthy' ? 503 : 200).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error during health check',
    });
  }
}; 