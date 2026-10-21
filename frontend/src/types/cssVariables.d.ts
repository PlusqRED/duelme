import 'react';

// A style may set the CSS variables a component's classes read, such as `--pick` or `--i`.
declare module 'react' {
  interface CSSProperties {
    [variable: `--${string}`]: string | number;
  }
}
