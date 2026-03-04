import { render, screen, fireEvent } from '@testing-library/react';
import App, { evaluate } from './App';

// ─── Math engine tests ────────────────────────────────────────────────────────

describe('evaluate – basic arithmetic', () => {
  test('addition',       () => expect(evaluate('2+3')).toBe(5));
  test('subtraction',    () => expect(evaluate('10-4')).toBe(6));
  test('multiplication', () => expect(evaluate('3×4')).toBe(12));
  test('division',       () => expect(evaluate('10÷2')).toBe(5));
  test('unary minus',    () => expect(evaluate('-5')).toBe(-5));
});

describe('evaluate – operator precedence & parentheses', () => {
  test('precedence: 2+3×4 = 14', () => expect(evaluate('2+3×4')).toBe(14));
  test('parens: (2+3)×4 = 20',   () => expect(evaluate('(2+3)×4')).toBe(20));
  test('power: 2^10 = 1024',     () => expect(evaluate('2^10')).toBe(1024));
});

describe('evaluate – scientific functions', () => {
  test('sqrt(9) = 3',     () => expect(evaluate('sqrt(9)')).toBe(3));
  test('cbrt(27) = 3',    () => expect(evaluate('cbrt(27)')).toBe(3));
  test('abs(-7) = 7',     () => expect(evaluate('abs(-7)')).toBe(7));
  test('fact(5) = 120',   () => expect(evaluate('fact(5)')).toBe(120));
  test('log(100) = 2',    () => expect(evaluate('log(100)')).toBeCloseTo(2));
  test('ln(e) = 1',       () => expect(evaluate('ln(e)')).toBeCloseTo(1));
});

describe('evaluate – trigonometry (DEG)', () => {
  test('sin(0) = 0',   () => expect(evaluate('sin(0)',   'DEG')).toBeCloseTo(0));
  test('cos(0) = 1',   () => expect(evaluate('cos(0)',   'DEG')).toBeCloseTo(1));
  test('sin(90) = 1',  () => expect(evaluate('sin(90)',  'DEG')).toBeCloseTo(1));
  test('cos(90) = 0',  () => expect(evaluate('cos(90)',  'DEG')).toBeCloseTo(0));
  test('tan(45) = 1',  () => expect(evaluate('tan(45)',  'DEG')).toBeCloseTo(1));
  test('asin(1) = 90', () => expect(evaluate('asin(1)',  'DEG')).toBeCloseTo(90));
});

describe('evaluate – constants', () => {
  test('π', () => expect(evaluate('π')).toBeCloseTo(Math.PI, 5));
  test('e', () => expect(evaluate('e')).toBeCloseTo(Math.E,  5));
});

describe('evaluate – error handling', () => {
  test('division by zero',   () => expect(() => evaluate('1÷0')).toThrow('Division by zero'));
  test('sqrt of negative',   () => expect(() => evaluate('sqrt(-1)')).toThrow('Domain error'));
  test('log of zero',        () => expect(() => evaluate('log(0)')).toThrow('Domain error'));
  test('negative factorial', () => expect(() => evaluate('fact(-1)')).toThrow('non-negative integer'));
  test('returns null for empty string', () => expect(evaluate('')).toBeNull());
});

describe('evaluate – floating-point precision', () => {
  test('0.1+0.2 ≈ 0.3', () => expect(evaluate('0.1+0.2')).toBeCloseTo(0.3));
});

// ─── Component tests ──────────────────────────────────────────────────────────

describe('App component', () => {
  test('renders the calculator', () => {
    render(<App />);
    expect(screen.getByRole('application', { name: /calculator/i })).toBeInTheDocument();
  });

  test('shows 0 when expression is empty', () => {
    render(<App />);
    expect(screen.getByTestId('expression')).toHaveTextContent('0');
  });

  test('appends digits when number buttons are clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByLabelText('2'));
    expect(screen.getByTestId('expression')).toHaveTextContent('42');
  });

  test('calculates 5 + 3 = 8', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('5'));
    fireEvent.click(screen.getByLabelText('Add'));
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByLabelText('Equals'));
    expect(screen.getByTestId('expression')).toHaveTextContent('8');
  });

  test('AC clears the expression', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByLabelText('All clear'));
    expect(screen.getByTestId('expression')).toHaveTextContent('0');
  });

  test('backspace removes last character', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('1'));
    fireEvent.click(screen.getByLabelText('2'));
    fireEvent.click(screen.getByLabelText('Backspace'));
    expect(screen.getByTestId('expression')).toHaveTextContent('1');
  });

  test('shows error for division by zero', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('5'));
    fireEvent.click(screen.getByLabelText('Divide'));
    fireEvent.click(screen.getByLabelText('0'));
    fireEvent.click(screen.getByLabelText('Equals'));
    expect(screen.getByRole('alert')).toHaveTextContent('Division by zero');
  });
});
