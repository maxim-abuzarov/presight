import { useState } from 'react';

interface AvatarProps {
  src: string;
  firstName: string;
  lastName: string;
}

export function Avatar({ src, firstName, lastName }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-full bg-sunk shadow-[0_0_0_1px_var(--color-line),0_2px_10px_-4px_rgb(0_0_0/0.55)] transition-shadow duration-200 group-hover:shadow-[0_0_0_1px_var(--color-accent),0_3px_14px_-4px_rgb(0_0_0/0.6)] sm:size-14">
      {failed ? (
        <div className="flex size-full items-center justify-center text-sm font-semibold text-muted">
          {initials}
        </div>
      ) : (
        <img
          src={src}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
