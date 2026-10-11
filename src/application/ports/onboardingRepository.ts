import type { OnboardingData } from '../../domain/onboarding.types';

export interface OnboardingRepository {
  submitOnboarding(uid: string, email: string, data: OnboardingData): Promise<void>;
}