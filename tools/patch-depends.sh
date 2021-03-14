#!/bin/bash
################################################################################
#
#  Copyright (C) 2020-2021 The Wolfpack
#  This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
#
#  SPDX-License-Identifier: Apache-2.0
#  See the file LICENSE.txt for more information.
#
################################################################################

#
# Packaging script for patching NPM dependencies in the post-installation step
#
# Requirements:
#
#   - patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

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
  patch_path="tools/depends/npm/${package}/${patch}"

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
    || :

  echo
}

#
# Patch pacakges
#
patch_package "@openzeppelin/contracts" "0001-Make-ERC1155.uri-public-2576.patch"
patch_package "@openzeppelin/contracts" "0002-Remove-excessive-role-granting-in-preset-constructor.patch"
