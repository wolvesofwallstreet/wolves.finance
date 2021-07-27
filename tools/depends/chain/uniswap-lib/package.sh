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
# uniswap-lib: Solidity libraries that are shared across Uniswap contracts
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

UNISWAP_LIB_REPO_NAME="uniswap-lib"
UNISWAP_LIB_VERSION="c01640b0f0f1d8a85cba8de378cc48469fcfd9a6"
UNISWAP_LIB_REMOTE_REPO="https://github.com/Uniswap/${UNISWAP_LIB_REPO_NAME}.git"

#
# Environment paths
#

# Checkout directory
REPO_DIR_UNISWAP_LIB="${REPO_DIR}/${UNISWAP_LIB_REPO_NAME}"

# Install directory
INSTALL_DIR_UNISWAP_LIB="${INSTALL_DIR}/${UNISWAP_LIB_REPO_NAME}"

#
# Checkout
#

function checkout_uniswap_lib() {
  echo "Checking out uniswap-lib"

  if [ ! -d "${REPO_DIR_UNISWAP_LIB}" ]; then
    git clone "${UNISWAP_LIB_REMOTE_REPO}" "${REPO_DIR_UNISWAP_LIB}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_LIB}"
    git fetch --all
    git reset --hard "${UNISWAP_LIB_VERSION}"
  )
}

#
# Build
#

function build_uniswap_lib() {
  : # No build step
}

#
# Install
#

function install_uniswap_lib() {
  echo "Installing uniswap-lib"

  rm -rf "${INSTALL_DIR_UNISWAP_LIB}"
  cp -r "${REPO_DIR_UNISWAP_LIB}/contracts" "${INSTALL_DIR_UNISWAP_LIB}"

  # ...but don't include test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_LIB}/test"
}
