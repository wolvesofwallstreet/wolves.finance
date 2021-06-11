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
# Unswap core contracts
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

UNISWAP_V2_CORE_REPO_NAME="uniswap-v2-core"
UNISWAP_V2_CORE_VERSION="4dd59067c76dea4a0e8e4bfdda41877a6b16dedc"
UNISWAP_V2_CORE_REMOTE_REPO="https://github.com/Uniswap/${UNISWAP_V2_CORE_REPO_NAME}.git"

#
# Environment paths
#

# Checkout directory
REPO_DIR_UNISWAP_V2_CORE="${REPO_DIR}/${UNISWAP_V2_CORE_REPO_NAME}"

# Install directory
INSTALL_DIR_UNISWAP_V2_CORE="${INSTALL_DIR}/${UNISWAP_V2_CORE_REPO_NAME}"

#
# Checkout
#

function checkout_uniswap_v2_core() {
  echo "Checking out uniswap-v2-core"

  if [ ! -d "${REPO_DIR_UNISWAP_V2_CORE}" ]; then
    git clone "${UNISWAP_V2_CORE_REMOTE_REPO}" "${REPO_DIR_UNISWAP_V2_CORE}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V2_CORE}"
    git fetch --all
    git reset --hard "${UNISWAP_V2_CORE_VERSION}"
  )
}

#
# Build
#

function build_uniswap_v2_core() {
  : # No build step
}

#
# Install
#

function install_uniswap_v2_core() {
  echo "Installing uniswap-v2-core"

  rm -rf "${INSTALL_DIR_UNISWAP_V2_CORE}"
  cp -r "${REPO_DIR_UNISWAP_V2_CORE}/contracts" "${INSTALL_DIR_UNISWAP_V2_CORE}"

  # ...but don't include test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V2_CORE}/test"
}
