export const HELP_TEXT = `open-in-vscode — open a folder in VS Code

Usage:
  open-in-vscode --path <path|alias> [--reuse-window <yes|no>]
  open-in-vscode help

Options:
  --path <value>              Folder path or configured alias (required)
  --reuse-window <yes|no>     Reuse an existing VS Code window if possible
                              (default: yes). Use "no" to force a new window.

Aliases are read from ~/.tfscripts/open-in-vscode/settings.json, for example:

  {
    "path-configs": [
      { "path": "/tmp/demo", "alias": "demo" },
      { "path": "~/repos/app", "alias": "app" }
    ]
  }

When --path matches an alias, that configured path is used. Otherwise the
value is treated as a filesystem path (~ is expanded).

Examples:
  open-in-vscode --path demo
  open-in-vscode --path /tmp/demo --reuse-window no
  open-in-vscode --path ~/repos/tfscripts --reuse-window yes
  open-in-vscode help
`;
