import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/helpers/test-utils';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('accepts text input', () => {
    render(<Input />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(input.value).toBe('test value');
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  it('supports different input types', () => {
    render(<Input type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays default value', () => {
    render(<Input defaultValue="default text" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('default text');
  });

  it('can be required', () => {
    render(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('supports maxLength attribute', () => {
    render(<Input maxLength={10} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '10');
  });
});
