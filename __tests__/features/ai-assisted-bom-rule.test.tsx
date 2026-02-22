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
                condition: { "==": [{ "var": "site.indoorAPs" }, 5] },
                actions: [{
                    type: "set_parameter",
                    targetId: "defaultAccessSpeed",
                    actionValue: "mGig-Copper"
                }]
            })
        });
    });

    it('should generate a rule using the AI Copilot API', async () => {
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
        const aiInput = screen.getByPlaceholderText(/Describe the rule/i);
        fireEvent.change(aiInput, { target: { value: "Require mGig-Copper if there are 5 indoor APs" } });

        // 2. Click the Generate button
        const generateButton = screen.getByRole('button', { name: /Generate/i });
        fireEvent.click(generateButton);

        // 3. Ensure loading state appeared
        expect(generateButton).toBeDisabled();

        // 4. Await API resolution and verify the Rule Name was updated
        // Use placeholder for robust finding
        await waitFor(() => {
            const ruleNameInput = screen.getByPlaceholderText(/e\.g\. Standard High-Bandwidth Branch/i);
            expect(ruleNameInput).toHaveValue("AI Generated Rule: Require mGig for Indoor APs");
        });

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

        // Check for value input format
        const valueInputs = screen.getAllByPlaceholderText(/Value/i);
        expect(valueInputs[0]).toHaveValue("5");

        // 7. Check that the action was mapped correctly
        const actionTypeSelect = screen.getByDisplayValue(/Set Parameter/i);
        expect(actionTypeSelect).toBeInTheDocument();

        // Check target ID
        const targetIdInput = screen.getByPlaceholderText(/e\.g\. meraki_mx85/i);
        expect(targetIdInput).toHaveValue("defaultAccessSpeed");

        // Setup options dropdown since setting a parameter dynamically loads predefined dropdown options if provided
        const actionValueSelect = screen.queryByDisplayValue(/mGig-Copper/i);
        expect(actionValueSelect).toBeInTheDocument();
    });
});
