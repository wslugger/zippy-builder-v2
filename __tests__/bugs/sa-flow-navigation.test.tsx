import { render, screen } from '@testing-library/react';
import ProjectLayout from '@/src/app/sa/project/[id]/layout';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    usePathname: () => '/sa/project/123/design-doc',
}));

// Mock next/link
jest.mock('next/link', () => {
    const MockLink = ({ children }: { children: React.ReactNode }) => {
        return <a>{children}</a>;
    };
    MockLink.displayName = 'MockLink';
    return MockLink;
});

describe('SA Flow Navigation', () => {
    it('shows BOM Builder and HDL steps in the project layout', () => {
        render(
            <ProjectLayout>
                <div>Content</div>
            </ProjectLayout>
        );

        // These should fail currently
        expect(screen.getByText(/5\. BOM Builder/i)).toBeInTheDocument();
        expect(screen.getByText(/6\. HLD/i)).toBeInTheDocument();
    });
});
