Markdown
# 🎮 Gear Control — Gamer Inventory Management System

**Gear Control** is a modern and responsive web application built to manage hardware inventory and gamer equipment. Designed for IT departments, it simplifies tracking available stock, monitoring assigned equipment in use, and managing pending operational tasks.

---

## 🚀 Key Features

### 📦 1. Main Stock Management
- **Item Registration & Editing:** Add and update products with input validation.
- **Custom Categorization:** Support for core categories (*PC, Monitor, Wacom, Webcam, Mouse, Keyboard*) and dedicated component subcategories (*Graphics Cards, M.2 SSDs, RAM, Power Supplies, etc.*).
- **Individual and Quantity-Based Stock:** PCs, Monitors, and Wacom devices are tracked individually. Other categories and components are grouped by type with adjustable quantities.
- **Uniqueness Validation:** Automatic duplicate prevention for core hardware categories (*PC, Monitor, Wacom*).
- **Dynamic Category Filters:** Fast filtering via chips for main categories or specific component types.
- **Optional Item Notes:** Add one note per item, reveal or edit it from stock, and edit it from the assigned view. Notes remain with the item when it is returned.
- **CSV Backup:** Export the inventory or import validated CSV rows. Imports only add new items; existing IDs and duplicate core equipment are skipped.
- **Low Stock Alerts:** Automatic notifications (SweetAlert2) whenever a category drops to **3 or fewer items in stock**.

### 👤 2. Assigned Items Control (In Use)
- **Direct Assignment:** Log assignee names and dispatch dates.
- **PC Accessory Kits:** Assigning a PC consumes one Mouse, Keyboard, and Webcam from grouped stock. Assignments are allowed when stock is insufficient; shortages are shown as negative balances. Returning a PC restores its kit.
- **Atlas Tracking:** Checkbox tracking for Atlas platform registration.
- **Save Feedback:** Item notes autosave after typing pauses or when leaving the field, with visible pending, saved, and error states.
- **Return to Stock:** One-click option to return assigned hardware back to available inventory.

### 📋 3. Task & Reminder List (To-Do)
- Quick creation and tracking of IT maintenance tasks.
- One-click completion via checkboxes with immediate removal from the active list.

### ⚙️ 4. Overview Dashboard & Stock Minimums
- At-a-glance category summary cards.
- Accessory usage mirrors assigned PCs for *Mouse, Keyboard, and Webcam*; *Wacom* devices remain individually tracked.
- Minimum stock threshold configuration paired with a dynamic donut chart rendered via Chart.js.

---

## 🛠️ Tech Stack

- **HTML5 & CSS3:** Modern layout using CSS variables, Flexbox, Grid, and a dark gamer theme.
- **JavaScript (ES6+):** Clean, modular architecture utilizing **ES Modules** (`import` / `export`).
- **Data Persistence:** Firebase Firestore with `localStorage` fallback.
- **Responsive Tables:** Inventory tables adapt to mobile screens while keeping all columns and actions available.
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
├── scripts/
│   ├── constants.js        # Global constants, colors, and category arrays
│   ├── storage.js          # Firestore and LocalStorage persistence
│   ├── state.js            # Application state and business rules
│   ├── ui.js               # DOM rendering, tables, and charts
│   ├── csv.js              # CSV import and export
│   └── app.js              # Application entry point and event listeners
├── index.html              # Main Inventory & Dashboard view
├── atribuidos.html         # Assigned Hardware view
├── tarefas.html            # Reminders & Tasks view
└── README.md               # Documentation
```

## 📥 CSV format

Use **Exportar CSV** to create a UTF-8 backup containing item fields. CSV imports require `nome` and `categoria`; exported files also include IDs, assignment state, Atlas status, notes, and grouped quantities. Import is additive: existing IDs and duplicate PC, Monitor, or Wacom names are skipped and never overwritten.

Negative grouped-stock balances indicate shortages.

Login and authenticated access controls are not enabled yet.

## 💻 How to Run
Because this project uses ES6 Modules (type="module"), browser security policies require running it through a local development server rather than double-clicking the .html files directly.

### Option 1: VS Code (Live Server)
Open the project folder in Visual Studio Code.

Install the Live Server extension.

Right-click index.html and select "Open with Live Server".

### Option 2: Node.js / npx
Run the following command in your project directory:

Bash
npx serve .
Open the local URL provided in your terminal (e.g., http://localhost:3000).

## 📄 License
Developed for internal hardware management and educational purposes. Open for customization and improvements.


## 🚀 New Features: Assigned Assets Module & Cloud Database

The **Assigned Assets** section (`atribuidos.html`) has been updated to deliver real-time management powered by **Cloud Firestore**, providing instant data persistence and dynamic filtering.

### 📋 Key Features

* **Combined Dynamic Filtering:**
  * **Keyword Search:** Instant, case-insensitive text search by user/responsible party or item name.
  * **Atlas Verification Status:** Toggle selector to filter items instantly by status (**OK** vs. **Pending**).
* **Live Metric Cards:**
  * Real-time counters at the top of the dashboard displaying **Total Assigned**, **Atlas OK**, and **Atlas Pending** counts.
* **Real-Time Cloud Database Integration (Firestore):**
  * Live snapshot listeners (`onSnapshot`) integrated within `storage.js` to propagate real-time database updates to all connected clients without page reloads.
* **Local Caching & Performance Optimization:**
  * Decoupled UI rendering logic in `ui.js` utilizing `DocumentFragment` updates to minimize direct DOM manipulations and eliminate redundant database queries.

---

## 🛠️ Modular JS Architecture

```text
├── atribuidos.html    # Section layout containing metrics cards, search bar, and table
└── js/
    ├── app.js         # Main application lifecycle orchestrator
    ├── storage.js     # Real-time Cloud Firestore listeners and data queries
    ├── ui.js          # Rendering pipelines, event listeners, and filtering logic
    ├── state.js       # Application state and local caching layer
    └── constants.js   # Project-wide collection keys and constants
