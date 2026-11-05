import { S3ServiceException } from "@aws-sdk/client-s3";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { AppError } from "../Errors/App.error.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      message: "Token has expired",
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  if (err instanceof S3ServiceException) {
    return res.status(err.$metadata.httpStatusCode ?? 500).json({
      message: "Storage operation failed",
    });
  }

  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          message: "File size must not exceed 5 MB",
        });

      default:
        return res.status(400).json({
          message: err.message,
        });
    }
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode || 500).json({
      message: err.message || "Internal server error",
    });
  }

  switch (err?.code) {
    case "ORM.UNIQUE_CONSTRAINT":
      return res.status(409).json({
        message: "A record with this value already exists.",
      });

    case "ORM.RECORD_NOT_FOUND":
      return res.status(404).json({
        message: "The requested record was not found.",
      });

    case "ORM.FOREIGN_KEY_CONSTRAINT":
      return res.status(400).json({
        message: "A related record does not exist.",
      });

    case "ORM.REQUIRED_RELATION_VIOLATION":
      return res.status(400).json({
        message: "The operation violates a required relation.",
      });

    case "ORM.NULL_CONSTRAINT":
      return res.status(400).json({
        message: "A required field cannot be null.",
      });

    case "ORM.INVALID_ARGUMENT":
      return res.status(400).json({
        message: "Invalid database query arguments.",
      });

    case "RUNTIME.NO_ROWS":
      return res.status(404).json({
        message: "The requested record was not found.",
      });

    case "RUNTIME.ABORTED":
      return res.status(499).json({
        message: "The database operation was cancelled.",
      });

    case "RUNTIME.DECODE_FAILED":
      return res.status(500).json({
        message: "Failed to process database response.",
      });

    case "RUNTIME.ENCODE_FAILED":
      return res.status(400).json({
        message: "Invalid value provided for the database.",
      });

    case "RUNTIME.BINDING_INVALID":
      return res.status(500).json({
        message: "Invalid database configuration.",
      });

    case "RUNTIME.BINDING_MISSING":
      return res.status(500).json({
        message: "Database connection configuration is missing.",
      });

    case "DRIVER.NOT_CONNECTED":
      return res.status(503).json({
        message: "Database connection is unavailable.",
      });

    case "DRIVER.CONNECTION_FAILED":
      return res.status(503).json({
        message: "Unable to connect to the database.",
      });

    case "DRIVER.CONNECTION_TIMEOUT":
      return res.status(503).json({
        message: "Database connection timed out.",
      });

    case "DRIVER.QUERY_FAILED":
      return res.status(500).json({
        message: "Database query failed.",
      });

    case "DRIVER.TRANSACTION_FAILED":
      return res.status(500).json({
        message: "Database transaction failed.",
      });

    default:
      return res.status(
        err?.statusCode && err.statusCode < 500
          ? err.statusCode
          : 500
      ).json({
        message:
          err?.statusCode && err.statusCode < 500
            ? err.message
            : "Internal server error.",
      });
  }
};