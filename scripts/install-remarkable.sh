#!/usr/bin/env bash
# Installs the Lazy GM session prep template on a reMarkable Paper Pro or
# Paper Pro Move over SSH. Requires developer mode (see README).
#
# Usage: scripts/install-remarkable.sh <host> <paper-pro|paper-pro-move> [de|en]
#   host: 10.11.99.1 over USB, or the Wi-Fi IP shown on the device
set -euo pipefail

HOST="${1:?host missing (e.g. 10.11.99.1)}"
DEVICE="${2:?device missing (paper-pro or paper-pro-move)}"
LANG_CODE="${3:-de}"

NAME="lazy-gm-session-prep-${LANG_CODE}"
SRC="output/remarkable/${DEVICE}"
DEST="/usr/share/remarkable/templates"

for ext in svg png; do
  [[ -f "${SRC}/${NAME}.${ext}" ]] || { echo "Missing ${SRC}/${NAME}.${ext}, run 'bun run render:remarkable' first" >&2; exit 1; }
done

# Reuse one SSH connection so the password is asked only once.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=/tmp/rm-ssh-%r@%h:%p" -o ControlPersist=120)
ssh_rm() { ssh "${SSH_OPTS[@]}" "root@${HOST}" "$@"; }

# One templates.json entry for this language, followed by a comma so it
# can be inserted as the first element of the "templates" array.
ENTRY=$(bun -e "
const all = await Bun.file('output/remarkable/templates-entry.json').json();
const e = all.find((t) => t.filename === '${NAME}');
console.log('    ' + JSON.stringify(e).replace(/[\u0080-￿]/g, (c) => '\\\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + ',');
")

ssh_rm "mount -o remount,rw / && cp -n ${DEST}/templates.json ${DEST}/templates.json.bak"
scp "${SSH_OPTS[@]}" "${SRC}/${NAME}.svg" "${SRC}/${NAME}.png" "root@${HOST}:${DEST}/"

if ssh_rm "grep -q '\"${NAME}\"' ${DEST}/templates.json"; then
  echo "templates.json already lists ${NAME}, leaving it unchanged."
else
  printf '%s\n' "${ENTRY}" | ssh_rm "cat > /tmp/rm-template-entry && \
    awk '{ print } /\"templates\"[[:space:]]*:[[:space:]]*\\[/ && !done { while ((getline l < \"/tmp/rm-template-entry\") > 0) print l; done = 1 }' \
      ${DEST}/templates.json > /tmp/templates.json.new && \
    grep -q '\"${NAME}\"' /tmp/templates.json.new && \
    cp /tmp/templates.json.new ${DEST}/templates.json && \
    rm /tmp/rm-template-entry /tmp/templates.json.new"
  echo "Added ${NAME} to templates.json (backup: templates.json.bak)."
fi

ssh_rm "systemctl restart xochitl"
echo "Done. The template is under 'Planners' in the template picker."
