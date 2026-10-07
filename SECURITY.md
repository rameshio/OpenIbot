# Security Policy

## Supported Versions

Currently, only the latest release of OpenIbot is actively supported for security updates.

## Reporting a Vulnerability

If you discover a security vulnerability in OpenIbot, please **do not** open a public issue.

Instead, please send an email to the repository owner or use GitHub's private vulnerability reporting feature (if enabled for this repository).

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any proposed fixes (optional)

You should receive a response within a reasonable timeframe. 

## Important Security Notes

- **API Keys**: OpenIbot encrypts API keys using your operating system's native secure storage (e.g., Windows Data Protection API via Electron safeStorage). Keys are kept on your local machine and are not sent anywhere except directly to the AI providers you select.
- **Docker Integration**: OpenIbot runs local workspaces inside Docker containers. These workspaces are connected to the host via specific volume mounts and ports. Please review your Docker security posture. Do not run untrusted code outside of the sandboxed containers.
- **Never Commit Secrets**: Make sure `.env` and other secret files are properly ignored and not committed to any branch.
