import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AITriageRuleEditor } from '@/src/components/admin/bom-logic/AITriageRuleEditor';
import { BOMService } from '@/src/lib/firebase/bom-service';

// Mock the global fetch
global.fetch = jest.fn();

// Mock BOMService
jest.mock('@/src/lib/firebase/bom-service', () => ({
    BOMService: {
        fetchTriageCriteria: jest.fn().mockResolvedValue([]),
        saveTriageCriterion: jest.fn().mockResolvedValue({ success: true }),
        deleteTriageCriterion: jest.fn().mockResolvedValue({ success: true })
    }
}));

describe('AI Extraction Rule Copilot', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        // Return a mocked rule response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                id: "isOutdoor",
                label: "Outdoor Rated",
                type: "boolean",
                promptInstruction: "Look for mentions of outdoor equipment or ruggedized requirements.",
                forcesGuidedFlow: true
            })
        });
    });

    it('should generate an extraction rule using the AI Copilot API and require verification', async () => {
        render(<AITriageRuleEditor />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Loading rules\.\.\./i)).not.toBeInTheDocument();
        });

        // 1. Open the modal
        const addButton = screen.getByRole('button', { name: /Add Extraction Rule/i });
        fireEvent.click(addButton);

        // 2. Enter prompt into AI assistant text area
        const aiInput = screen.getByPlaceholderText(/Describe your extraction intent/i);
        fireEvent.change(aiInput, { target: { value: "Extract if the site is outdoor as a boolean" } });

        // 3. Click the Generate button
        const generateButton = screen.getByRole('button', { name: /Generate Rule/i });
        fireEvent.click(generateButton);

        // 4. Ensure loading state appeared
        expect(generateButton).toBeDisabled();

        // 5. Await verification card and click Accept
        await waitFor(() => {
            const acceptButton = screen.getByRole('button', { name: /Accept & Populate/i });
            expect(acceptButton).toBeInTheDocument();
        });

        const acceptButton = screen.getByRole('button', { name: /Accept & Populate/i });
        fireEvent.click(acceptButton);

        // 6. Verify the form fields were updated
        expect(screen.getByPlaceholderText(/e\.g\., isOutdoor/i)).toHaveValue("isOutdoor");
        expect(screen.getByPlaceholderText(/e\.g\., Outdoor Rated/i)).toHaveValue("Outdoor Rated");
        expect(screen.getByDisplayValue(/Boolean \(True\/False\)/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Explain exactly what the AI should look for/i)).toHaveValue("Look for mentions of outdoor equipment or ruggedized requirements.");
        expect(screen.getByLabelText(/Forces Guided Flow/i)).toBeChecked();

        // 7. Verify the fetch attributes were correct
        expect(global.fetch).toHaveBeenCalledWith('/api/copilot-suggest', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                contextType: 'triage_criterion',
                promptData: {
                    instruction: "Extract if the site is outdoor as a boolean"
                }
            })
        }));
    });
});
