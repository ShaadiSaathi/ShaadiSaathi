#!/usr/bin/env bash
# Sync server-side env vars to Vercel Preview (staging branch) from local files.
# Usage: ./scripts/sync-staging-preview-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."

read_env() {
  local file="$1" key="$2"
  node -e "
const fs=require('fs');
const key=process.argv[1];
const txt=fs.readFileSync(process.argv[2],'utf8');
for (const line of txt.split('\n')) {
  const m=line.match(/^([^#=]+)=(.*)$/);
  if (!m||m[1].trim()!==key) continue;
  let v=m[2].trim();
  if ((v.startsWith('\"')&&v.endsWith('\"'))||(v.startsWith(\"'\")&&v.endsWith(\"'\"))) v=v.slice(1,-1);
  process.stdout.write(v);
  process.exit(0);
}
process.exit(1);
" "$key" "$file"
}

add_env() {
  local name="$1" value="$2"
  echo "Adding $name to Preview (staging)…"
  printf '%s' "$value" | npx vercel env add "$name" preview staging --force --yes --sensitive 2>&1
}

# Staging Firebase admin + Upstash from .env.local
for key in FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON UPSTASH_VECTOR_REST_URL UPSTASH_VECTOR_REST_TOKEN; do
  if val=$(read_env .env.local "$key" 2>/dev/null); then
    add_env "$key" "$val"
  else
    echo "SKIP $key (missing in .env.local)"
  fi
done

# Anthropic: prefer .env.local, fall back to production pull file
if val=$(read_env .env.local ANTHROPIC_API_KEY 2>/dev/null); then
  add_env ANTHROPIC_API_KEY "$val"
elif [[ -f .env.production.local ]] && val=$(read_env .env.production.local ANTHROPIC_API_KEY 2>/dev/null); then
  add_env ANTHROPIC_API_KEY "$val"
else
  echo "SKIP ANTHROPIC_API_KEY (add manually via vercel env add)"
fi

echo "Done. Redeploy staging branch to pick up new env vars."
