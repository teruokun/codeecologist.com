# Security policy

This repository builds and deploys https://codeecologist.com, a static site.
There is no server code, no form and no user data.

## Reporting a vulnerability

Please report privately, using either:

- GitHub's private vulnerability reporting: the **Report a vulnerability**
  button under this repository's **Security** tab, or
- email to security@codeecologist.com (also listed in
  [`/.well-known/security.txt`](https://codeecologist.com/.well-known/security.txt)).

Please don't open a public issue for a vulnerability.

In scope: this repository's code, its GitHub Actions workflows, the
OpenTofu configuration in `infra/`, and what the site serves (content,
headers, the SBOM and the attestations).

## Verifying what the site serves

Every deploy publishes an SBOM and a signed provenance attestation covering
every file. See https://codeecologist.com/supply-chain for the commands.
