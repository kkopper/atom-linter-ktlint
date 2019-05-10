'use babel';

import { it, beforeEach } from 'jasmine-fix';
import * as path from 'path';

const badPath = path.join(__dirname, 'files', 'bad.kt');
const goodPath = path.join(__dirname, 'files', 'good.kt');

const ktlint = require('../lib/linter-ktlint.js');

const { lint } = ktlint.provideLinter();

describe('The ktlint provider for Linter', () => {
  beforeEach(async () => {
    atom.workspace.destroyActivePaneItem();

    const activationPromise = atom.packages.activatePackage('linter-ktlint');

    await atom.workspace.open(goodPath);

    atom.packages.triggerDeferredActivationHooks();
    await activationPromise;
  });

  it('should be in the packages list', () => {
    expect(atom.packages.isPackageLoaded('linter-ktlint')).toBe(true);
  });

  it('should be an active package', () => {
    expect(atom.packages.isPackageActive('linter-ktlint')).toBe(true);
  });

  it('finds nothing wrong with a valid file', async () => {
    const editor = await atom.workspace.open(goodPath);
    const messages = await lint(editor);

    expect(messages.length).toBe(0);
  });

  describe('checks bad file and', () => {
    it('verifies that message', async () => {
      const editor = await atom.workspace.open(badPath);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].description).not.toBeDefined();
      expect(messages[0].excerpt).toMatch(/^Unnecessary "Unit" return type( \(no-unit-return\))?$/);
      expect(messages[0].location.file).toBe(badPath);
      expect(messages[0].location.position).toEqual([[0, 10], [0, 14]]);
    });
  });
});
