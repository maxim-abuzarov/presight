import type { User } from '../api/types.ts';
import { Avatar } from './Avatar.tsx';

const VISIBLE_HOBBIES = 2;

export function UserCard({ user }: { user: User }) {
  const shown = user.hobbies.slice(0, VISIBLE_HOBBIES);
  const overflow = user.hobbies.length - shown.length;

  return (
    <article className="card group flex gap-4 px-4 py-4 sm:gap-5 sm:px-5">
      <Avatar src={user.avatar} firstName={user.first_name} lastName={user.last_name} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold tracking-tight text-ink">
          {user.first_name} {user.last_name}
        </h3>

        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <p className="truncate text-sm text-muted">{user.nationality}</p>
          <span
            className="nums shrink-0 text-sm font-medium text-muted"
            title={`${user.age} years old`}
          >
            {user.age}
          </span>
        </div>

        <div className="mt-3 flex min-h-6 flex-wrap items-center gap-1.5">
          {shown.map((hobby) => (
            <span
              key={hobby}
              className="rounded-full border border-line bg-ground px-2.5 py-1 text-xs text-muted transition-colors duration-150 group-hover:border-line-strong"
            >
              {hobby}
            </span>
          ))}
          {overflow > 0 && (
            <span
              className="nums px-1 text-xs font-medium text-muted"
              title={user.hobbies.slice(VISIBLE_HOBBIES).join(', ')}
            >
              +{overflow}
            </span>
          )}
          {user.hobbies.length === 0 && (
            <span className="text-xs text-faint">No hobbies listed</span>
          )}
        </div>
      </div>
    </article>
  );
}
