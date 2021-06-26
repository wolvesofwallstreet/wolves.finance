#!/bin/bash
################################################################################
#
#  Copyright (C) 2021 The Wolfpack
#  This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
#
#  SPDX-License-Identifier: Apache-2.0
#  See the file LICENSE.txt for more information.
#
################################################################################

#
# Convex platform
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files
#   * REPO_DIR - Place to download the repo
#   * INSTALL_DIR - Place to install the contract files
#
# Dependencies:
#
#   * git
#   * patch # TODO
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

CONVEX_REPO_NAME="platform"
CONVEX_VERSION="2c2a92cd29e4b9177de5f96c141b982cea4b4200"
CONVEX_REMOTE_REPO="https://github.com/convex-eth/${CONVEX_REPO_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_CONVEX="${DEPENDS_DIR}/chain/convex-platform"

# Checkout directory
REPO_DIR_CONVEX="${REPO_DIR}/convex-platform"

# Install directory
INSTALL_DIR_CONVEX="${INSTALL_DIR}/convex-platform"

#
# Checkout
#

function checkout_convex() {
  echo "Checking out Convex"

  if [ ! -d "${REPO_DIR_CONVEX}" ]; then
    git clone "${CONVEX_REMOTE_REPO}" "${REPO_DIR_CONVEX}"
  fi

  (
    cd "${REPO_DIR_CONVEX}"
    git fetch --all
    git reset --hard "${CONVEX_VERSION}"
  )
}

#
# Build
#

function build_convex() {
  echo "Patching Convex"

  # Patch package
  patch -p1 --directory="${REPO_DIR_CONVEX}" < \
    "${DEPENDS_DIR_CONVEX}/0001-Avoid-name-conflicts-with-Booster-contract.patch"
}

#
# Install
#

function install_convex() {
  echo "Installing Convex"

  rm -rf "${INSTALL_DIR_CONVEX}"
  cp -r "${REPO_DIR_CONVEX}/contracts/contracts" "${INSTALL_DIR_CONVEX}"
}
