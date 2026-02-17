import { render, screen } from '@testing-library/react';
import Home from '@/src/app/page';
import '@testing-library/jest-dom';

describe('SA Flow Enablement', () => {
    it('should have an enabled Solutions Architect link pointing to /sa/dashboard', () => {
        render(<Home />);

        const saLink = screen.getByRole('link', { name: /solutions architect/i });
        expect(saLink).toBeInTheDocument();
        expect(saLink).toHaveAttribute('href', '/sa/dashboard');
        expect(saLink).not.toHaveClass('opacity-60');
        expect(saLink).not.toHaveClass('cursor-not-allowed');

        const comingSoonText = screen.queryByText(/coming soon/i);
        expect(comingSoonText).not.toBeInTheDocument();
    });
});
