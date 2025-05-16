# Opian Rewards Mobile App

This is a React Native mobile application for the Opian Rewards platform.

## Setup Instructions

1. Create a new Expo project:
```bash
expo init OpianRewardsMobile
```

2. Install required dependencies:
```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage react-native-paper @expo/vector-icons @tanstack/react-query
```

3. Copy the following files from this repository into your new project:
   - `/src/screens/` - All screen components
   - `/src/services/auth.tsx` - Authentication service
   - `/src/navigation/RootNavigator.tsx` - Navigation setup
   - `/src/lib/queryClient.ts` - React Query setup
   - `App.tsx` - Main application file

4. Create folder for assets:
```bash
mkdir -p assets
```

5. Update the API URL in `src/services/auth.tsx` to point to your backend server.

## Running the App

```bash
npx expo start
```

Then scan the QR code with the Expo Go app on your device.

## Features

- User authentication (login/register)
- Home dashboard with points summary
- Rewards marketplace
- User profile management

## API Integration

This app connects to the Opian Rewards backend API. Make sure your API endpoints support:

- `/api/login` - POST request with username and password
- `/api/register` - POST request with user registration data
- `/api/user` - GET request to fetch user profile data
- `/api/user-profile` - PUT request to update user profile data
- `/api/logout` - POST request to log user out

For token-based authentication, ensure your API returns a token in the login and register responses.