import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const BarBackground = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background-color: ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: width 0.3s ease-in-out, background-color 0.3s ease-in-out;
`;

const StrengthLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const CriteriaList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CriteriaItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ $met, theme }) => ($met ? theme.colors.success : theme.colors.textSecondary)};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

function getStrengthInfo(password) {
  const criteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains a special character', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
    { label: 'At least 12 characters', met: password.length >= 12 },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const percent = metCount * 25;

  let label;
  let color;
  if (metCount <= 1) {
    label = 'Weak';
    color = '#D93025';
  } else if (metCount === 2) {
    label = 'Fair';
    color = '#E8710A';
  } else if (metCount === 3) {
    label = 'Good';
    color = '#F9AB00';
  } else {
    label = 'Strong';
    color = '#188038';
  }

  return { criteria, percent, label, color };
}

function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const { criteria, percent, label, color } = getStrengthInfo(password);

  return (
    <Container>
      <BarBackground>
        <BarFill $percent={percent} $color={color} />
      </BarBackground>
      <StrengthLabel $color={color}>{label}</StrengthLabel>
      <CriteriaList>
        {criteria.map((criterion) => (
          <CriteriaItem key={criterion.label} $met={criterion.met}>
            <span>{criterion.met ? '\u2713' : '\u2717'}</span>
            <span>{criterion.label}</span>
          </CriteriaItem>
        ))}
      </CriteriaList>
    </Container>
  );
}

export default PasswordStrengthMeter;
