// A sum in a sentence ("(8 + 5 = ?)") reads as one piece: its spaces become no-break spaces, so a narrow screen moves
// the whole expression to the next line instead of breaking it after "(8".

/** A number or the blank to find. */
const OPERAND = String.raw`(?:\d+|\?)`;
/** Two or more operands joined by an operator or a comparison, spaces around them optional. */
const EXPRESSION = new RegExp(String.raw`${OPERAND}(?:[ \t]*[+\-−×÷:=<>][ \t]*${OPERAND})+`, 'g');
const NO_BREAK_SPACE = ' ';

/** The text with every arithmetic expression in it kept on one line. */
export function keepMathTogether(text: string): string {
  return text.replace(EXPRESSION, (expression) => expression.replace(/[ \t]+/g, NO_BREAK_SPACE));
}
