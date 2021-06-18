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

CURVE_DAO_REPO_NAME="curve-dao-contracts"
CURVE_DAO_VERSION="5e224ac6e687aafedf5d51b89b5bd6d5ccfab171"
CURVE_DAO_REMOTE_REPO="https://github.com/curvefi/${CURVE_DAO_REPO_NAME}.git"

#
# Environment paths
#

# Pacakge definition directory
DEPENDS_DIR_CURVE_DAO="${DEPENDS_DIR}/chain/${CURVE_DAO_REPO_NAME}"

# Checkout directory
REPO_DIR_CURVE_DAO="${REPO_DIR}/${CURVE_DAO_REPO_NAME}"

# Install directory
BYTECODE_DIR_CURVE_DAO="${BYTECODE_DIR}/${CURVE_DAO_REPO_NAME}"

#
# Checkout
#

function checkout_curve_dao() {
  echo "Checking out curve DAO"

  if [ ! -d "${REPO_DIR_CURVE_DAO}" ]; then
    git clone "${CURVE_DAO_REMOTE_REPO}" "${REPO_DIR_CURVE_DAO}"
  fi

  (
    cd "${REPO_DIR_CURVE_DAO}"
    git fetch --all
    git reset --hard "${CURVE_DAO_VERSION}"
  )
}

#
# Build
#

function build_curve_dao() {
  echo "Patching curve DAO"

  patch -p1 --directory="${REPO_DIR_CURVE_DAO}" < \
    "${DEPENDS_DIR_CURVE_DAO}/0001-Pass-admin-and-initial-holder-via-construction-param.patch"
  patch -p1 --directory="${REPO_DIR_CURVE_DAO}" < \
    "${DEPENDS_DIR_CURVE_DAO}/0002-Pass-admin-and-controller-via-construction-params.patch"
  patch -p1 --directory="${REPO_DIR_CURVE_DAO}" < \
    "${DEPENDS_DIR_CURVE_DAO}/0003-Pass-admin-via-construction-param.patch"

  # Remove test contracts to save space and compile time
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/testing"

  # Remove unused contracts to save space and compile time
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/burners"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/gauges"/[^L]*
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/gauges"/LiquidityGauge[^.]*
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/streamers"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/vests"

  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/CryptoPoolProxy.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/FeeDistributor.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/GaugeProxy.vy"
  rm -rf "${REPO_DIR_CURVE_DAO}/contracts/PoolProxy.vy"

  echo "Building curve DAO"

  cd "${REPO_DIR_CURVE_DAO}"
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

function install_curve_dao() {
  echo "Installing curve DAO"

  rm -rf "${BYTECODE_DIR_CURVE_DAO}"
  mkdir -p "${BYTECODE_DIR_CURVE_DAO}"
  cp -r "${REPO_DIR_CURVE_DAO}/build/contracts"/* "${BYTECODE_DIR_CURVE_DAO}"
}
