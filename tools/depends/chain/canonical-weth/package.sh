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
# Canonical W-ETH package. See:
#
#   https://blog.0xproject.com/canonical-weth-a9aa7d0279dd)
#
# The version used here is v1.4.0, released 2019-02-28.
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Parameters:
#
#   * REPO_DIR - Place to download the repo
#   * INSTALL_DIR - Place to install the contract files
#
# Dependencies:
#
#   * git
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

WETH_REPO_NAME="canonical-weth"
WETH_VERSION="0dd1ea3e295eef916d0c6223ec63141137d22d67"
WETH_REMOTE_REPO="https://github.com/gnosis/${WETH_REPO_NAME}.git"

#
# Environment paths
#

# Checkout directory
REPO_DIR_WETH="${REPO_DIR}/${WETH_REPO_NAME}"

# Install directory
INSTALL_DIR_WETH="${INSTALL_DIR}/${WETH_REPO_NAME}"

#
# Checkout
#

function checkout_canonical_weth() {
  echo "Checking out W-ETH"

  if [ ! -d "${REPO_DIR_WETH}" ]; then
    git clone "${WETH_REMOTE_REPO}" "${REPO_DIR_WETH}"
  fi

  (
    cd "${REPO_DIR_WETH}"
    git fetch --all
    git reset --hard "${WETH_VERSION}"
  )
}

#
# Build
#

function build_canonical_weth() {
  : # No build step
}

#
# Install
#

function install_canonical_weth() {
  echo "Installing W-ETH"

  rm -rf "${INSTALL_DIR_WETH}"
  cp -r "${REPO_DIR_WETH}/contracts" "${INSTALL_DIR_WETH}"
}
