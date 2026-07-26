/**
 * Copy for the Privacy Policy and Terms & Conditions screens.
 *
 * Both documents share the same renderer (LegalScreen), so they share the same
 * block shape: paragraphs, numbered section headings, and bulleted lists.
 *
 * NOTE: this text is a starting draft and has not been through legal review.
 * Replace it with the approved copy before shipping to production.
 */

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullets'; items: string[] };

export type LegalType = 'privacy' | 'terms';

export type LegalDocument = {
  /** Shown in the header bar. */
  headerTitle: string;
  /** Large title at the top of the scroll view. */
  title: string;
  lastUpdated: string;
  blocks: LegalBlock[];
};

const APP_NAME = 'Nutrily';

export const LEGAL_CONTENT: Record<LegalType, LegalDocument> = {
  privacy: {
    headerTitle: 'Privacy Policy',
    title: 'Privacy Policy',
    lastUpdated: 'July 15, 2026',
    blocks: [
      {
        type: 'paragraph',
        text: `Welcome to ${APP_NAME}. We respect your privacy and are committed to protecting your personal information. This Privacy Policy describes how we collect, use, store, and share information when you use our mobile application and related services.`,
      },
      { type: 'heading', text: '1. Information We Collect' },
      { type: 'paragraph', text: 'We may collect information you provide directly, including:' },
      {
        type: 'bullets',
        items: [
          'Your name, email address, and profile information',
          'Dietary preferences, allergies, and food restrictions',
          'Fitness, calorie, nutrition, and meal-tracking information',
          'Recipes, saved meals, favorites, and activity within the app',
          'Information you send when contacting customer support',
        ],
      },
      { type: 'heading', text: '2. How We Use Your Information' },
      { type: 'paragraph', text: 'We use your information to:' },
      {
        type: 'bullets',
        items: [
          'Create and manage your account',
          'Personalize meal and recipe recommendations',
          'Calculate nutrition and calorie information',
          'Track your meals, goals, and progress',
          'Improve app performance and user experience',
          'Process and manage Premium subscriptions',
          'Respond to your questions and support requests',
        ],
      },
      { type: 'heading', text: '3. How We Share Your Information' },
      {
        type: 'paragraph',
        text: 'We do not sell your personal information. We share it only with service providers who help us operate the app, and only to the extent needed to provide the service:',
      },
      {
        type: 'bullets',
        items: [
          'Cloud hosting and database providers that store your data',
          'Analytics providers that help us understand app usage',
          'Payment and app store providers that process subscriptions',
          'Authorities, where disclosure is required by law',
        ],
      },
      { type: 'heading', text: '4. Data Retention' },
      {
        type: 'paragraph',
        text: 'We keep your information for as long as your account is active. When you delete your account, we remove your personal data, meals, recipes, and subscription records, except where we are required to retain limited records by law.',
      },
      { type: 'heading', text: '5. Your Rights' },
      { type: 'paragraph', text: 'Depending on where you live, you may have the right to:' },
      {
        type: 'bullets',
        items: [
          'Access the personal information we hold about you',
          'Correct information that is inaccurate or incomplete',
          'Delete your account and associated data from within the app',
          'Object to or restrict certain kinds of processing',
          'Export a copy of your data',
        ],
      },
      { type: 'heading', text: '6. Security' },
      {
        type: 'paragraph',
        text: 'We use industry-standard safeguards to protect your information in transit and at rest. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.',
      },
      { type: 'heading', text: "7. Children's Privacy" },
      {
        type: 'paragraph',
        text: `${APP_NAME} is not intended for children under 13, and we do not knowingly collect personal information from them. If you believe a child has provided us information, contact us and we will delete it.`,
      },
      { type: 'heading', text: '8. Changes to This Policy' },
      {
        type: 'paragraph',
        text: 'We may update this Privacy Policy from time to time. When we do, we will revise the date at the top of this page and, where the changes are significant, notify you in the app.',
      },
      { type: 'heading', text: '9. Contact Us' },
      {
        type: 'paragraph',
        text: 'If you have questions about this Privacy Policy or how we handle your information, reach us through the Contact us screen in the app.',
      },
    ],
  },

  terms: {
    headerTitle: 'Terms And Conditions',
    title: 'Terms and Conditions',
    lastUpdated: 'July 15, 2026',
    blocks: [
      {
        type: 'paragraph',
        text: `Welcome to ${APP_NAME}. These Terms and Conditions govern your access to and use of our mobile application, website, and related services. By creating an account or using the app, you agree to these Terms. Please read them carefully before continuing.`,
      },
      { type: 'heading', text: '1. Acceptance of Terms' },
      {
        type: 'paragraph',
        text: `By accessing or using ${APP_NAME}, you confirm that you have read, understood, and agreed to these Terms and our Privacy Policy.`,
      },
      {
        type: 'paragraph',
        text: 'If you do not agree, please stop using the app.',
      },
      { type: 'heading', text: '2. Eligibility' },
      {
        type: 'paragraph',
        text: 'You must meet the minimum legal age required in your country to use the app independently.',
      },
      {
        type: 'paragraph',
        text: 'Users below that age may only use the app with the permission and supervision of a parent or legal guardian.',
      },
      { type: 'heading', text: '3. Your Account' },
      {
        type: 'paragraph',
        text: 'Some features require you to create an account. You agree to:',
      },
      {
        type: 'bullets',
        items: [
          'Provide accurate and current information',
          'Keep your login details secure',
          'Notify us of unauthorized account activity',
          'Accept responsibility for activity under your account',
        ],
      },
      { type: 'heading', text: '4. Health Disclaimer' },
      {
        type: 'paragraph',
        text: `${APP_NAME} provides nutrition estimates and general wellness information. It is not medical advice and is not a substitute for consultation with a qualified healthcare professional. Calorie and macro figures are estimates and may be inaccurate. Always consult a professional before making significant changes to your diet.`,
      },
      { type: 'heading', text: '5. Subscriptions and Billing' },
      {
        type: 'bullets',
        items: [
          'Premium subscriptions are billed through the App Store or Google Play',
          'Subscriptions renew automatically until cancelled',
          'Cancellation takes effect at the end of the current billing period',
          'Manage or cancel your subscription through your store account settings',
          'Refunds are handled by the app store under its own policies',
        ],
      },
      { type: 'heading', text: '6. Your Content' },
      {
        type: 'paragraph',
        text: 'You keep ownership of the recipes, meals, photos, and other content you add. You grant us a limited licence to store and display that content so we can provide the service to you.',
      },
      { type: 'heading', text: '7. Acceptable Use' },
      { type: 'paragraph', text: 'You agree not to:' },
      {
        type: 'bullets',
        items: [
          'Use the app for any unlawful purpose',
          'Attempt to access other users’ accounts or data',
          'Reverse engineer, scrape, or disrupt the service',
          'Upload content that is illegal, harmful, or infringing',
        ],
      },
      { type: 'heading', text: '8. Termination' },
      {
        type: 'paragraph',
        text: 'You may delete your account at any time from the Profile screen. We may suspend or terminate accounts that breach these Terms.',
      },
      { type: 'heading', text: '9. Limitation of Liability' },
      {
        type: 'paragraph',
        text: 'The app is provided on an "as is" basis. To the maximum extent permitted by law, we are not liable for any indirect or consequential loss arising from your use of the app.',
      },
      { type: 'heading', text: '10. Changes to These Terms' },
      {
        type: 'paragraph',
        text: 'We may update these Terms from time to time. Continued use of the app after an update means you accept the revised Terms.',
      },
      { type: 'heading', text: '11. Contact Us' },
      {
        type: 'paragraph',
        text: 'If you have questions about these Terms, reach us through the Contact us screen in the app.',
      },
    ],
  },
};
