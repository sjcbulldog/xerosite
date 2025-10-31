# Upload Progress Bar for Message Attachments

## Summary
Implemented a visual progress bar that displays upload progress when sending messages with attachments. The progress bar shows the percentage of data uploaded and provides real-time feedback to users.

## Implementation Details

### 1. Messages Service Updates
**File:** `frontend/src/app/dashboard/messages.service.ts`

#### Added HTTP Event Tracking
- Imported `HttpEvent`, `HttpEventType`, and `Observable` from Angular HTTP client
- Added `map` operator from RxJS for transforming HTTP events

#### New Method: `sendMessageWithProgress()`
- Returns an Observable that emits progress and response events
- Configures HTTP request with `reportProgress: true` and `observe: 'events'`
- Maps HTTP events to a simple format:
  - `{ type: 'progress', progress: number }` - Upload progress percentage (0-100)
  - `{ type: 'response', response: MessageResponse }` - Final response when complete
- Tracks `HttpEventType.UploadProgress` events to calculate percentage
- Detects `HttpEventType.Response` for completion

### 2. Component Updates
**File:** `frontend/src/app/dashboard/send-message-dialog.component.ts`

#### New Signals
- `uploadProgress: signal<number | null>(null)` - Current upload percentage
- `isUploading: signal(false)` - Flag indicating active upload

#### Updated `onSendMessage()` Method
- Checks if files are attached before sending
- For messages with attachments:
  - Uses `sendMessageWithProgress()` instead of `sendMessage()`
  - Subscribes to progress events
  - Updates `uploadProgress` signal as upload progresses
  - Sets `isUploading` flag during upload
- For messages without attachments:
  - Uses original `sendMessage()` method (no progress needed)
- Resets progress indicators on completion or error

### 3. Template Updates
**File:** `frontend/src/app/dashboard/send-message-dialog.component.html`

#### Progress Bar Display
Added conditional progress bar section that displays when:
- `isUploading()` is true
- `uploadProgress()` is not null

**Progress Bar Structure:**
```html
<div class="upload-progress-container">
  <div class="upload-progress-label">
    Uploading attachments... {{ uploadProgress() }}%
  </div>
  <div class="upload-progress-bar">
    <div class="upload-progress-fill" [style.width.%]="uploadProgress()">
    </div>
  </div>
</div>
```

### 4. Styling Updates
**File:** `frontend/src/app/dashboard/send-message-dialog.component.scss`

#### Progress Bar Styles

**Container:**
- Light gray background with border
- Padding and rounded corners for clean appearance
- Positioned above the action buttons

**Progress Label:**
- Centered text showing "Uploading attachments... X%"
- Bold font for visibility

**Progress Bar:**
- 24px height with rounded ends
- Light gray background track
- Inset shadow for depth

**Progress Fill:**
- Blue gradient fill (`#007bff` to `#0056b3`)
- Smooth width transition (0.3s ease)
- Animated shine effect for visual feedback
- Drop shadow for depth

**Animation:**
- Subtle shine animation that moves across the progress bar
- Creates a professional, polished appearance
- Indicates active processing

## User Experience

### Before Upload
- User selects files and clicks "Send Message"
- Submit button changes to "Sending..."

### During Upload
- Progress bar appears below messages/errors
- Shows "Uploading attachments... X%"
- Blue progress bar fills from left to right
- Percentage updates in real-time
- Animated shine effect shows activity

### After Upload
- Progress bar reaches 100%
- Progress bar disappears
- Success message displays: "Message sent successfully!"
- Dialog closes after 1.5 seconds

### Error Handling
- If upload fails, progress bar disappears
- Error message displays
- User can retry the operation

## Technical Details

### Progress Calculation
```typescript
const progress = event.total 
  ? Math.round((100 * event.loaded) / event.total) 
  : 0;
```

### Observable Pattern
The service returns an Observable that allows the component to:
- Subscribe to progress updates
- React to completion
- Handle errors gracefully
- Unsubscribe automatically via Promise wrapper

### Performance Considerations
- Progress updates use Angular's change detection efficiently via signals
- CSS transitions provide smooth visual updates
- Only activates when attachments are present
- Minimal overhead for messages without attachments

## Browser Compatibility
- Uses standard Angular HTTP client features
- CSS animations with fallback (graceful degradation)
- Works in all modern browsers

## Testing Scenarios

### Small Files (<1 MB)
- Progress bar shows briefly
- Completes quickly
- May show 0%, then 100% for very small files

### Large Files (>1 MB)
- Progress bar displays for longer duration
- Shows incremental progress (0% → 25% → 50% → 75% → 100%)
- Provides clear feedback on upload status

### Multiple Files
- Shows aggregate progress for all files
- Single progress bar for entire upload
- Percentage based on total bytes uploaded

### Slow Connections
- Progress bar especially useful
- Clear indication that upload is in progress
- Prevents user confusion or duplicate submissions

## Benefits

1. **User Feedback**: Clear visual indication of upload progress
2. **Professional UX**: Polished, modern interface element
3. **Prevents Confusion**: Users know their action is being processed
4. **Error Prevention**: Less likely to close dialog or retry prematurely
5. **Confidence**: Users can see files are being uploaded successfully

## Files Modified

- ✅ `frontend/src/app/dashboard/messages.service.ts` - Added progress tracking
- ✅ `frontend/src/app/dashboard/send-message-dialog.component.ts` - Progress signals and logic
- ✅ `frontend/src/app/dashboard/send-message-dialog.component.html` - Progress bar UI
- ✅ `frontend/src/app/dashboard/send-message-dialog.component.scss` - Progress bar styling
