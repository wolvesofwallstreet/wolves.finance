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
# Build steps for contracts used in Curve.fi exchange pools
#
# Parameters:
#
#   * DEPENDS_DIR - Location of dependency package files
#   * REPO_DIR - Place to download the repo
#   * BYTECODE_DIR - Place to install the bytecode files
#
# Dependencies:
#
#   * patch
#   * python3
#   * python3-venv
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

CURVE_REPO_NAME="curve-contract"
CURVE_VERSION="b0bbf77f8f93c9c5f4e415bce9cd71f0cdee960e"
CURVE_REMOTE_REPO="https://github.com/curvefi/${CURVE_REPO_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_CURVE="${DEPENDS_DIR}/chain/curve-contracts"

# Checkout directory
REPO_DIR_CURVE="${REPO_DIR}/curve-contracts"

# Install directory
BYTECODE_DIR_CURVE="${BYTECODE_DIR}/curve-contracts"

#
# Checkout
#

function checkout_curve() {
  echo "Checking out curve"

  if [ ! -d "${REPO_DIR_CURVE}" ]; then
    git clone "${CURVE_REMOTE_REPO}" "${REPO_DIR_CURVE}"
  fi

  (
    cd "${REPO_DIR_CURVE}"
    git fetch --all
    git reset --hard "${CURVE_VERSION}"
  )
}

#
# Build
#

function build_curve() {
  echo "Patching curve"

  patch -p1 --directory="${REPO_DIR_CURVE}" < \
    "${DEPENDS_DIR_CURVE}/0001-Fix-underflow.patch"
  patch -p1 --directory="${REPO_DIR_CURVE}" < \
    "${DEPENDS_DIR_CURVE}/0002-Pass-minter-and-initial-holder-via-construction-para.patch"

  # Remove unused pools, tokens and test contracts to save space (~170 MB of
  # bytecode) and several minutes of compile time
  rm -rf "${REPO_DIR_CURVE}/contracts/pools"/[^y]*
  rm -rf "${REPO_DIR_CURVE}/contracts/pool-templates"
  rm -rf "${REPO_DIR_CURVE}/contracts/testing"
  rm -rf "${REPO_DIR_CURVE}/contracts/tokens"/CurveTokenV[^1]*

  echo "Building curve"

  cd "${REPO_DIR_CURVE}"
  python3 -m venv .
  set +o nounset # Bug in python3-venv that ships with Ubuntu 18.04
  source bin/activate
  pip3 install eth-brownie
  brownie compile
  deactivate
  set -o nounset
}

#
# Install
#

function install_curve() {
  echo "Installing curve"

  rm -rf "${BYTECODE_DIR_CURVE}"
  mkdir -p "${BYTECODE_DIR_CURVE}"
  cp -r "${REPO_DIR_CURVE}/build/contracts"/* "${BYTECODE_DIR_CURVE}"
}
