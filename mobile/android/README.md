# Xerosite Android Mobile Application

A mobile application for managing team information, members, events, links, media, and subteams using the Xerosite API.

## Features

- **User Authentication**: Login with email and password
- **Team Selection**: View and select from teams you belong to
- **Team Dashboard**: Overview of team information with navigation to detailed sections
- **Team Members**: View all team members with their roles and status
- **Useful Links**: Access team-related links (e.g., The Blue Alliance, Statbotics)
- **Team Media**: Browse team photos, documents, and media files
- **Calendar**: View team events with recurrence support
- **Subteams**: View subteam information, leadership, and members

## Architecture

The app follows modern Android development best practices:

- **MVVM Architecture**: Clear separation of concerns using ViewModels
- **Jetpack Compose**: Modern declarative UI framework
- **Kotlin Coroutines**: Asynchronous programming for API calls
- **Retrofit**: Type-safe HTTP client for API communication
- **DataStore**: Secure storage for auth tokens and preferences
- **Navigation Component**: Type-safe navigation between screens

## Project Structure

```
app/src/main/java/com/example/xeroteamsite/
├── data/
│   ├── api/
│   │   ├── RetrofitClient.kt          # Retrofit configuration
│   │   └── XerositeApiService.kt      # API endpoints
│   ├── model/
│   │   └── Models.kt                   # Data models
│   ├── preferences/
│   │   └── PreferencesManager.kt       # DataStore preferences
│   └── repository/
│       └── XerositeRepository.kt       # Data layer
├── ui/
│   ├── navigation/
│   │   ├── NavGraph.kt                 # Navigation graph
│   │   └── Screen.kt                   # Screen routes
│   ├── screen/
│   │   ├── LoginScreen.kt              # Login UI
│   │   ├── TeamListScreen.kt           # Team selection
│   │   ├── TeamDetailScreen.kt         # Team dashboard
│   │   ├── TeamMembersScreen.kt        # Members list
│   │   ├── TeamLinksScreen.kt          # Links list
│   │   ├── TeamMediaScreen.kt          # Media files
│   │   ├── TeamEventsScreen.kt         # Calendar events
│   │   └── TeamSubteamsScreen.kt       # Subteams list
│   ├── theme/                          # Material 3 theming
│   └── viewmodel/
│       ├── LoginViewModel.kt
│       ├── TeamListViewModel.kt
│       └── TeamDetailViewModel.kt
└── MainActivity.kt                     # Entry point
```

## Configuration

### API Base URL

Update the base URL in `RetrofitClient.kt`:

```kotlin
private const val BASE_URL = "http://10.0.2.2:3000/api/" // Android emulator
// For physical device, use:
// private const val BASE_URL = "http://192.168.1.XXX:3000/api/"
// For production:
// private const val BASE_URL = "https://your-domain.com/api/"
```

### Network Configuration

The app requires internet permission, which is already added to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

For development with HTTP (non-HTTPS), you may need to add network security configuration.

## Dependencies

Key dependencies include:

- **Jetpack Compose**: UI framework
- **Navigation Compose**: Screen navigation
- **Retrofit & OkHttp**: Network requests
- **Gson**: JSON parsing
- **Coil**: Image loading
- **DataStore**: Preferences storage
- **Material 3**: Design system

All dependencies are managed in `gradle/libs.versions.toml`.

## Building and Running

### Prerequisites

- Android Studio Hedgehog or later
- JDK 11 or later
- Android SDK with minimum API level 24 (Android 7.0)

### Build Instructions

1. Open the project in Android Studio
2. Sync Gradle files
3. Update the API base URL in `RetrofitClient.kt`
4. Run the app on an emulator or physical device

### Development Server

If testing with a local development server:

1. For Android Emulator: Use `10.0.2.2` instead of `localhost`
2. For Physical Device: Use your computer's IP address on the same network
3. Ensure the backend server is running and accessible

## Usage

1. **Login**: Enter your email and password from the Xerosite system
2. **Select Team**: Choose a team you belong to from the list
3. **View Dashboard**: Navigate to different sections:
   - Team Members: View member details and roles
   - Useful Links: Open external team links
   - Team Media: Browse media files
   - Calendar: View upcoming events and meetings
   - Subteams: Explore subteam structure and leadership

## API Integration

The app integrates with the Xerosite API as documented in `MOBILE_API_GUIDE.md`. Key endpoints used:

- `POST /auth/login`: User authentication
- `GET /teams`: List user's teams
- `GET /teams/:id`: Team details
- `GET /teams/:id/members`: Team members
- `GET /teams/:id/links`: Team links
- `GET /teams/:id/media`: Team media
- `GET /teams/:id/events`: Team events
- `GET /teams/:id/subteams`: Team subteams

## Security

- Auth tokens are stored securely using DataStore
- Tokens are included in API requests via interceptor
- HTTPS should be used in production
- Sensitive data is never logged in release builds

## Future Enhancements

Potential features for future versions:

- Push notifications for events and messages
- Event attendance tracking
- Message inbox and sending
- Media file upload and download
- Profile editing
- Offline mode with local caching
- Event calendar integration
- File attachments viewing

## Troubleshooting

### Cannot connect to API

- Verify the base URL is correct
- Check network connectivity
- For emulator, ensure server is accessible via `10.0.2.2`
- For device, ensure both are on the same network

### Login fails

- Verify credentials are correct
- Check API server is running
- Review network logs in Logcat
- Ensure user account is active

### Compilation errors

- Sync Gradle files
- Clean and rebuild project
- Update Android Studio if needed
- Check Kotlin version compatibility

## License

[Add your license information here]

## Support

For issues or questions:
- Review the `MOBILE_API_GUIDE.md` for API documentation
- Check Logcat for error messages
- Verify server connectivity and response

## Contributors

[Add contributor information here]

