# Security Policy

The Poké Deck Revolution team takes the security and safety of our project seriously.

---

## 🛡️ Supported Versions

Because Poké Deck Revolution is currently in an early development phase, security updates and patches are provided exclusively for the latest commit on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Other   | :x:                |

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in Poké Deck Revolution (such as an exploit leading to remote code execution, injection attacks, or credential exposure):

1. **Do NOT report security vulnerabilities via public GitHub issues.**
2. Please report the issue privately to the project maintainers via GitHub's private vulnerability reporting feature on the repository, or by contacting the lead maintainer directly.
3. Include detailed steps to reproduce the issue, along with proof-of-concept scripts or logs where applicable.
4. Maintainers will acknowledge receipt within 48 hours and work with you on a coordinated fix.

---

## 🔒 Credential & API Key Safety

- **Never Commit Secrets**: Do not commit API keys (such as Google Gemini API keys) or credentials into git.
- **Gitignore Protection**: All environment secrets must reside inside `.env`, which is strictly excluded from version control via `.gitignore`.
- If an API key is accidentally committed by a contributor in a pull request, the pull request will be immediately rejected and the author must revoke and rotate the compromised credential.
