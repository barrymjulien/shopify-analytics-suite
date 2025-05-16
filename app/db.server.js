import { PrismaClient } from "@prisma/client";

let prisma;

try {
  if (process.env.NODE_ENV !== "production") {
    if (!global.prismaGlobal) {
      global.prismaGlobal = new PrismaClient();
    }
    prisma = global.prismaGlobal;
  } else {
    prisma = new PrismaClient();
  }
} catch (error) {
  console.error("Error initializing Prisma client:", error);
  
  // Provide a fallback mock client for development
  prisma = {
    session: {
      findUnique: () => Promise.resolve(null),
      findFirst: () => Promise.resolve(null),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
      deleteMany: () => Promise.resolve({})
    },
    onboardingState: {
      findUnique: () => Promise.resolve({ completed: false, currentStep: "welcome", stepsData: "{}" }),
      create: () => Promise.resolve({ completed: false, currentStep: "welcome", stepsData: "{}" }),
      update: () => Promise.resolve({ completed: true, currentStep: "completed", stepsData: "{}" })
    },
    analyticsCache: {
      findFirst: () => Promise.resolve(null),
      upsert: () => Promise.resolve({})
    },
    customerProfile: {
      upsert: () => Promise.resolve({})
    }
  };
}

export { prisma };
