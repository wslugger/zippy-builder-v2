// Mock Firebase completely before any imports
jest.mock("firebase/app", () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    getApp: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    initializeFirestore: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    collection: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
    getStorage: jest.fn(),
}));

import { AIPromptsService, DEFAULT_AI_PROMPTS } from "@/src/lib/firebase/ai-prompts-service";
import { getDoc } from "firebase/firestore";

describe("AIPromptsService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return default values when Firestore document does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false
        });

        const config = await AIPromptsService.getPromptConfig('package_selection');
        const defaultVal = DEFAULT_AI_PROMPTS.find(p => p.id === 'package_selection');

        expect(config).toEqual(defaultVal);
        expect(config.model).toBe('gemini-2.5-flash');
    });

    it("should merge Firestore values with defaults", async () => {
        const mockData = {
            model: "gemini-3.0-flash",
            temperature: 0.5
        };

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockData
        });

        const config = await AIPromptsService.getPromptConfig('package_selection');
        const defaultVal = DEFAULT_AI_PROMPTS.find(p => p.id === 'package_selection')!;

        expect(config.id).toBe('package_selection');
        expect(config.model).toBe('gemini-3.0-flash');
        expect(config.temperature).toBe(0.5);
        // Should keep default instruction/template if not in Firestore
        expect(config.systemInstruction).toBe(defaultVal.systemInstruction);
        expect(config.userPromptTemplate).toBe(defaultVal.userPromptTemplate);
    });

    it("should correctly template prompts (Logic verification in service usage)", () => {
        const config = DEFAULT_AI_PROMPTS.find(p => p.id === 'package_selection')!;

        const packageSummaries = "PKG-A, PKG-B";
        const requirementsTextSection = "Needs Fast Wi-Fi";

        const rendered = config.userPromptTemplate
            .replace('{packageSummaries}', packageSummaries)
            .replace('{requirementsTextSection}', requirementsTextSection);

        expect(rendered).toContain("PKG-A, PKG-B");
        expect(rendered).toContain("Needs Fast Wi-Fi");
    });
});
