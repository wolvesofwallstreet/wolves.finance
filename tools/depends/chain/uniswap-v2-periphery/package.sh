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
#   * DEPENDS_DIR - Location of dependency package files
#   * REPO_DIR - Place to download the repo
#   * INSTALL_DIR - Place to install the contract files
#
# Dependencies:
#
#   * git
#   * patch
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

UNISWAP_V2_PERIPHERY_REPO_NAME="uniswap-v2-periphery"
UNISWAP_V2_PERIPHERY_VERSION="dda62473e2da448bc9cb8f4514dadda4aeede5f4"
UNISWAP_V2_PERIPHERY_REMOTE_REPO="https://github.com/Uniswap/${UNISWAP_V2_PERIPHERY_REPO_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_UNISWAP_V2_PERIPHERY="${DEPENDS_DIR}/chain/${UNISWAP_V2_PERIPHERY_REPO_NAME}"

# Checkout directory
REPO_DIR_UNISWAP_V2_PERIPHERY="${REPO_DIR}/${UNISWAP_V2_PERIPHERY_REPO_NAME}"

# Install directory
INSTALL_DIR_UNISWAP_V2_PERIPHERY="${INSTALL_DIR}/${UNISWAP_V2_PERIPHERY_REPO_NAME}"

#
# Checkout
#

function checkout_uniswap_v2_periphery() {
  echo "Checking out uniswap-v2-periphery"

  if [ ! -d "${REPO_DIR_UNISWAP_V2_PERIPHERY}" ]; then
    git clone "${UNISWAP_V2_PERIPHERY_REMOTE_REPO}" "${REPO_DIR_UNISWAP_V2_PERIPHERY}"
  fi

  (
    cd "${REPO_DIR_UNISWAP_V2_PERIPHERY}"
    git fetch --all
    git reset --hard "${UNISWAP_V2_PERIPHERY_VERSION}"
  )
}

#
# Build
#

function build_uniswap_v2_periphery() {
  # Patch package
  patch -p1 --directory="${REPO_DIR_UNISWAP_V2_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V2_PERIPHERY}/0001-Remove-optimization-requiring-byte-identical-bytecod.patch"
  patch -p1 --directory="${REPO_DIR_UNISWAP_V2_PERIPHERY}" < \
    "${DEPENDS_DIR_UNISWAP_V2_PERIPHERY}/0002-Delegate-import-locations-to-dependency-management.patch"
}

#
# Install
#

function install_uniswap_v2_periphery() {
  echo "Installing uniswap-v2-periphery"

  rm -rf "${INSTALL_DIR_UNISWAP_V2_PERIPHERY}"
  cp -r "${REPO_DIR_UNISWAP_V2_PERIPHERY}/contracts" "${INSTALL_DIR_UNISWAP_V2_PERIPHERY}"

  # ...but don't include examples or test contracts
  rm -rf "${INSTALL_DIR_UNISWAP_V2_PERIPHERY}/examples"
  rm -rf "${INSTALL_DIR_UNISWAP_V2_PERIPHERY}/test"
}
