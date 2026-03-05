const baseTheme = {
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    xxl: '2rem',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 20px rgba(0,0,0,0.15)',
  },
  transitions: {
    default: '0.2s ease-in-out',
  },
};

export const lightTheme = {
  ...baseTheme,
  colors: {
    primary: '#1A73E8',
    primaryHover: '#1557B0',
    secondary: '#5F6368',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceHover: '#E8EAED',
    text: '#202124',
    textSecondary: '#5F6368',
    border: '#DADCE0',
    error: '#D93025',
    success: '#188038',
    warning: '#F9AB00',
    info: '#1A73E8',
    chartColors: ['#1A73E8', '#34A853', '#FBBC04', '#EA4335', '#8E24AA'],
  },
};

export const darkTheme = {
  ...baseTheme,
  colors: {
    primary: '#8AB4F8',
    primaryHover: '#AECBFA',
    secondary: '#9AA0A6',
    background: '#202124',
    surface: '#292A2D',
    surfaceHover: '#35363A',
    text: '#E8EAED',
    textSecondary: '#9AA0A6',
    border: '#5F6368',
    error: '#F28B82',
    success: '#81C995',
    warning: '#FDD663',
    info: '#8AB4F8',
    chartColors: ['#8AB4F8', '#81C995', '#FDD663', '#F28B82', '#C58AF9'],
  },
};
