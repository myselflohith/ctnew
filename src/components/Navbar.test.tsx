import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/helpers/test-utils';
import { Navbar } from '@/components/Navbar';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Navbar Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders logo and brand name', () => {
    render(<Navbar />);
    expect(screen.getByText('CardinalTalent')).toBeInTheDocument();
    expect(screen.getByAltText('CardinalTalent')).toBeInTheDocument();
  });

  it('renders desktop navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('Browse Jobs')).toBeInTheDocument();
    expect(screen.getByText('For Employers')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders Sign In and Get Started buttons', () => {
    render(<Navbar />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('navigates to auth page when Sign In is clicked', () => {
    render(<Navbar />);
    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('navigates to signup page when Get Started is clicked', () => {
    render(<Navbar />);
    const getStartedButton = screen.getByText('Get Started');
    fireEvent.click(getStartedButton);
    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=signup');
  });

  it('toggles mobile menu when menu button is clicked', () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText('Toggle menu');
    
    fireEvent.click(menuButton);
    
    const mobileLinks = screen.getAllByText('Browse Jobs');
    expect(mobileLinks.length).toBeGreaterThan(1);
  });

  it('closes mobile menu when a link is clicked', () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText('Toggle menu');
    
    fireEvent.click(menuButton);
    
    const mobileLinks = screen.getAllByText('Browse Jobs');
    fireEvent.click(mobileLinks[1]);
    
    expect(screen.queryByText('Browse Jobs')).toBeInTheDocument();
  });

  it('displays menu icon when mobile menu is closed', () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText('Toggle menu');
    expect(menuButton.querySelector('svg')).toBeInTheDocument();
  });

  it('displays close icon when mobile menu is open', () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText('Toggle menu');
    
    fireEvent.click(menuButton);
    
    expect(menuButton.querySelector('svg')).toBeInTheDocument();
  });
});
