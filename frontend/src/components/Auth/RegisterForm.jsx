import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';
import Input from '../Common/Input';
import Button from '../Common/Button';
import Card from '../Common/Card';
import Spinner from '../Common/Spinner';
import PasswordStrengthMeter from './PasswordStrengthMeter';

const FormCard = styled(Card)`
  width: 100%;
  max-width: 420px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ErrorBanner = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => `${theme.colors.error}15`};
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
`;

const Footer = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.sm};

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/;

function RegisterForm() {
  const navigate = useNavigate();
  const { isLoading, error, register, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validate = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!PASSWORD_REGEX.test(password)) {
      errors.password =
        'Password must contain at least one number and one special character';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await register(email, password);
    if (!result.error) {
      navigate('/login', { replace: true });
    }
  };

  return (
    <FormCard>
      <Form onSubmit={handleSubmit} noValidate>
        <Title>Create Account</Title>

        {error && <ErrorBanner role="alert">{error}</ErrorBanner>}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={formErrors.email}
          autoComplete="email"
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Min 8 chars, number + special char"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={formErrors.password}
          autoComplete="new-password"
          disabled={isLoading}
        />

        {password && <PasswordStrengthMeter password={password} />}

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={formErrors.confirmPassword}
          autoComplete="new-password"
          disabled={isLoading}
        />

        <Button type="submit" $variant="primary" disabled={isLoading}>
          {isLoading ? <Spinner size="20px" /> : 'Create Account'}
        </Button>

        <Footer>
          Already have an account? <Link to="/login">Sign in</Link>
        </Footer>
      </Form>
    </FormCard>
  );
}

export default RegisterForm;
