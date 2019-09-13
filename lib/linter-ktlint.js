'use babel';

import { CompositeDisposable } from 'atom';

const helpers = require('atom-linter');
const os = require('os');
const path = require('path');

// const regex = /^(?<file>.+):(?<line>\d+):(?<col>\d+): (?<detail>.+)$/gm
const regex = /^(.+):(\d+):(\d+): (.+)$/gm;

export default {
  activate() {
    this.idleCallbacks = new Set();
    const depsCallbackId = window.requestIdleCallback(() => {
      this.idleCallbacks.delete(depsCallbackId);
      if (!atom.inSpecMode()) {
        require('atom-package-deps').install('linter-ktlint');
      }
    });
    this.idleCallbacks.add(depsCallbackId);

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe('linter-ktlint.executablePath', (value) => {
        this.execPath = value;
      }),
      atom.config.observe('linter-ktlint.experimental', (value) => {
        this.experimental = value;
      }),
      atom.config.observe('linter-ktlint.verbose', (value) => {
        this.verbose = value;
      }),
    );
  },

  deactivate() {
    this.idleCallbacks.forEach((callbackID) => window.cancelIdleCallback(callbackID));
    this.idleCallbacks.clear();
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'ktlint',
      scope: 'file',
      lintsOnChange: false,
      grammarScopes: ['source.kotlin'],
      lint: async (textEditor) => {
        if (!atom.workspace.isTextEditor(textEditor)) {
          return null;
        }

        const filePath = textEditor.getPath();
        if (!filePath) {
          return [];
        }

        const [projectPath] = atom.project.relativizePath(filePath);

        const parameters = [filePath];
        if (this.verbose) {
          parameters.push('--verbose');
        }
        if (this.experimental) {
          parameters.push('--experimental');
        }

        const execOpts = {
          cwd: projectPath !== null ? projectPath : path.dirname(filePath),
          ignoreExitCode: true,
          stream: 'stdout',
          throwOnStderr: false,
        };

        let executable = this.execPath;
        if (os.type() === 'Windows_NT') {
          // On Windows, we need to use `java -jar ...` to call `ktlint`.
          parameters.unshift(this.execPath);
          parameters.unshift('-jar');
          executable = 'java';
        }

        const output = await helpers.exec(executable, parameters, execOpts);
        if (!output) {
          return [];
        }

        const messages = [];
        let match = regex.exec(output);
        while (match) {
          const line = Number.parseInt(match[2], 10) - 1;
          const col = Number.parseInt(match[3], 10) - 1;
          messages.push({
            location: {
              file: match[1],
              position: helpers.generateRange(textEditor, line, col),
            },
            excerpt: match[4],
            severity: 'error',
          });
          match = regex.exec(output);
        }

        return messages;
      },
    };
  },
};
