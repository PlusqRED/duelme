import type { SVGProps } from 'react';
import { iconPaths, type IconName, type IconShape } from '@/components/ui/iconPaths';
import { cn } from '@/lib/utils';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
}

/**
 * One of the design's icons, a 2-unit round stroke in the text colour, sized to the text around it.
 * Always decorative: the words next to it, or an `sr-only` label, say what it means.
 */
export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn('size-[1.25em] shrink-0', className)}
      {...props}
    >
      {iconPaths[name].map((shape, index) => (
        <IconPart key={index} shape={shape} />
      ))}
    </svg>
  );
}

interface IconPartProps {
  shape: IconShape;
}

function IconPart({ shape }: IconPartProps) {
  if ('d' in shape) {
    return shape.filled ? <path d={shape.d} fill="currentColor" stroke="none" /> : <path d={shape.d} />;
  }
  if ('r' in shape) {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
  }
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
}
