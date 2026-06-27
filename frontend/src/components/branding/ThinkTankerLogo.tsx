import { cn } from '../../lib/utils';

interface ThinkTankerLogoProps {
    className?: string;
    alt?: string;
}

const ThinkTankerLogo = ({ className, alt = 'ThinkTanker logo' }: ThinkTankerLogoProps) => (
    <img
        src="/branding/thinktanker-logo-primary.svg"
        alt={alt}
        className={cn('h-auto w-auto object-contain', className)}
        loading="eager"
        decoding="async"
    />
);

export default ThinkTankerLogo;
