# Contributing to Poké Deck Revolution

Welcome! We are excited to collaborate with the community to build **Poké Deck Revolution**. Whether you are contributing bug fixes, new battle features, camera improvements, documentation, or creative ideas, your participation is welcome.

Please read these guidelines carefully to ensure a smooth contribution process.

---

## 🏛️ Project Governance & Maintainer Model

- **Community Participation**: Anyone is welcome to open an issue or submit a pull request.
- **Maintainer Authority**: The project is led by the **Founder & Lead Maintainer** (`@zaidan-contractor`) along with official maintainers.
- **Write Access**: Direct write access to repository branches is reserved for official maintainers. Contributors submit contributions via forks and pull requests.
- **Review Process**: All pull requests require review and approval by a maintainer before being merged into the `main` branch. Maintainers evaluate submissions for code quality, architectural consistency, security, and game balance.

---

## 💡 Ways to Contribute

We welcome a wide range of contributions beyond code:
1. **Testing & QA**: Test card scanning against different lighting, sleeve reflections, and counterfeit cards. Report edge cases.
2. **Bug Reports**: Document unexpected glitches or errors with reproducible steps using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
3. **Feature Proposals**: Propose balance tweaks, UI improvements, or new mechanics using our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
4. **Documentation**: Clarify setup guides, write tutorials, or improve technical documentation.
5. **Core Code**: Improve recognition heuristics, optimize canvas performance, or enhance battle state handling.

---

## 🛠️ Development & Coding Standards

To keep Poké Deck Revolution lightweight, fast, and accessible to developers of all skill levels, we adhere to these architectural principles:

- **Vanilla Frontend**: The client is built with Vanilla HTML5, CSS3, and ES6+ JavaScript. **Avoid adding heavy frontend frameworks** (React, Vue, Tailwind, Angular) unless an issue discussion specifically calls for an architectural migration.
- **Modular Game Logic**: Keep the battle engine (`public/js/battle.js`) decoupled from DOM manipulation (`public/js/app.js`). Game state should be calculable purely from state objects.
- **No Hardcoded Secrets**: Never commit API keys, personal credentials, or local environment configurations. All secrets must pass through environment variables (`.env`).
- **Safety First**: Do not add dependencies that bundle copyrighted Nintendo/Pokémon game ROMs or proprietary media files directly into Git history.

---

## 🔄 Pull Request Workflow

1. **Fork the Repository**: Create your personal fork on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
3. **Make Your Changes**: Write clean, commented, and readable code.
4. **Test Thoroughly**:
   - Verify the server starts cleanly (`npm start`).
   - Verify both desktop UI (`http://localhost:3000`) and mobile scanner (`http://<ip>:3000/scan.html`) work without JavaScript console errors.
   - Test battle state changes to ensure no infinite loops or NaN values occur.
5. **Commit with Clear Messages**:
   ```bash
   git commit -m "Fix(scanner): resolve suffix detection for VSTAR cards"
   ```
6. **Submit a Pull Request**:
   - Push your branch to your fork.
   - Open a PR against the `main` branch of the official repository.
   - Fill out all sections of the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## 📋 Code Review Criteria

When reviewing your PR, maintainers will check:
- Does it introduce breaking changes to existing scanner or battle workflows?
- Does it maintain clean separation of concerns?
- Does it avoid security risks (e.g. credential leakage, unescaped `innerHTML` injection)?
- Does it adhere to the educational, non-commercial spirit of the project?

Thank you for helping revolutionize physical Pokémon card battles!
