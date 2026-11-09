# Import blocks for every resource this configuration manages.
#
# State is local and not committed. With these blocks, a fresh checkout can
# rebuild it: `tofu init -lockfile=readonly && tofu plan` shows each resource
# as "will be imported" with no other changes. They are no-ops when the
# resource is already in state.
#
# The IDs are Cloudflare zone, record and ruleset identifiers, not credentials.
# Add a block here whenever a resource is added.

import {
  to = cloudflare_dns_record.caa["com/iodef"]
  id = "1ded37abaa70b34acec80b748e9b20e0/1eb90fa4489d58c0ad3582044cdd2800"
}

import {
  to = cloudflare_dns_record.caa["com/issue/google"]
  id = "1ded37abaa70b34acec80b748e9b20e0/98c21a39812a81ea219178f5a69eb3b0"
}

import {
  to = cloudflare_dns_record.caa["com/issue/letsencrypt"]
  id = "1ded37abaa70b34acec80b748e9b20e0/30eec3a00add316f54ac866944ab808d"
}

import {
  to = cloudflare_dns_record.caa["com/issue/sslcom"]
  id = "1ded37abaa70b34acec80b748e9b20e0/c6feef9a517d430d90bd3f81773a6fcb"
}

import {
  to = cloudflare_dns_record.caa["com/issuewild/google"]
  id = "1ded37abaa70b34acec80b748e9b20e0/2fa3025eb301043516c013d0593a1dc4"
}

import {
  to = cloudflare_dns_record.caa["com/issuewild/letsencrypt"]
  id = "1ded37abaa70b34acec80b748e9b20e0/09e3582f29b8e7b33d82b66acc72f725"
}

import {
  to = cloudflare_dns_record.caa["com/issuewild/sslcom"]
  id = "1ded37abaa70b34acec80b748e9b20e0/10e2598a8d4e1d2db5ac8f63d2f632a5"
}

import {
  to = cloudflare_dns_record.caa["dev/iodef"]
  id = "633dc02478af5a465ae732e681ce08d5/77ec1b0f920640d23b63b1a66ea55f89"
}

import {
  to = cloudflare_dns_record.caa["dev/issue/google"]
  id = "633dc02478af5a465ae732e681ce08d5/10e866732ffe31bcd58e6d9b0a4be946"
}

import {
  to = cloudflare_dns_record.caa["dev/issue/letsencrypt"]
  id = "633dc02478af5a465ae732e681ce08d5/c105145f6ae81f9c1b5ec052eec51d21"
}

import {
  to = cloudflare_dns_record.caa["dev/issue/sslcom"]
  id = "633dc02478af5a465ae732e681ce08d5/2171cc7c660d2e531d241a7f01592153"
}

import {
  to = cloudflare_dns_record.caa["dev/issuewild/google"]
  id = "633dc02478af5a465ae732e681ce08d5/7f05477db45dc4503ee03a8c555df233"
}

import {
  to = cloudflare_dns_record.caa["dev/issuewild/letsencrypt"]
  id = "633dc02478af5a465ae732e681ce08d5/fa0efa7c6704e33e78e980061cd87d89"
}

import {
  to = cloudflare_dns_record.caa["dev/issuewild/sslcom"]
  id = "633dc02478af5a465ae732e681ce08d5/e23af47c35ce4e5f80c3133a7b2f116d"
}

import {
  to = cloudflare_dns_record.com_www
  id = "1ded37abaa70b34acec80b748e9b20e0/fc85795f889c7d82b3ca1ee2efbb8efc"
}

import {
  to = cloudflare_dns_record.dev_apex_a
  id = "633dc02478af5a465ae732e681ce08d5/fc1357e4e432f9f1dfe794af820158c4"
}

import {
  to = cloudflare_dns_record.dev_apex_aaaa
  id = "633dc02478af5a465ae732e681ce08d5/c8ac250e0ad1bb79f9e57e7754af0b61"
}

import {
  to = cloudflare_dns_record.dev_dkim_wildcard
  id = "633dc02478af5a465ae732e681ce08d5/31138453164d4ff701485857542e7354"
}

import {
  to = cloudflare_dns_record.dev_dmarc
  id = "633dc02478af5a465ae732e681ce08d5/fc639b12b64e19dda9c21c4923f540c8"
}

import {
  to = cloudflare_dns_record.dev_null_mx
  id = "633dc02478af5a465ae732e681ce08d5/51902a295a2e8ac101f94a0e156462bd"
}

