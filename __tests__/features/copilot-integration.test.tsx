import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineCopilotTrigger } from '../../src/components/common/InlineCopilotTrigger';
import { CopilotSuggestion } from '../../src/components/common/CopilotSuggestion';

describe('Copilot Integration Components', () => {
    describe('InlineCopilotTrigger', () => {
        it('renders and responds to clicks', () => {
            const onClick = jest.fn();
            render(<InlineCopilotTrigger onClick={onClick} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);
            expect(onClick).toHaveBeenCalled();
        });

        it('shows loading state and disables button', () => {
            const { container } = render(<InlineCopilotTrigger onClick={() => { }} isLoading={true} />);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        });
    });

    describe('CopilotSuggestion', () => {
        it('renders children without suggestion UI when suggestion is null', () => {
            render(
                <CopilotSuggestion suggestion={null} onAccept={() => { }} onReject={() => { }}>
                    <input type="text" data-testid="target-input" />
                </CopilotSuggestion>
            );

            expect(screen.getByTestId('target-input')).toBeInTheDocument();
            expect(screen.queryByText('AI Suggests:')).not.toBeInTheDocument();
        });

        it('displays suggestion UI and handles accept/reject', () => {
            const onAccept = jest.fn();
            const onReject = jest.fn();

            render(
                <CopilotSuggestion suggestion="Suggested text" onAccept={onAccept} onReject={onReject}>
                    <input type="text" data-testid="target-input" />
                </CopilotSuggestion>
            );

            expect(screen.getByTestId('target-input')).toBeInTheDocument();
            expect(screen.getByText('AI Suggests:')).toBeInTheDocument();
            expect(screen.getByText('Suggested text')).toBeInTheDocument();

            const acceptBtn = screen.getByRole('button', { name: /accept/i });
            fireEvent.click(acceptBtn);
            expect(onAccept).toHaveBeenCalled();

            const rejectBtn = screen.getByTitle('Reject');
            fireEvent.click(rejectBtn);
            expect(onReject).toHaveBeenCalled();
        });
    });
});
