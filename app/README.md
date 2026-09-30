# Nutrily Mobile App

The frontend mobile application for Nutrily, built using React Native and Expo.

## Overview

Nutrily allows users to:
- Log meals and track daily caloric and macronutrient intake.
- Discover and generate recipes using an AI Recipe Wizard.
- Save favorite meals and share them with friends.
- Monitor streaks and nutrition goals.
- Subscribe to premium features.

## Tech Stack

- **Framework**: React Native with Expo (SDK 54)
- **Navigation**: React Navigation
- **State Management**: Redux Toolkit
- **Backend as a Service (BaaS)**: Supabase
- **In-App Purchases**: RevenueCat (`react-native-purchases`)
- **Localization**: i18next

## Directory Structure

- `src/components/`: Reusable UI components (atoms, cards, modals).
- `src/screens/`: Application screens corresponding to navigation routes.
- `src/services/`: API integration and pipeline logic for AI features.
- `src/store/`: Redux slices and store configuration.
- `src/i18n/`: Internationalization setup and locale files.
- `assets/`: Images, icons, and svgs.

## Getting Started

### Installation
```bash
npm install
```

### Running the App
```bash
npm start
# or
npx expo start
```
This will start the Expo development server. You can then run the app on an iOS simulator, Android emulator, or a physical device using the Expo Go app.

## Building
To build for production, you can use EAS (Expo Application Services):
```bash
eas build --platform all
```
