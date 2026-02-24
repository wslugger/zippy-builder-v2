import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsultantChat from '../../src/components/sa/ConsultantChat';
import { AIService } from '../../src/lib/ai-service';
import { Project, Package, Service } from '../../src/lib/types';

jest.mock('../../src/lib/ai-service', () => ({
    AIService: {
        chatWithConsultant: jest.fn(),
    },
}));

window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('ConsultantChat Feature', () => {
    const mockProject: Project = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
        customerName: 'Acme Corp',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStep: 2,
    };

    const mockPackages: Package[] = [];
    const mockServices: Service[] = [];

    it('renders the chat interface', () => {
        render(
            <ConsultantChat
                project={mockProject}
                packages={mockPackages}
                services={mockServices}
            />
        );

        expect(screen.getByText('Package Chat')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Ask about package recommendations/i)).toBeInTheDocument();
    });
});
