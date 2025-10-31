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
  // Store full video URLs separately for preview playback
  readonly videoBlobUrls = signal<Map<string, string>>(new Map());
  // Cache key prefix for localStorage
  private readonly THUMBNAIL_CACHE_PREFIX = 'video-thumbnail-';

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
    // Clean up all blob URLs (thumbnails and full videos)
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
      // For videos, check cache first
      if (this.isVideo(media.mimeType)) {
        const cachedThumbnail = await this.getCachedVideoThumbnail(media.id);
        if (cachedThumbnail) {
          this.blobUrls.set(media.id, cachedThumbnail);
          const newMap = new Map(this.thumbnailUrls());
          newMap.set(media.id, cachedThumbnail);
          this.thumbnailUrls.set(newMap);
          return;
        }
      }

      // Load the media file
      const url = this.teamMediaService.getPreviewUrl(this.teamId(), media.id);
      const blob = await this.http.get(url, { responseType: 'blob' }).toPromise();
      
      if (blob) {
        let blobUrl: string;
        
        // For videos, generate and cache thumbnail
        if (this.isVideo(media.mimeType)) {
          const videoBlobUrl = URL.createObjectURL(blob);
          // Store the full video URL for preview playback
          this.blobUrls.set(media.id + '-video', videoBlobUrl);
          const videoMap = new Map(this.videoBlobUrls());
          videoMap.set(media.id, videoBlobUrl);
          this.videoBlobUrls.set(videoMap);
          
          // Generate thumbnail for display in grid
          blobUrl = await this.generateAndCacheVideoThumbnail(media.id, blob);
        } else {
          // For images, use blob directly
          blobUrl = URL.createObjectURL(blob);
        }
        
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

  private async getCachedVideoThumbnail(mediaId: string): Promise<string | null> {
    try {
      const cacheKey = this.THUMBNAIL_CACHE_PREFIX + mediaId;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        // Convert base64 back to blob URL
        const blob = await this.base64ToBlob(cached);
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Failed to get cached thumbnail:', error);
    }
    return null;
  }

  private async generateAndCacheVideoThumbnail(mediaId: string, videoBlob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const videoBlobUrl = URL.createObjectURL(videoBlob);
      
      video.src = videoBlobUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      
      let hasResolved = false;
      
      // Timeout fallback - return video blob URL if thumbnail generation takes too long
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          console.warn('Video thumbnail generation timed out, using video blob URL');
          hasResolved = true;
          resolve(videoBlobUrl);
        }
      }, 10000); // 10 second timeout

      const generateThumbnail = () => {
        if (hasResolved) return;
        
        try {
          // Ensure video has dimensions
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn('Video has no dimensions, using video blob URL');
            clearTimeout(timeout);
            hasResolved = true;
            resolve(videoBlobUrl);
            return;
          }
          
          // Create canvas to capture frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to blob
            canvas.toBlob((thumbnailBlob) => {
              clearTimeout(timeout);
              
              if (thumbnailBlob && !hasResolved) {
                hasResolved = true;
                
                // Cache the thumbnail as base64
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = reader.result as string;
                  try {
                    const cacheKey = this.THUMBNAIL_CACHE_PREFIX + mediaId;
                    localStorage.setItem(cacheKey, base64);
                  } catch (error) {
                    console.error('Failed to cache thumbnail (localStorage might be full):', error);
                  }
                };
                reader.readAsDataURL(thumbnailBlob);
                
                // Return blob URL for immediate use
                const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
                URL.revokeObjectURL(videoBlobUrl);
                resolve(thumbnailUrl);
              } else if (!hasResolved) {
                // Fallback to video blob URL
                hasResolved = true;
                resolve(videoBlobUrl);
              }
            }, 'image/jpeg', 0.8);
          } else {
            // Fallback to video blob URL
            clearTimeout(timeout);
            hasResolved = true;
            resolve(videoBlobUrl);
          }
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          clearTimeout(timeout);
          if (!hasResolved) {
            hasResolved = true;
            resolve(videoBlobUrl);
          }
        }
      };

      video.addEventListener('loadedmetadata', () => {
        // Wait a bit for the video to be fully ready
        setTimeout(() => {
          if (!hasResolved && video.readyState >= 2) {
            // Seek to 1 second or 10% of duration, whichever is less
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
          }
        }, 100);
      });

      video.addEventListener('seeked', () => {
        generateThumbnail();
      });

      video.addEventListener('error', (e) => {
        console.error('Video load error:', e, video.error);
        clearTimeout(timeout);
        if (!hasResolved) {
          hasResolved = true;
          // Still return video blob URL so playback might work
          resolve(videoBlobUrl);
        }
      });

      // Fallback: if loadedmetadata doesn't fire, try to generate thumbnail anyway
      setTimeout(() => {
        if (!hasResolved && video.readyState >= 1) {
          console.warn('Using fallback thumbnail generation');
          video.currentTime = 0;
          setTimeout(generateThumbnail, 500);
        }
      }, 3000);
    });
  }

  private async base64ToBlob(base64: string): Promise<Blob> {
    const response = await fetch(base64);
    return response.blob();
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
      
      // Clean up thumbnail blob URL if it exists
      const blobUrl = this.blobUrls.get(media.id);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        this.blobUrls.delete(media.id);
        
        const urls = new Map(this.thumbnailUrls());
        urls.delete(media.id);
        this.thumbnailUrls.set(urls);
      }
      
      // Clean up full video blob URL if it exists
      const videoBlobUrl = this.blobUrls.get(media.id + '-video');
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
        this.blobUrls.delete(media.id + '-video');
        
        const videoUrls = new Map(this.videoBlobUrls());
        videoUrls.delete(media.id);
        this.videoBlobUrls.set(videoUrls);
      }
      
      // Clear cached video thumbnail if it's a video
      if (this.isVideo(media.mimeType)) {
        try {
          const cacheKey = this.THUMBNAIL_CACHE_PREFIX + media.id;
          localStorage.removeItem(cacheKey);
        } catch (error) {
          console.error('Failed to clear cached thumbnail:', error);
        }
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

  getVideoUrl(media: TeamMedia): string {
    // Return full video blob URL for playback
    const urls = this.videoBlobUrls();
    return urls.get(media.id) || '';
  }

  async openPreview(media: TeamMedia): Promise<void> {
    // For videos, ensure we have the full video loaded
    if (this.isVideo(media.mimeType) && !this.getVideoUrl(media)) {
      await this.loadFullVideo(media);
    }
    this.previewingMedia.set(media);
    this.showPreviewDialog.set(true);
  }

  private async loadFullVideo(media: TeamMedia): Promise<void> {
    try {
      const url = this.teamMediaService.getPreviewUrl(this.teamId(), media.id);
      const blob = await this.http.get(url, { responseType: 'blob' }).toPromise();
      
      if (blob) {
        const videoBlobUrl = URL.createObjectURL(blob);
        // Store the full video URL for preview playback
        this.blobUrls.set(media.id + '-video', videoBlobUrl);
        const videoMap = new Map(this.videoBlobUrls());
        videoMap.set(media.id, videoBlobUrl);
        this.videoBlobUrls.set(videoMap);
      }
    } catch (error) {
      console.error(`Failed to load full video for ${media.id}:`, error);
    }
  }

  closePreview(): void {
    this.showPreviewDialog.set(false);
    // Small delay to allow animation to complete before clearing
    setTimeout(() => this.previewingMedia.set(null), 300);
  }
}
