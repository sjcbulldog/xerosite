import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  input,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TeamMediaService } from './team-media.service';
import { TeamMedia } from './team-media.types';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-team-media',
  imports: [CommonModule, FormsModule],
  templateUrl: './team-media.component.html',
  styleUrl: './team-media.component.scss',
})
export class TeamMediaComponent implements OnInit, OnDestroy {
  readonly teamId = input.required<string>();
  readonly isAdmin = input.required<boolean>();
  readonly currentUserId = input.required<string>();

  readonly teamMediaService = inject(TeamMediaService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly showSection = signal(true);
  readonly showUploadDialog = signal(false);
  readonly editingMedia = signal<TeamMedia | null>(null);
  readonly isDragging = signal(false);
  readonly showPreviewDialog = signal(false);
  readonly previewingMedia = signal<TeamMedia | null>(null);

  readonly filterText = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly uploadTitle = signal('');
  readonly editTitle = signal('');
  readonly isUploading = signal(false);

  // Store blob URLs for cleanup
  private blobUrls = new Map<string, string>();
  // Signal to track loaded thumbnails
  readonly thumbnailUrls = signal<Map<string, string>>(new Map());

  readonly filteredMedia = computed(() => {
    const media = this.teamMediaService.mediaFiles();
    const filter = this.filterText().toLowerCase().trim();

    if (!filter) {
      return media;
    }

    return media.filter(
      (m) =>
        m.title.toLowerCase().includes(filter) ||
        m.originalFilename.toLowerCase().includes(filter) ||
        m.uploaderName.toLowerCase().includes(filter)
    );
  });

  ngOnInit(): void {
    this.loadMedia();
  }

  ngOnDestroy(): void {
    this.teamMediaService.clearMedia();
    // Clean up blob URLs
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    this.blobUrls.clear();
  }

  async loadMedia(): Promise<void> {
    try {
      await this.teamMediaService.loadMediaForTeam(this.teamId());
      // Load thumbnails for images and videos
      await this.loadThumbnails();
    } catch (error) {
      console.error('Failed to load team media:', error);
    }
  }

  private async loadThumbnails(): Promise<void> {
    const media = this.teamMediaService.mediaFiles();
    const previewableMedia = media.filter(m => this.canPreview(m.mimeType));
    
    for (const item of previewableMedia) {
      if (!this.blobUrls.has(item.id)) {
        await this.loadMediaBlob(item);
      }
    }
  }

  private async loadMediaBlob(media: TeamMedia): Promise<void> {
    try {
      const url = this.teamMediaService.getPreviewUrl(this.teamId(), media.id);
      const blob = await this.http.get(url, { responseType: 'blob' }).toPromise();
      
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.set(media.id, blobUrl);
        
        // Update the signal with new map
        const newMap = new Map(this.thumbnailUrls());
        newMap.set(media.id, blobUrl);
        this.thumbnailUrls.set(newMap);
      }
    } catch (error) {
      console.error(`Failed to load media blob for ${media.id}:`, error);
    }
  }

  toggleSection(): void {
    this.showSection.set(!this.showSection());
  }

  openUploadDialog(): void {
    this.selectedFile.set(null);
    this.uploadTitle.set('');
    this.showUploadDialog.set(true);
  }

  closeUploadDialog(): void {
    this.showUploadDialog.set(false);
    this.selectedFile.set(null);
    this.uploadTitle.set('');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);
      
      // Auto-populate title with filename (without extension) if empty
      if (!this.uploadTitle()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        this.uploadTitle.set(nameWithoutExt);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.selectedFile.set(file);
      
      // Auto-populate title with filename (without extension) if empty
      if (!this.uploadTitle()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        this.uploadTitle.set(nameWithoutExt);
      }
    }
  }

  async uploadFile(): Promise<void> {
    const file = this.selectedFile();
    const title = this.uploadTitle().trim();

    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!title) {
      alert('Please provide a title');
      return;
    }

    this.isUploading.set(true);

    try {
      const uploadedMedia = await this.teamMediaService.uploadFile(this.teamId(), file, title);
      this.closeUploadDialog();
      
      // Load thumbnail for newly uploaded media if it's an image or video
      if (uploadedMedia && this.canPreview(uploadedMedia.mimeType)) {
        await this.loadMediaBlob(uploadedMedia);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      this.isUploading.set(false);
    }
  }

  startEdit(media: TeamMedia): void {
    this.editingMedia.set(media);
    this.editTitle.set(media.title);
  }

  cancelEdit(): void {
    this.editingMedia.set(null);
  }

  async saveEdit(): Promise<void> {
    const media = this.editingMedia();
    if (!media) return;

    const title = this.editTitle().trim();

    if (!title) {
      alert('Please provide a title');
      return;
    }

    try {
      await this.teamMediaService.updateTitle(this.teamId(), media.id, title);
      this.cancelEdit();
    } catch (error) {
      console.error('Failed to update media:', error);
      alert('Failed to update media. Please try again.');
    }
  }

  async deleteMedia(media: TeamMedia): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${media.title}"?`)) {
      return;
    }

    try {
      await this.teamMediaService.deleteFile(this.teamId(), media.id);
      
      // Clean up blob URL if it exists
      const blobUrl = this.blobUrls.get(media.id);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        this.blobUrls.delete(media.id);
        
        const urls = new Map(this.thumbnailUrls());
        urls.delete(media.id);
        this.thumbnailUrls.set(urls);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Failed to delete media. Please try again.');
    }
  }

  async downloadMedia(media: TeamMedia): Promise<void> {
    try {
      const url = this.teamMediaService.getDownloadUrl(this.teamId(), media.id);
      const blob = await this.http.get(url, { responseType: 'blob' }).toPromise();
      
      if (blob) {
        // Create a temporary blob URL
        const blobUrl = URL.createObjectURL(blob);
        
        // Create a temporary anchor element and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = media.originalFilename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Failed to download media:', error);
      alert('Failed to download file. Please try again.');
    }
  }

  canEditOrDelete(media: TeamMedia): boolean {
    return this.isAdmin() || media.userId === this.currentUserId();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📁';
  }

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  canPreview(mimeType: string): boolean {
    return this.isImage(mimeType) || this.isVideo(mimeType);
  }

  getPreviewUrl(media: TeamMedia): string {
    // Return cached blob URL from signal if available
    const urls = this.thumbnailUrls();
    return urls.get(media.id) || '';
  }

  openPreview(media: TeamMedia): void {
    this.previewingMedia.set(media);
    this.showPreviewDialog.set(true);
  }

  closePreview(): void {
    this.showPreviewDialog.set(false);
    // Small delay to allow animation to complete before clearing
    setTimeout(() => this.previewingMedia.set(null), 300);
  }
}
