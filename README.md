# Task Widget

A desktop widget for Windows that sits on your wallpaper and answers one question at a glance: **what should I do now?**

Task Widget shows a live clock, the single most important task to work on next, and the few tasks after it. A Kanban-style board (Backlog, In progress, Completed) is one click away for managing everything else. It starts with Windows, stays behind your other windows, and keeps its data in a local file.

Built with Electron, React, TypeScript and Tailwind CSS.

## Download

**[⬇ Download Task Widget for Windows](https://github.com/Mujadid13/task-widget/releases/latest/download/task-widget-setup.exe)**

No technical setup needed. You don't need to install anything else first.

1. Click the link above to download `task-widget-setup.exe`.
2. Open the downloaded file. Task Widget installs and opens in a few seconds.
3. That's it. The widget appears in the top-right corner of your screen and starts automatically whenever you turn on your PC.

**If Windows shows "Windows protected your PC":** click **More info**, then **Run anyway**. Windows shows this for apps from independent developers that haven't bought a code-signing certificate. It doesn't mean the app is harmful.

**To uninstall:** open **Settings → Apps → Installed apps**, find **Task Widget**, and choose **Uninstall**.

Older versions and release notes are on the [Releases page](https://github.com/Mujadid13/task-widget/releases).

## Features

- **"Do this now" card.** The highest-ranked open task, with its priority, category and due time, plus a one-click **Done** button.
- **Up next.** The three tasks that follow, so the next step is always visible.
- **Board view.** Backlog, In progress and Completed columns. Drag tasks between columns to change their status.
- **Full task editing.** Title, optional due date and time, priority (P1–P3), category and status. Add, edit and delete from anywhere a task appears.
- **Custom categories.** Work, Uni and Personal are built in. Choose **Custom…** to type your own; it then appears in the list for reuse.
- **Desktop widget behaviour.** Frameless and transparent, no taskbar button, and it never steals focus. The window resizes to fit the card, so the empty space around it doesn't block clicks on the desktop.
- **Movable.** Drag the clock to place the widget anywhere. Its position is remembered across restarts, and it can be locked from the tray.
- **Resizable.** Drag any corner to scale the whole widget, text included, from 60% to 200%. The opposite corner stays in place, and the size is remembered.
- **Your color.** Choose one of eight accent colors (turquoise by default) or pick any custom color. Text and buttons adjust automatically to stay readable.
- **Starts with Windows.** The installed app turns auto-start on the first time it runs. It can be toggled from the tray.
- **Reliable local storage.** Changes are saved immediately with atomic writes. A damaged data file is backed up rather than overwritten, and the app still opens.
- **Responsive layout.** The card, board and forms adapt to the space available.

## Requirements

- Windows 10 or 11
- Node.js 24 or later (needed to run the test suite)
- npm

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts the app with hot reload. On first launch the widget appears in the top-right corner of the primary display. Development runs do not register for auto-start; install the app for that.

## Installing

Build a Windows installer:

```bash
npm run build:win
```

The installer is written to `dist/task-widget-setup.exe`. It installs for the current user, with no administrator rights required. On its first run the installed app registers itself to start at login, and the project folder is no longer needed.

The installed app and `npm run dev` share the same data folder, so both see the same tasks. Only one can run at a time.

## Usage

| Action                    | How                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Complete the current task | Click **Done** on the "Do this now" card                                                                      |
| Add a task                | Click **+ Add task**, fill in the form, then click **Add task**                                               |
| Add a due date            | In the form, click **+ Add due date**; click **Remove** to clear it                                           |
| Edit or delete a task     | Hover over the task and use the pencil or bin icon                                                            |
| Change a task's status    | Open the board and drag the task to another column, or edit it                                                |
| Move the widget           | Drag the clock at the top of the card                                                                         |
| Resize the widget         | Drag any corner outward to enlarge or inward to shrink, or focus the bottom-right grip and use the arrow keys |
| Change the color          | Click **Color** at the bottom of the card and pick a swatch, or **+** for a custom color                      |
| Show, hide, lock or quit  | Use the tray icon in the notification area                                                                    |

Keyboard: **Enter** saves a form and **Escape** cancels it.

### Tray menu

- **Show / Hide**: toggle the widget's visibility. Clicking the tray icon does the same.
- **Lock position**: prevent the widget from being moved.
- **Reset size**: return the widget to 100% scale.
- **Start with Windows**: turn auto-start on or off.
- **Quit**: close the app.

## How tasks are ranked

The "Do this now" card and the order of every list follow these rules (see `src/renderer/src/lib/rank.ts`):

1. In-progress tasks come before backlog tasks. Completed tasks are never suggested.
2. Earlier due dates come first, so overdue tasks lead. Tasks without a due date come last.
3. Ties go to the higher priority (P1 before P3), then to the older task.

## Data

All data stays on your machine, in `%APPDATA%\task-widget\`:

| File                             | Contents                                              |
| -------------------------------- | ----------------------------------------------------- |
| `tasks.json`                     | Your tasks                                            |
| `window-state.json`              | Widget position, size and lock setting                |
| `tasks.json.corrupt-<timestamp>` | Backup created only if `tasks.json` could not be read |

To recover from a corrupt file, fix the JSON in the backup and rename it back to `tasks.json` while the app is closed.

## Development

### Scripts

| Command                | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Run the app in development mode with hot reload      |
| `npm run build`        | Type-check and compile the app to `out/`             |
| `npm run build:win`    | Build the Windows installer into `dist/`             |
| `npm run build:unpack` | Build an unpacked app into `dist/` for quick testing |
| `npm test`             | Run the unit tests                                   |
| `npm run typecheck`    | Type-check the main, preload and renderer code       |
| `npm run lint`         | Lint with ESLint                                     |
| `npm run format`       | Format with Prettier                                 |

Changes reach the installed app only after you rebuild and reinstall it with `npm run build:win`. Quit the running widget from the tray before installing.

### Project structure

```
src/
  main/
    index.ts        Window, tray, auto-start, position and size memory, IPC
    storage.ts      TaskStore interface and JsonFileStore implementation
  preload/
    index.ts        Safe API exposed to the renderer (tasks, window fit and resize)
  renderer/src/
    App.tsx         Widget layout and task state
    types.ts        Task model, statuses and built-in categories
    components/     Board, TaskRow, TaskEditor, TaskMeta, ColorPicker, ResizeGrips
    lib/            Ranking, date and accent-color helpers
tests/              Unit tests for ranking, storage and colors
```

### Storage backends

Storage sits behind a small interface in `src/main/storage.ts`:

```ts
interface TaskStore {
  load(): Promise<Task[]>
  save(tasks: Task[]): Promise<void>
}
```

To use another backend, such as SQLite or a sync service, implement `TaskStore` and swap it in where `JsonFileStore` is created in `src/main/index.ts`.

### Tests

The tests use Node's built-in test runner, with no extra dependencies. They cover the ranking rules and the storage layer: first run, save and reload, corrupt files, partially invalid files, and concurrent saves.

```bash
npm test
```

## Known limitations

- **Show desktop (Win+D)** hides the widget. Attaching it to the desktop layer so it survives Win+D is planned.
- When launched manually, the widget starts above open windows until another window is focused.
- Due dates require both a date and a time.
- Windows is the only supported platform. The macOS and Linux build scripts from the project template are untested.

## Roadmap

- Global hotkey for quick-add
- Attach to the desktop layer so the widget survives Win+D
- Optional time-of-day mode that favours work and uni tasks during the day and personal tasks in the evening
- Optional integrations, such as Todoist or Google Calendar
