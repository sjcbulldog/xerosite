import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('message_download_tokens')
export class DownloadToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_MESSAGE_DOWNLOAD_MESSAGE')
  messageId: string;

  @Column({ type: 'uuid' })
  @Index('IDX_MESSAGE_DOWNLOAD_FILE')
  fileId: string;

  @Column({ type: 'uuid' })
  teamId: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  @Index('IDX_MESSAGE_DOWNLOAD_TOKEN')
  token: string;

  @Column({ type: 'timestamp' })
  @Index('IDX_MESSAGE_DOWNLOAD_EXPIRES')
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;
}
