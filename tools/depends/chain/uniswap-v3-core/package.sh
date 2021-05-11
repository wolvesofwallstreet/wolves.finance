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
# Unswap V3 core contracts
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

UNISWAP_V3_CORE_REPO_NAME="uniswap-v3-core"
UNISWAP_V3_CORE_VERSION="b2c5555d696428c40c4b236069b3528b2317f3c1"
UNISWAP_V3_CORE_REMOTE_REPO="https://github.com/Uniswap/${UNISWAP_V3_CORE_REPO_NAME}.git"

#
# Environment paths
#

# Checkout directory
REPO_DIR_UNISWAP_V3_CORE="${REPO_DIR}/${UNISWAP_V3_CORE_REPO_NAME}"

# Install directory
INSTALL_DIR_UNISWAP_V3_CORE="${INSTALL_DIR}/${UNISWAP_V3_CORE_REPO_NAME}"

#
# Checkout
#

function checkout_uniswap_v3_core() {
  echo "Checking out uniswap-v3-core"

  if [ ! -d "${REPO_DIR_UNISWAP_V3_CORE}" ]; then
    git clone "${UNISWAP_V3_CORE_REMOTE_REPO}" "${REPO_DIR_UNISWAP_V3_CORE}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V3_CORE}"
    git fetch --all
    git reset --hard "${UNISWAP_V3_CORE_VERSION}"
  )
}

#
# Build
#

function build_uniswap_v3_core() {
  : # No build step
}

#
# Install
#

function install_uniswap_v3_core() {
  echo "Installing uniswap-v3-core"

  rm -rf "${INSTALL_DIR_UNISWAP_V3_CORE}"
  cp -r "${REPO_DIR_UNISWAP_V3_CORE}/contracts" "${INSTALL_DIR_UNISWAP_V3_CORE}"

  # ...but don't include test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V3_CORE}/test"
}
