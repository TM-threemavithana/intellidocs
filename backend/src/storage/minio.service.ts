import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private readonly bucketName = process.env.MINIO_BUCKET_NAME || 'intellidocs-documents';

  async onModuleInit() {
    try {
      // Parse MinIO endpoint
      const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
      const url = new URL(endpoint);

      this.minioClient = new Minio.Client({
        endPoint: url.hostname,
        port: parseInt(url.port) || 9000,
        useSSL: url.protocol === 'https:',
        accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
        secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin_password',
      });

      // Create bucket if it doesn't exist
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`✅ Created MinIO bucket: ${this.bucketName}`);
      } else {
        this.logger.log(`✅ Connected to MinIO bucket: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize MinIO:', error);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param objectName - Path/name of the object in MinIO
   * @param buffer - File buffer
   * @param contentType - MIME type (default: application/pdf)
   */
  async uploadFile(
    objectName: string,
    buffer: Buffer,
    contentType: string = 'application/pdf',
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
        },
      );

      this.logger.log(`✅ Uploaded file to MinIO: ${objectName}`);
      return `s3://${this.bucketName}/${objectName}`;
    } catch (error) {
      this.logger.error(`❌ Failed to upload file: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * Download a file from MinIO
   * @param objectName - Path/name of the object in MinIO
   */
  async downloadFile(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(this.bucketName, objectName);
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`❌ Failed to download file: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   * @param objectName - Path/name of the object in MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`✅ Deleted file from MinIO: ${objectName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete file: ${objectName}`, error);
      throw error;
    }
  }

  /**
   * Get a presigned URL for temporary file access
   * @param objectName - Path/name of the object in MinIO
   * @param expirySeconds - URL expiry time in seconds (default: 1 hour)
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds,
      );
      return url;
    } catch (error) {
      this.logger.error(`❌ Failed to generate presigned URL: ${objectName}`, error);
      throw error;
    }
  }
}
