import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Capture the last push call
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

// Mock firebase to return test projects
jest.mock('@/src/lib/firebase', () => ({
    ProjectService: {
        getUserProjects: jest.fn().mockResolvedValue([
            { id: 'p1', userId: 'u1', name: 'Step 2 project', customerName: 'A', status: 'package_selection', currentStep: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
            { id: 'p2', userId: 'u1', name: 'Step 3 project', customerName: 'B', status: 'package_selection', currentStep: 3, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
            { id: 'p3', userId: 'u1', name: 'Step 4 project', customerName: 'C', status: 'customizing', currentStep: 4, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
            { id: 'p4', userId: 'u1', name: 'Step 5 project', customerName: 'D', status: 'completed', currentStep: 5, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        ]),
    },
}));

import SADashboard from '@/src/app/sa/dashboard/page';

describe('Bug: Projects should resume at their current step', () => {
    beforeEach(() => {
        mockPush.mockClear();
    });

    it('navigates to package-selection for a project at step 2', async () => {
        const user = userEvent.setup();
        render(<SADashboard />);

        const card = await screen.findByText('Step 2 project');
        await user.click(card);

        expect(mockPush).toHaveBeenCalledWith('/sa/project/p1/package-selection');
    });

    it('navigates to summary for a project at step 3', async () => {
        const user = userEvent.setup();
        render(<SADashboard />);

        const card = await screen.findByText('Step 3 project');
        await user.click(card);

        expect(mockPush).toHaveBeenCalledWith('/sa/project/p2/summary');
    });

    it('navigates to customize for a project at step 4', async () => {
        const user = userEvent.setup();
        render(<SADashboard />);

        const card = await screen.findByText('Step 4 project');
        await user.click(card);

        expect(mockPush).toHaveBeenCalledWith('/sa/project/p3/customize');
    });

    it('navigates to design-doc for a project at step 5', async () => {
        const user = userEvent.setup();
        render(<SADashboard />);

        const card = await screen.findByText('Step 5 project');
        await user.click(card);

        expect(mockPush).toHaveBeenCalledWith('/sa/project/p4/design-doc');
    });
});
