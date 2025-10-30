import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileStorageService } from './file-storage.service';
import { StoredFile } from './entities/stored-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StoredFile])],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
