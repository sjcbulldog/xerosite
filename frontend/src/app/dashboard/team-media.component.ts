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
import { HttpClient, HttpEventType } from '@angular/common/http';
import { TeamMediaService } from './team-media.service';
import { TeamMedia } from './team-media.types';
import { AuthService } from '../auth/auth.service';
import { UserGroupsService, UserGroup } from './user-groups.service';

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
  private readonly userGroupsService = inject(UserGroupsService);

  readonly showSection = signal(false);
  readonly showUploadDialog = signal(false);
  readonly editingMedia = signal<TeamMedia | null>(null);
  readonly isDragging = signal(false);
  readonly showPreviewDialog = signal(false);
  readonly previewingMedia = signal<TeamMedia | null>(null);

  readonly filterText = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly uploadTitle = signal('');
  readonly uploadYear = signal(new Date().getFullYear());
  readonly uploadUserGroupId = signal<string | null>(null);
  readonly editTitle = signal('');
  readonly editYear = signal(new Date().getFullYear());
  readonly editUserGroupId = signal<string | null>(null);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly userGroups = signal<UserGroup[]>([]);

  // Track which year sections and media type sections are expanded
  readonly expandedYears = signal<Set<number>>(new Set());
  readonly expandedMediaTypes = signal<Map<number, Set<string>>>(new Map());

  // Store blob URLs for cleanup
  private blobUrls = new Map<string, string>();
  // Signal to track loaded thumbnails
  readonly thumbnailUrls = signal<Map<string, string>>(new Map());
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

  // Group all media by year, then by type
  readonly mediaByYear = computed(() => {
    const media = this.filteredMedia();
    const grouped = new Map<number, Map<string, TeamMedia[]>>();
    
    media.forEach((item) => {
      // Use 0 as a placeholder for null/undefined years (will display as "Unknown Year")
      const year = item.year ?? 0;
      
      if (!grouped.has(year)) {
        grouped.set(year, new Map([
          ['pictures', []],
          ['videos', []],
          ['other', []]
        ]));
      }
      
      const yearGroup = grouped.get(year)!;
      
      if (this.isImage(item.mimeType)) {
        yearGroup.get('pictures')!.push(item);
      } else if (this.isVideo(item.mimeType)) {
        yearGroup.get('videos')!.push(item);
      } else {
        yearGroup.get('other')!.push(item);
      }
    });
    
    // Sort years in descending order, but keep 0 (Unknown Year) at the end
    return new Map([...grouped.entries()].sort((a, b) => {
      if (a[0] === 0) return 1; // Unknown Year goes to the end
      if (b[0] === 0) return -1; // Unknown Year goes to the end
      return b[0] - a[0]; // Regular years in descending order
    }));
  });

  ngOnInit(): void {
    this.loadMedia();
    this.loadUserGroups();
  }

  ngOnDestroy(): void {
    this.teamMediaService.clearMedia();
    // Clean up all blob URLs for thumbnails
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

  async loadUserGroups(): Promise<void> {
    try {
      const groups = await this.userGroupsService.getUserGroups(this.teamId());
      this.userGroups.set(groups);
    } catch (error) {
      console.error('Failed to load user groups:', error);
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

  toggleYearSection(year: number): void {
    const current = this.expandedYears();
    
    if (current.has(year)) {
      current.delete(year);
    } else {
      current.add(year);
    }
    
    this.expandedYears.set(new Set(current));
  }

  isYearExpanded(year: number): boolean {
    return this.expandedYears().has(year);
  }

  toggleMediaTypeSection(year: number, mediaType: string): void {
    const current = this.expandedMediaTypes();
    const yearMap = current.get(year) || new Set<string>();
    
    if (yearMap.has(mediaType)) {
      yearMap.delete(mediaType);
    } else {
      yearMap.add(mediaType);
    }
    
    current.set(year, yearMap);
    this.expandedMediaTypes.set(new Map(current));
  }

  isMediaTypeExpanded(year: number, mediaType: string): boolean {
    return this.expandedMediaTypes().get(year)?.has(mediaType) || false;
  }

  expandAll(): void {
    // Expand all years
    const allYears = new Set(Array.from(this.mediaByYear().keys()));
    this.expandedYears.set(allYears);
    
    // Expand all media types within each year
    const allMediaTypes = new Map<number, Set<string>>();
    this.mediaByYear().forEach((_, year) => {
      allMediaTypes.set(year, new Set(['pictures', 'videos', 'other']));
    });
    this.expandedMediaTypes.set(allMediaTypes);
  }

  collapseAll(): void {
    this.expandedYears.set(new Set());
    this.expandedMediaTypes.set(new Map());
  }

  openUploadDialog(): void {
    this.selectedFile.set(null);
    this.uploadTitle.set('');
    this.uploadYear.set(new Date().getFullYear());
    this.uploadUserGroupId.set(null);
    this.showUploadDialog.set(true);
  }

  closeUploadDialog(): void {
    this.showUploadDialog.set(false);
    this.selectedFile.set(null);
    this.uploadTitle.set('');
    this.uploadYear.set(new Date().getFullYear());
    this.uploadUserGroupId.set(null);
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
    const year = this.uploadYear();
    const userGroupId = this.uploadUserGroupId();

    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!title) {
      alert('Please provide a title');
      return;
    }

    if (!year || year < 1900 || year > 2100) {
      alert('Please provide a valid year (1900-2100)');
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    try {
      // Subscribe to the upload observable to track progress
      let uploadedMedia: TeamMedia | null = null;

      await new Promise<void>((resolve, reject) => {
        this.teamMediaService
          .uploadFile(
            this.teamId(),
            file,
            title,
            year,
            userGroupId || undefined
          )
          .subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress) {
                // Calculate and update progress percentage
                if (event.total) {
                  const progress = Math.round((100 * event.loaded) / event.total);
                  this.uploadProgress.set(progress);
                }
              } else if (event.type === HttpEventType.Response) {
                // Upload complete, store the response
                uploadedMedia = event.body;
                resolve();
              }
            },
            error: (error) => reject(error),
          });
      });

      this.closeUploadDialog();

      // Reload media list from server to apply proper visibility filtering
      await this.loadMedia();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      this.isUploading.set(false);
      this.uploadProgress.set(0);
    }
  }

  startEdit(media: TeamMedia): void {
    console.log('Starting edit for media:', {
      id: media.id,
      title: media.title,
      userGroupId: media.userGroupId,
      userGroupName: media.userGroupName
    });
    this.editingMedia.set(media);
    this.editTitle.set(media.title);
    // If year is null, default to current year for editing
    this.editYear.set(media.year ?? new Date().getFullYear());
    // Set userGroupId - convert null to null (will be handled by ngModel as empty string)
    this.editUserGroupId.set(media.userGroupId || null);
    console.log('Edit form initialized with userGroupId:', this.editUserGroupId());
  }

  cancelEdit(): void {
    this.editingMedia.set(null);
  }

  async saveEdit(): Promise<void> {
    const media = this.editingMedia();
    if (!media) return;

    const title = this.editTitle().trim();
    const year = this.editYear();
    const userGroupId = this.editUserGroupId();

    console.log('Saving edit with:', { title, year, userGroupId });

    if (!title) {
      alert('Please provide a title');
      return;
    }

    if (!year || year < 1900 || year > 2100) {
      alert('Please provide a valid year (1900-2100)');
      return;
    }

    try {
      await this.teamMediaService.updateTitle(
        this.teamId(),
        media.id,
        title,
        year,
        userGroupId // Pass as-is (null means "All Team Members")
      );
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
    // For video playback, use direct server URL for streaming
    // This allows the video to start playing immediately without downloading the entire file
    const baseUrl = this.teamMediaService.getPreviewUrl(this.teamId(), media.id);
    
    // Add JWT token as query parameter for authentication
    const token = this.authService.getToken();
    return token ? `${baseUrl}?token=${token}` : baseUrl;
  }

  async openPreview(media: TeamMedia): Promise<void> {
    // Open preview immediately - videos will stream from server
    this.previewingMedia.set(media);
    this.showPreviewDialog.set(true);
  }

  closePreview(): void {
    this.showPreviewDialog.set(false);
    // Small delay to allow animation to complete before clearing
    setTimeout(() => this.previewingMedia.set(null), 300);
  }

  getYearsArray(): number[] {
    return Array.from(this.mediaByYear().keys());
  }

  getYearLabel(year: number): string {
    return year === 0 ? 'Unknown Year' : year.toString();
  }

  getMediaTypeLabel(mediaType: string): string {
    const labels: { [key: string]: string } = {
      'pictures': 'Pictures',
      'videos': 'Videos',
      'other': 'Other'
    };
    return labels[mediaType] || mediaType;
  }

  getMediaTypeCount(year: number, mediaType: string): number {
    return this.mediaByYear().get(year)?.get(mediaType)?.length || 0;
  }

  getMediaForType(year: number, mediaType: string): TeamMedia[] {
    return this.mediaByYear().get(year)?.get(mediaType) || [];
  }
}
