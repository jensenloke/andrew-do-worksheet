#!/usr/bin/env -S npx tsx
/** CLI entry point: npx tsx src/cli.tsx */

import React from 'react';
import { render } from 'ink';
import { App } from './ui/App.js';

render(<App />);
