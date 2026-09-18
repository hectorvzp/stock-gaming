Markdown
# 🎮 Gear Control — Gamer Inventory Management System

**Gear Control** is a modern and responsive web application built to manage hardware inventory and gamer equipment. Designed for IT departments, it simplifies tracking available stock, monitoring assigned equipment in use, and managing pending operational tasks.

---

## 🚀 Key Features

### 📦 1. Main Stock Management
- **Item Registration & Editing:** Add and update products with input validation.
- **Custom Categorization:** Support for core categories (*PC, Monitor, Wacom, Webcam, Mouse, Keyboard*) and dedicated component subcategories (*Graphics Cards, M.2 SSDs, RAM, Power Supplies, etc.*).
- **Uniqueness Validation:** Automatic duplicate prevention for core hardware categories (*PC, Monitor, Wacom*).
- **Dynamic Category Filters:** Fast filtering via chips for main categories or specific component types.
- **Low Stock Alerts:** Automatic notifications (SweetAlert2) whenever a category drops to **3 or fewer items in stock**.

### 👤 2. Assigned Items Control (In Use)
- **Direct Assignment:** Log assignee names and dispatch dates.
- **Selective Retention Rule:**
  - Major equipment (*PC, Monitor, Wacom*) remains saved in the **Assigned** view history.
  - Peripherals and consumables (*Mouse, Keyboard, Others*) are automatically checked out and removed from the system to prevent database clutter.
- **Atlas Tracking & Notes:** Checkbox tracking for Atlas platform registration and inline observation notes with real-time saving.
- **Return to Stock:** One-click option to return assigned hardware back to available inventory.

### 📋 3. Task & Reminder List (To-Do)
- Quick creation and tracking of IT maintenance tasks.
- One-click completion via checkboxes with immediate removal from the active list.

### ⚙️ 4. Overview Dashboard & Stock Minimums
- At-a-glance category summary cards.
- Automatic usage-mirroring: Peripherals (*Mouse, Keyboard, Wacom, Webcam*) mirror active PC usage counts.
- Minimum stock threshold configuration paired with a dynamic donut chart rendered via Chart.js.

---

## 🛠️ Tech Stack

- **HTML5 & CSS3:** Modern layout using CSS variables, Flexbox, Grid, and a dark gamer theme.
- **JavaScript (ES6+):** Clean, modular architecture utilizing **ES Modules** (`import` / `export`).
- **Data Persistence:** Native `localStorage` with real-time multi-tab synchronization (`window.storage`).
- **Third-Party Libraries (CDNs):**
  - [Chart.js](https://www.chartjs.org/) — Dynamic doughnut charts.
  - [SweetAlert2](https://sweetalert2.github.io/) — Styled modals and alerts.

---

## 📁 File Structure

The project uses a modular architecture to maintain a clean separation of concerns:

```text
gear-control/
├── css/
│   └── styles.css           # Global styling and design tokens
├── js/
│   ├── constants.js        # Global constants, colors, and category arrays
│   ├── storage.js          # LocalStorage read/write handlers
│   ├── state.js            # Application state & business logic rules
│   ├── ui.js               # DOM rendering, tables, and charts
│   └── app.js              # Application entry point (Event listeners & forms)
├── index.html              # Main Inventory & Dashboard view
├── atribuidos.html         # Assigned Hardware view
├── tarefas.html            # Reminders & Tasks view
└── README.md               # Documentation
💻 How to Run
Because this project uses ES6 Modules (type="module"), browser security policies require running it through a local development server rather than double-clicking the .html files directly.

Option 1: VS Code (Live Server)
Open the project folder in Visual Studio Code.

Install the Live Server extension.

Right-click index.html and select "Open with Live Server".

Option 2: Node.js / npx
Run the following command in your project directory:

Bash
npx serve .
Open the local URL provided in your terminal (e.g., http://localhost:3000).

📄 License
Developed for internal hardware management and educational purposes. Open for customization and improvements.
