import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import PasswordStrengthMeter from '../PasswordStrengthMeter';

function renderMeter(password) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <PasswordStrengthMeter password={password} />
    </ThemeProvider>
  );
}

describe('PasswordStrengthMeter', () => {
  it('shows "Weak" for a short password like "abc"', () => {
    renderMeter('abc');

    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Fair" for "password1"', () => {
    renderMeter('password1');

    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows "Good" for "password1!"', () => {
    renderMeter('password1!');

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows "Strong" for "StrongPass123!"', () => {
    renderMeter('StrongPass123!');

    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('shows criteria checklist items', () => {
    renderMeter('test');

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Contains a number')).toBeInTheDocument();
    expect(screen.getByText('Contains a special character')).toBeInTheDocument();
    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
  });

  it('renders nothing when password is empty', () => {
    const { container } = renderMeter('');

    expect(container.innerHTML).toBe('');
  });

  it('marks met criteria with a checkmark', () => {
    renderMeter('longpassword1!');

    const items = screen.getAllByRole('listitem');
    // "At least 8 characters" - met
    expect(items[0].textContent).toContain('\u2713');
    // "Contains a number" - met
    expect(items[1].textContent).toContain('\u2713');
    // "Contains a special character" - met
    expect(items[2].textContent).toContain('\u2713');
    // "At least 12 characters" - met (14 chars)
    expect(items[3].textContent).toContain('\u2713');
  });

  it('marks unmet criteria with an X', () => {
    renderMeter('short');

    const items = screen.getAllByRole('listitem');
    // "At least 8 characters" - not met
    expect(items[0].textContent).toContain('\u2717');
    // "Contains a number" - not met
    expect(items[1].textContent).toContain('\u2717');
    // "Contains a special character" - not met
    expect(items[2].textContent).toContain('\u2717');
    // "At least 12 characters" - not met
    expect(items[3].textContent).toContain('\u2717');
  });
});
