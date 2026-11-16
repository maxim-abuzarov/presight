import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Registered by hand rather than via '@testing-library/jest-dom/vitest' because npm hoists
// jest-dom to the workspace root, where it cannot resolve the client's own vitest.
expect.extend(matchers);

afterEach(() => cleanup());
