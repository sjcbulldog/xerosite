import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredFile } from './entities/stored-file.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private storagePath: string;

  constructor(
    @InjectRepository(StoredFile)
    private readonly storedFileRepository: Repository<StoredFile>,
  ) {
    const envPath = process.env.FILE_STORAGE_PATH;

    if (!envPath) {
      throw new Error('FILE_STORAGE_PATH environment variable is not set');
    }

    // Check if path is absolute
    if (!path.isAbsolute(envPath)) {
      throw new Error(
        `FILE_STORAGE_PATH must be an absolute path. Got: ${envPath}`,
      );
    }

    this.storagePath = envPath;
  }

  async onModuleInit() {
    // Ensure storage directory exists
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.mkdir(this.storagePath, { recursive: true });
      console.log(`Created file storage directory: ${this.storagePath}`);
    }
  }

  /**
   * Store a file in the file system and create database record
   */
  async storeFile(
    fileBuffer: Buffer,
    originalFilename: string,
    userId: string,
    subsystem: string,
    mimeType?: string,
  ): Promise<StoredFile> {
    // Generate unique filename
    const ext = path.extname(originalFilename);
    const storedFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(this.storagePath, storedFilename);

    // Write file to disk
    await fs.writeFile(filePath, fileBuffer);

    // Create database record
    const storedFile = this.storedFileRepository.create({
      originalFilename,
      storedFilename,
      userId,
      subsystem,
      fileSize: fileBuffer.length,
      mimeType: mimeType || this.getMimeType(originalFilename),
    });

    return await this.storedFileRepository.save(storedFile);
  }

  /**
   * Retrieve a file from storage
   */
  async getFile(fileId: string): Promise<{ file: StoredFile; data: Buffer }> {
    const file = await this.storedFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const filePath = path.join(this.storagePath, file.storedFilename);

    try {
      const data = await fs.readFile(filePath);
      return { file, data };
    } catch (error) {
      throw new NotFoundException(
        `File ${file.storedFilename} not found on disk`,
      );
    }
  }

  /**
   * Delete a file from storage and database
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.storedFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const filePath = path.join(this.storagePath, file.storedFilename);

    // Delete from disk
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(
        `Failed to delete file ${file.storedFilename} from disk:`,
        error,
      );
    }

    // Delete from database
    await this.storedFileRepository.remove(file);
  }

  /**
   * Get all files for a user in a specific subsystem
   */
  async getFilesByUser(
    userId: string,
    subsystem?: string,
  ): Promise<StoredFile[]> {
    const where: any = { userId };
    if (subsystem) {
      where.subsystem = subsystem;
    }

    return await this.storedFileRepository.find({ where });
  }

  /**
   * Get all files for a subsystem
   */
  async getFilesBySubsystem(subsystem: string): Promise<StoredFile[]> {
    return await this.storedFileRepository.find({ where: { subsystem } });
  }

  /**
   * Get file metadata without reading the file
   */
  async getFileMetadata(fileId: string): Promise<StoredFile> {
    const file = await this.storedFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return file;
  }

  /**
   * Simple MIME type detection based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.csv': 'text/csv',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
