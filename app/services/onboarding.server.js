import { prisma } from "../db.server";

/**
 * Onboarding steps in order
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "connect_data",
  "choose_plan",
  "analytics_setup",
  "completed"
];

/**
 * Get the current onboarding state for a shop
 */
export async function getOnboardingState(shop) {
  console.log("Getting onboarding state for shop:", shop);
  
  try {
    // Find or create onboarding state
    let onboarding = await prisma.onboardingState.findUnique({
      where: { shop }
    });
    
    console.log("Existing onboarding state:", onboarding);
    
    if (!onboarding) {
      console.log("Creating new onboarding state for shop:", shop);
      
      try {
        onboarding = await prisma.onboardingState.create({
          data: { 
            shop,
            currentStep: "welcome",
            completed: false,
            stepsData: "{}"
          }
        });
        console.log("New onboarding state created:", onboarding);
      } catch (createError) {
        console.error("Failed to create onboarding state:", createError);
        throw createError;
      }
    }
    
    return {
      ...onboarding,
      stepsData: onboarding.stepsData ? JSON.parse(onboarding.stepsData) : {}
    };
  } catch (error) {
    console.error("Error in getOnboardingState:", error);
    // Return default state in case of database error
    return {
      currentStep: "welcome",
      completed: false,
      stepsData: {}
    };
  }
}

/**
 * Update the onboarding step for a shop
 */
export async function updateOnboardingStep(shop, step, data = {}) {
  // Find current state
  const current = await getOnboardingState(shop);
  
  // Parse existing data
  const stepsData = current.stepsData || {};
  
  // Update with new data
  const newStepsData = {
    ...stepsData,
    [step]: data
  };
  
  // Determine if this is the final step
  const isCompleted = step === "completed";
  const nextStep = isCompleted 
    ? "completed" 
    : ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1];
  
  // Update the database
  return prisma.onboardingState.update({
    where: { shop },
    data: {
      currentStep: nextStep,
      completed: isCompleted,
      stepsData: JSON.stringify(newStepsData)
    }
  });
}

/**
 * Reset onboarding state (for testing purposes)
 */
export async function resetOnboardingState(shop) {
  return prisma.onboardingState.update({
    where: { shop },
    data: {
      currentStep: "welcome",
      completed: false,
      stepsData: JSON.stringify({})
    }
  });
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentStep) {
  const index = ONBOARDING_STEPS.indexOf(currentStep);
  if (index === -1) return 0;
  return (index / (ONBOARDING_STEPS.length - 1)) * 100;
}
