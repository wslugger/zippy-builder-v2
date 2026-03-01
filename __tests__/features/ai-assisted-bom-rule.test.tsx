import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RuleEditorModal from '@/src/components/admin/bom-logic/RuleEditorModal';

// Mock the global fetch
global.fetch = jest.fn();

describe('AI Assisted BOM Logic Rule Generation', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        // Return a mocked rule response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                name: "AI Generated Rule: Require mGig for Indoor APs",
                description: "This rule requires mGig if indoor APs are 5.",
                condition: { "==": [{ "var": "site.indoorAPs" }, 5] },
                actions: [{
                    type: "set_parameter",
                    targetId: "defaultAccessSpeed",
                    actionValue: "mGig-Copper"
                }]
            })
        });
    });

    it('should generate a rule using the AI Copilot API and require verification', async () => {
        const mockOnSave = jest.fn();
        const mockOnClose = jest.fn();

        render(
            <RuleEditorModal
                isOpen={true}
                ruleToEdit={null}
                serviceCategory="managed_lan"
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        // 1. Enter prompt into AI assistant text area
        const aiInput = screen.getByPlaceholderText(/Describe your intent/i);
        fireEvent.change(aiInput, { target: { value: "Require mGig-Copper if there are 5 indoor APs" } });

        // 2. Click the Generate button
        const generateButton = screen.getByRole('button', { name: /Generate/i });
        fireEvent.click(generateButton);

        // 3. Ensure loading state appeared
        expect(generateButton).toBeDisabled();

        // 4. Await verification card and click Accept
        await waitFor(() => {
            const acceptButton = screen.getByRole('button', { name: /Accept & Populate/i });
            expect(acceptButton).toBeInTheDocument();
        });

        const acceptButton = screen.getByRole('button', { name: /Accept & Populate/i });
        fireEvent.click(acceptButton);

        // 5. Verify the Rule Name was updated
        const ruleNameInput = screen.getByPlaceholderText(/e\.g\. Standard High-Bandwidth Branch/i);
        expect(ruleNameInput).toHaveValue("AI Generated Rule: Require mGig for Indoor APs");

        // 5. Verify the fetch attributes were correct
        expect(global.fetch).toHaveBeenCalledWith('/api/copilot-suggest', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                contextType: 'bom_logic_rule',
                promptData: {
                    instruction: "Require mGig-Copper if there are 5 indoor APs",
                    serviceCategory: "managed_lan"
                }
            })
        }));

        // 6. Check that the UI correctly mapped the condition (visually, checking elements)
        // Check for field dropdown
        const fieldSelect = screen.getByDisplayValue(/Site: Indoor APs/i);
        expect(fieldSelect).toBeInTheDocument();

        // Check for value input format (Index 1 because Index 0 is now the auto-injected service filter)
        const valueInputs = screen.getAllByPlaceholderText(/Value/i);
        expect(valueInputs[1]).toHaveValue("5");

        // 7. Check that the action was mapped correctly
        const actionTypeSelect = screen.getByDisplayValue(/Set Parameter/i);
        expect(actionTypeSelect).toBeInTheDocument();

        // Check target ID
        const targetIdSelect = screen.getByDisplayValue(/Default Access Speed/i);
        expect(targetIdSelect).toBeInTheDocument();
        expect(targetIdSelect).toHaveValue("defaultAccessSpeed");

        // Setup options dropdown since setting a parameter dynamically loads predefined dropdown options if provided
        const actionValueSelect = screen.queryByDisplayValue(/mGig-Copper/i);
        expect(actionValueSelect).toBeInTheDocument();
    });
});
