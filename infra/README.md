# Infrastructure (OpenTofu)

DNS records, zone settings and redirect rules for `codeecologist.com` and
`codeecologist.dev`, managed with OpenTofu and the `cloudflare/cloudflare`
provider. The spec these files must match is
[`docs/handoff/infra/dns-records.md`](../docs/handoff/infra/dns-records.md).

CI never applies this. Every change is planned, reviewed by Jeff, then
applied by hand.

## Versions

- OpenTofu `~> 1.13.0` (`versions.tf`)
- `cloudflare/cloudflare` pinned to an exact version, with hashes for
  `linux_amd64`, `darwin_arm64` and `windows_amd64` in `.terraform.lock.hcl`

## Usage

The API token comes from the `CLOUDFLARE_API_TOKEN` environment variable. Its
required permissions are listed in
[`docs/handoff/SECRETS.md`](../docs/handoff/SECRETS.md).

```bash
cd infra
tofu init -lockfile=readonly
tofu plan -out=plan.bin
tofu apply plan.bin   # only after Jeff approves the plan output
```

## Files

| File | Contents |
|---|---|
| `zones.tf` | Zone lookups by name |
| `settings.tf` | TLS and HTTPS settings; edge HTML rewriting off |
| `caa.tf` | CAA records, both zones |
| `dns_com.tf` | `codeecologist.com` web records |
| `dns_dev.tf` | `codeecologist.dev` placeholder and no-mail records |
| `redirects.tf` | `.dev` to `.com`, and `www` to apex |
| `snapshots/` | DNS exports taken before changes; the rollback reference |

## State

State is local (`infra/terraform.tfstate`) and gitignored. It holds resource
IDs but no secrets. Losing it is an inconvenience, not an outage: every
resource can be re-imported from the Cloudflare API.

## Not managed here

Done in the Cloudflare dashboard: domain registration, registrar lock,
auto-renew and DNSSEC. Pages secrets are set with `wrangler pages secret put`.

## Notes

- Zone settings cannot be destroyed. Removing a `cloudflare_zone_setting`
  from the configuration leaves the setting at its last value; to roll one
  back, apply the previous value.
- Once any CAA record exists, Cloudflare adds hidden CAA records for the CAs
  it uses. DNS answers can therefore list more CAs than `caa.tf` does.
