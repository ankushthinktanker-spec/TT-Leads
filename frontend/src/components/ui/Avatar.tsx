import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
    /** Image URL — falls back to initials when absent or broken */
    src?: string | null;
    /** Full name — used for initials and aria-label */
    name?: string;
    size?: AvatarSize;
    className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_CLASSES: Record<AvatarSize, string> = {
    xs: 'h-6 w-6 text-[9px]',
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
};

/** 8 warm, brand-matched palette entries — deterministic from name hash */
const PALETTE = [
    'bg-brand-100 text-brand-800',
    'bg-blue-100 text-blue-800',
    'bg-violet-100 text-violet-800',
    'bg-emerald-100 text-emerald-800',
    'bg-rose-100 text-rose-800',
    'bg-cyan-100 text-cyan-800',
    'bg-orange-100 text-orange-800',
    'bg-indigo-100 text-indigo-800',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string): string {
    if (!name?.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function nameToColor(name?: string): string {
    if (!name) return PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

/**
 * Single user avatar. Shows image if `src` is provided; falls back to
 * two-letter initials with a deterministic colour derived from `name`.
 *
 * @example
 * <Avatar name="Ankush Sharma" size="md" />
 * <Avatar src={user.avatar} name={user.firstName} size="sm" />
 */
const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
    ({ src, name, size = 'md', className }, ref) => {
        const initials = getInitials(name);
        const colorClass = nameToColor(name);

        return (
            <span
                ref={ref}
                title={name}
                aria-label={name ?? 'User avatar'}
                className={cn(
                    'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-2 ring-white',
                    SIZE_CLASSES[size],
                    !src && colorClass,
                    className
                )}
            >
                {src ? (
                    <img
                        src={src}
                        alt={name ?? 'Avatar'}
                        draggable={false}
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => {
                            // Hide broken image — initials show through the bg
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    initials
                )}
            </span>
        );
    }
);

Avatar.displayName = 'Avatar';
export default Avatar;

// ---------------------------------------------------------------------------
// AvatarGroup
// ---------------------------------------------------------------------------

export interface AvatarGroupProps {
    users: Array<{ name?: string; src?: string | null }>;
    /** Max avatars shown before overflow badge */
    max?: number;
    size?: AvatarSize;
    className?: string;
}

/**
 * Stacked row of avatars with an overflow badge.
 *
 * @example
 * <AvatarGroup users={lead.team} max={4} size="sm" />
 */
export const AvatarGroup = ({ users, max = 4, size = 'sm', className }: AvatarGroupProps) => {
    const visible = users.slice(0, max);
    const overflow = users.length - visible.length;

    if (!users.length) return null;

    return (
        <div className={cn('flex items-center', className)} aria-label={`${users.length} members`}>
            {visible.map((user, i) => (
                <Avatar
                    key={i}
                    src={user.src}
                    name={user.name}
                    size={size}
                    className="-ml-2 shadow-sm first:ml-0"
                />
            ))}
            {overflow > 0 && (
                <span
                    aria-label={`${overflow} more`}
                    className={cn(
                        '-ml-2 inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white',
                        SIZE_CLASSES[size],
                        'text-[9px]'
                    )}
                >
                    +{overflow}
                </span>
            )}
        </div>
    );
};