import {
  to = cloudflare_dns_record.dev_spf
  id = "633dc02478af5a465ae732e681ce08d5/4857d595396df362841cbacbfa90e8a2"
}

import {
  to = cloudflare_dns_record.dev_www
  id = "633dc02478af5a465ae732e681ce08d5/6d6421afdc9ce397e938c7900d34c11a"
}

import {
  to = cloudflare_ruleset.com_redirects
  id = "zones/1ded37abaa70b34acec80b748e9b20e0/87af13b55cd2448191ce82c2cc0c2c19"
}

import {
  to = cloudflare_ruleset.dev_redirects
  id = "zones/633dc02478af5a465ae732e681ce08d5/eaf336a907a0444cb4944b754e73abc0"
}

import {
  to = cloudflare_zone_setting.this["com/always_use_https"]
  id = "1ded37abaa70b34acec80b748e9b20e0/always_use_https"
}

import {
  to = cloudflare_zone_setting.this["com/automatic_https_rewrites"]
  id = "1ded37abaa70b34acec80b748e9b20e0/automatic_https_rewrites"
}

import {
  to = cloudflare_zone_setting.this["com/email_obfuscation"]
  id = "1ded37abaa70b34acec80b748e9b20e0/email_obfuscation"
}

import {
  to = cloudflare_zone_setting.this["com/min_tls_version"]
  id = "1ded37abaa70b34acec80b748e9b20e0/min_tls_version"
}

import {
  to = cloudflare_zone_setting.this["com/rocket_loader"]
  id = "1ded37abaa70b34acec80b748e9b20e0/rocket_loader"
}

import {
  to = cloudflare_zone_setting.this["com/ssl"]
  id = "1ded37abaa70b34acec80b748e9b20e0/ssl"
}

import {
  to = cloudflare_zone_setting.this["com/tls_1_3"]
  id = "1ded37abaa70b34acec80b748e9b20e0/tls_1_3"
}

import {
  to = cloudflare_zone_setting.this["dev/always_use_https"]
  id = "633dc02478af5a465ae732e681ce08d5/always_use_https"
}

import {
  to = cloudflare_zone_setting.this["dev/automatic_https_rewrites"]
  id = "633dc02478af5a465ae732e681ce08d5/automatic_https_rewrites"
}

import {
  to = cloudflare_zone_setting.this["dev/email_obfuscation"]
  id = "633dc02478af5a465ae732e681ce08d5/email_obfuscation"
}

import {
  to = cloudflare_zone_setting.this["dev/min_tls_version"]
  id = "633dc02478af5a465ae732e681ce08d5/min_tls_version"
}

import {
  to = cloudflare_zone_setting.this["dev/rocket_loader"]
  id = "633dc02478af5a465ae732e681ce08d5/rocket_loader"
}

import {
  to = cloudflare_zone_setting.this["dev/ssl"]
  id = "633dc02478af5a465ae732e681ce08d5/ssl"
}

import {
  to = cloudflare_zone_setting.this["dev/tls_1_3"]
  id = "633dc02478af5a465ae732e681ce08d5/tls_1_3"
}

# Mail records that existed before OpenTofu managed the zone.

import {
  to = cloudflare_dns_record.com_mx["us1"]
  id = "1ded37abaa70b34acec80b748e9b20e0/5e1c50ac5fed40a6bee2bcc39da1dbe7"
}

import {
  to = cloudflare_dns_record.com_mx["us2"]
  id = "1ded37abaa70b34acec80b748e9b20e0/7319de6f45af7d445f2ca56f82cfc5b8"
}

import {
  to = cloudflare_dns_record.com_spf
  id = "1ded37abaa70b34acec80b748e9b20e0/43dee3669205a422ca56a0980eadf4e0"
}

import {
  to = cloudflare_dns_record.com_dkim["fm1"]
  id = "1ded37abaa70b34acec80b748e9b20e0/463294d9a2236b6a5c41227cbfc5365a"
}

import {
  to = cloudflare_dns_record.com_dkim["fm2"]
  id = "1ded37abaa70b34acec80b748e9b20e0/72504d1e14cebf3ae42698215170f594"
}

import {
  to = cloudflare_dns_record.com_dkim["fm3"]
  id = "1ded37abaa70b34acec80b748e9b20e0/78b6378c94e4ad0b27a7b138c1646db0"
}
