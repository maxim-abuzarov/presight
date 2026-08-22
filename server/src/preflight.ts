export function assertSqliteSupport(): void {
  if (hasBuiltinSqlite()) return;

  const message = [
    '',
    `  This API needs Node 22.5 or newer for the built-in SQLite module.`,
    `  You are running Node ${process.version} (${process.execPath}).`,
    '',
    '  Fix it with one of:',
    '    nvm use            # picks up the version in .nvmrc',
    '    nvm install 24     # if you do not have it yet',
    '',
    '  A Homebrew or system Node earlier on your PATH is the usual cause.',
    '',
  ].join('\n');

  console.error(message);
  process.exit(1);
}

function hasBuiltinSqlite(): boolean {
  try {
    return Boolean(process.getBuiltinModule?.('node:sqlite'));
  } catch {
    return false;
  }
}
