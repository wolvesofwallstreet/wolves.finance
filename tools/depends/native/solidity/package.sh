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
# Solidity, the Smart Contract Programming Language
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Note: When bumping the version, update the version in slither.config.json
#
# Parameters:
#
#   * INSTALL_DIR - Place to install binaries
#
# Dependencies:
#
#   * curl
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Dependency name and version
#

SOLIDITY_PACKAGE_NAME="solidity"
SOLIDITY_VERSION="0.7.6" # Update slither.config.json
SOLIDITY_URL="https://github.com/ethereum/${SOLIDITY_PACKAGE_NAME}/releases/download/v${SOLIDITY_VERSION}/solc-static-linux"

#
# Environment paths
#

# Install directory
INSTALL_DIR_SOLIDITY="${INSTALL_DIR}/${SOLIDITY_PACKAGE_NAME}"

# Name of solc binary
SOLC_BIN="solc-${SOLIDITY_VERSION}"

# Final path of solc binary
SOLC_PATH="${INSTALL_DIR_SOLIDITY}/${SOLC_BIN}"

# Ensure directories exist
mkdir -p "${INSTALL_DIR_SOLIDITY}"

#
# Download
#

function download_solidity() {
  if [ -f "${SOLC_PATH}" ]; then
    echo "Using existing ${SOLC_BIN}"
    return
  fi

  # Download binary
  curl --location --output "${SOLC_PATH}" "${SOLIDITY_URL}"

  # Set permissions
  chmod +x "${SOLC_PATH}"
}
