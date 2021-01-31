#!/bin/bash
################################################################################
#
#  Copyright (C) 2020 The Wolfpack
#  This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
#
#  SPDX-License-Identifier: Apache-2.0
#  See the file LICENSE.txt for more information.
#
################################################################################

#
# Packaging script for post-installation tasks
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Directory definitions
#

# Tooling directory
TOOL_DIR="tools"

# Depends directory
DEPENDS_DIR="${TOOL_DIR}/depends"

#
# Helper function
#
# Usage:
#
#   patch_package <package name> <patch name>
#
function patch_package() {
  package=$1
  patch=$2

  package_path="node_modules/${package}"
  patch_path="${DEPENDS_DIR}/npm/${package}/${patch}"

  # Can't discern between missing patch and already-applied patch
  if [ ! -f "${patch_path}" ]; then
    echo "Missing ${patch}!"
    exit 1
  fi

  echo "### Patching ${package_path}"

  patch \
    -p1 \
    --forward \
    --directory="${package_path}" \
    --reject-file="/dev/null" \
    --no-backup-if-mismatch \
    <"${patch_path}" \
    >/dev/null \
    || :

  echo
}

#
# Patch pacakges
#
patch_package "@ethersproject/providers" "0001-Work-around-bug-in-jsdom.patch"
