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
# Yearn protocol
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

YEARN_REPO_NAME="yearn-protocol"
YEARN_VERSION="7b7d4042f87d6e854b00de9228c01f6f587cf0c0"
YEARN_REMOTE_REPO="https://github.com/yearn/${YEARN_REPO_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_YEARN="${DEPENDS_DIR}/chain/${YEARN_REPO_NAME}"

# Checkout directory
REPO_DIR_YEARN="${REPO_DIR}/${YEARN_REPO_NAME}"

# Install directory
INSTALL_DIR_YEARN="${INSTALL_DIR}/${YEARN_REPO_NAME}"

#
# Checkout
#

function checkout_yearn() {
  echo "Checking out Yearn"

  if [ ! -d "${REPO_DIR_YEARN}" ]; then
    git clone "${YEARN_REMOTE_REPO}" "${REPO_DIR_YEARN}"
  fi

  (
    cd "${REPO_DIR_YEARN}"
    git fetch --all
    git reset --hard "${YEARN_VERSION}"
  )
}

#
# Build
#

function build_yearn() {
  echo "Patching Yearn"

  # Patch package
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0001-Delegate-OpenZeppelin-versioning-to-dependency-manag.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0002-Convert-to-OpenZeppelin-3.0.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0003-Move-interfaces-to-Solidity-0.6.12.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0004-Move-contracts-to-Solidity-0.6.12.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0005-feat-Add-supplyRatePerBlock-to-Compound-interface.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0006-Rename-Controller-to-YearnController.patch"
  patch -p1 --directory="${REPO_DIR_YEARN}" < \
    "${DEPENDS_DIR_YEARN}/0007-Use-construction-parameters-for-contract-roles.patch"
}

#
# Install
#

function install_yearn() {
  echo "Installing Yearn"

  rm -rf "${INSTALL_DIR_YEARN}"
  mkdir -p "${INSTALL_DIR_YEARN}"
  cp -r "${REPO_DIR_YEARN}/contracts" "${INSTALL_DIR_YEARN}/contracts"
  cp -r "${REPO_DIR_YEARN}/interfaces" "${INSTALL_DIR_YEARN}/interfaces"

  # ...but don't include test or exploit contracts
  rm -rf "${INSTALL_DIR_YEARN}/contracts/exploits"
  rm -rf "${INSTALL_DIR_YEARN}/contracts/test"
}
